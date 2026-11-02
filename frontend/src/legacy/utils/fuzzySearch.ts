/* ─── Typo-tolerant place search ───
   Handles, among others:
   • typos & swapped letters      "chruch street"   → Church Street
   • missing / extra spaces       "ChruchStreet", "lal bagh", "nandihills"
   • punctuation & abbreviations  "MG Rd", "M.G. Road", "St. Mark's", "church st"
   • local & alternate names      "bangalore", "ulsoor kere", "savandurga betta"
   • plurals & word order         "lakes", "street church"
   • filler words                 "best lakes near bangalore"
   • other scripts & accents      Kannada / Hindi names, "café"
   Every meaningful word must match (exactly, as a prefix, or within a small
   typo budget). If nothing matches that strictly, the closest partial
   matches are returned instead. Results are ranked, name matches first. */

/* ── Normalisation ── */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')          // strip Latin accents (café → cafe)
    .replace(/(\p{L})[.'’](?=\p{L})/gu, '$1') // join M.G. → mg, mark's → marks
    .replace(/[.'’]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')   // other punctuation / emoji → space
    .replace(/\s+/g, ' ')
    .trim();

const words = (s: string) => (s ? s.split(' ') : []);

/* ── Vocabulary ── */

// Each group is interchangeable. Includes common abbreviations and Kannada/Hindi words.
const SYNONYM_GROUPS = [
  ['street', 'st', 'str'],
  ['road', 'rd'],
  ['main', 'mn'],
  ['cross', 'crs'],
  ['layout', 'lyt'],
  ['nagar', 'ngr'],
  ['bengaluru', 'bangalore', 'banglore', 'bengalore', 'bengluru', 'blr', 'bangaluru'],
  ['mysuru', 'mysore'],
  ['lake', 'kere', 'talab', 'lk'],
  ['hill', 'hills', 'betta', 'mount', 'mt'],
  ['temple', 'gudi', 'mandir', 'devasthana'],
  ['mosque', 'masjid'],
  ['waterfall', 'waterfalls', 'falls', 'fall', 'jalapatha'],
  ['trek', 'trekking', 'hike', 'hiking', 'trail'],
  ['cafe', 'cafes', 'coffee', 'caffe'],
  ['restaurant', 'restaurants', 'food', 'eatery'],
  ['museum', 'museums', 'gallery'],
  ['park', 'garden', 'gardens', 'udyana'],
  ['fort', 'kote'],
  ['palace', 'aramane'],
  ['market', 'pete', 'bazaar', 'bazar', 'mandi'],
  ['shopping', 'shop', 'shops'],
  ['viewpoint', 'view', 'sunrise', 'sunset'],
];

const SYNONYMS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) for (const w of group) SYNONYMS.set(w, group);

// Words people type that describe the search rather than the place
const FILLER = new Set([
  'a', 'an', 'the', 'of', 'in', 'at', 'on', 'to', 'for', 'and', 'or', 'with', 'from', 'by',
  'near', 'nearby', 'around', 'close', 'best', 'top', 'good', 'famous', 'popular', 'nice', 'cool',
  'place', 'places', 'spot', 'spots', 'visit', 'visiting', 'go', 'things', 'thing', 'do', 'me', 'my',
  'some', 'any', 'weekend', 'trip', 'trips', 'day', 'city', 'area',
]);

/** A typed word plus its alternates: synonyms and singular forms. */
const variants = (token: string) => {
  const set = new Set([token, ...(SYNONYMS.get(token) || [])]);
  if (token.length > 3 && token.endsWith('es')) set.add(token.slice(0, -2));
  if (token.length > 3 && token.endsWith('s')) set.add(token.slice(0, -1));
  return [...set];
};

/* ── Distance ── */

/** Optimal string alignment distance: insert, delete, substitute, swap neighbours ("chruch" → "church" = 1). */
const editDistance = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
};

// Short words must be exact; longer ones get more slack
const typoBudget = (len: number) => (len <= 3 ? 0 : len <= 6 ? 1 : len <= 12 ? 2 : 3);

/** Every word in a field plus its synonyms, for matching space-less queries. */
const vocabulary = (fieldWords: string[]) => {
  const set = new Set<string>();
  for (const w of fieldWords) {
    if (w.length < 2 || FILLER.has(w)) continue;
    set.add(w);
    for (const syn of SYNONYMS.get(w) || []) set.add(syn);
  }
  return [...set];
};

/** Edit cost of splitting a space-less query into pieces that each match a vocabulary word
    ("lalbaghgarden" → lalbagh≈lalbhag + garden). Infinity if it can't be split. */
const segmentCost = (q: string, vocab: string[]) => {
  const n = q.length;
  const best: number[] = Array(n + 1).fill(Infinity);
  best[0] = 0;
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue;
    const rest = q.slice(i);
    for (const w of vocab) {
      if (w[0] !== q[i]) continue; // first letter of each piece must be right
      const budget = typoBudget(w.length);
      for (let len = Math.max(2, w.length - budget); len <= w.length + budget && i + len <= n; len++) {
        const d = editDistance(q.slice(i, i + len), w, budget);
        if (d <= budget) best[i + len] = Math.min(best[i + len], best[i] + d);
      }
      // The last piece may be a word still being typed ("churchstr")
      if (rest.length >= 2 && rest.length < w.length && w.startsWith(rest)) {
        best[n] = Math.min(best[n], best[i]);
      }
    }
  }
  return best[n];
};

/* ── Scoring ── */

interface Field {
  weight: number;
  allowTypos: boolean;
  text: string;
  words: string[];
  compact: string;
  vocab: string[];
}

/** 0 = no match, 1 = exact word, 0.9 = prefix, ~0.5–0.7 = typo, 0.6 = inside a word. */
const tokenScore = (token: string, field: Field) => {
  let best = 0;
  for (const v of variants(token)) {
    const budget = field.allowTypos ? typoBudget(v.length) : 0;
    for (const w of field.words) {
      if (w === v) return v === token ? 1 : 0.95;
      if (v.length >= 2 && w.startsWith(v)) best = Math.max(best, 0.9);
      // Short words only forgive typos after a correct first letter ("mall" ≠ "hall")
      else if (budget > 0 && (v.length > 5 || v[0] === w[0])) {
        // Whole word, or its prefix while still typing ("lalbag" → "lalbagh…")
        const dist = Math.min(
          editDistance(v, w, budget),
          w.length > v.length ? editDistance(v, w.slice(0, v.length), budget) : budget + 1
        );
        if (dist <= budget) best = Math.max(best, 0.7 - dist * 0.1);
      }
    }
    // Inside a longer word, or across a missing space in the data ("koramangala" ← "mangala")
    if (!best && v.length >= 3 && field.compact.includes(v)) best = 0.6;
  }
  return best;
};

export interface SearchableFields {
  name: string;
  category?: string;
  state?: string;
  description?: string;
  is_hidden_gem?: boolean;
}

// Typos are only forgiven in short fields; in long descriptions they'd cause false hits ("cafe" ≈ "safe")
const FIELD_WEIGHTS: [keyof SearchableFields, number, boolean][] = [
  ['name', 3, true],
  ['category', 2, true],
  ['state', 2, true],
  ['description', 1, false],
];

const makeField = (raw: string, weight: number, allowTypos: boolean): Field => {
  const text = normalize(raw);
  const fieldWords = words(text);
  return {
    weight,
    allowTypos,
    text,
    words: fieldWords,
    compact: text.replace(/ /g, ''),
    vocab: allowTypos ? vocabulary(fieldWords) : [],
  };
};

const buildFields = (item: SearchableFields): Field[] => [
  ...FIELD_WEIGHTS.map(([key, weight, allowTypos]) => makeField(String(item[key] || ''), weight, allowTypos)),
  // Lets "hidden gem" find places flagged as hidden gems
  makeField(item.is_hidden_gem ? 'hidden gem gems' : '', 2, true),
];

interface Parsed {
  tokens: string[];
  required: string[];
  compact: string;
  phrase: string;
}

const parseQuery = (query: string): Parsed => {
  const phrase = normalize(query);
  const tokens = words(phrase);
  const meaningful = tokens.filter((t) => !FILLER.has(t));
  // Only filler ("places to visit") → nothing to search for
  if (meaningful.length === 0) return { tokens: [], required: [], compact: '', phrase: '' };
  return { tokens, required: meaningful, compact: meaningful.join(''), phrase };
};

interface Scored {
  score: number;
  matched: number; // how many required words matched
}

const scoreItem = (q: Parsed, fields: Field[]): Scored => {
  let total = 0;
  let matched = 0;

  for (const token of q.tokens) {
    let best = 0;
    for (const f of fields) best = Math.max(best, tokenScore(token, f) * f.weight);
    const isRequired = q.required.includes(token);
    if (best > 0) {
      total += isRequired ? best : best * 0.25;
      if (isRequired) matched++;
    }
  }

  // Space-insensitive match: "chruchstreet", "lal bagh", "lalbaghgarden", "nandihills"
  if (q.compact.length >= 4 && matched < q.required.length) {
    const allowed = typoBudget(q.compact.length);
    const shortFields = fields.filter((f) => f.allowTypos && f.vocab.length > 0);
    const candidates = [
      ...shortFields.map((f) => ({ weight: f.weight, vocab: f.vocab })),
      // Pieces may also come from different fields ("nandichikkaballapur")
      { weight: 1.5, vocab: [...new Set(shortFields.flatMap((f) => f.vocab))] },
    ];
    for (const c of candidates) {
      const cost = segmentCost(q.compact, c.vocab);
      if (cost <= allowed) {
        total = Math.max(total, c.weight * (1 - cost * 0.12) * q.required.length);
        matched = q.required.length;
        break;
      }
    }
  }

  // Bonuses: the phrase as typed appears in the name, or the name starts with it
  const name = fields[0];
  if (q.phrase && name.text.includes(q.phrase)) total += 3;
  if (q.phrase && name.text.startsWith(q.phrase)) total += 1;

  return { score: total, matched };
};

/** Relevance score for a query against a place; 0 means it doesn't match every meaningful word. */
export const fuzzyScore = (query: string, item: SearchableFields) => {
  const q = parseQuery(query);
  if (q.tokens.length === 0) return 1;
  const { score, matched } = scoreItem(q, buildFields(item));
  return matched === q.required.length ? score : 0;
};

export interface SearchResult<T> {
  items: T[];
  /** True when nothing matched every word and these are the closest partial matches. */
  isApproximate: boolean;
}

/** Filters and ranks items by relevance (best first), falling back to partial matches when needed. */
export const fuzzySearch = <T extends SearchableFields>(items: T[], query: string): SearchResult<T> => {
  const q = parseQuery(query);
  // Nothing searchable (only symbols/whitespace): don't filter
  if (q.tokens.length === 0) return { items, isApproximate: false };

  const scored = items.map((item) => ({ item, ...scoreItem(q, buildFields(item)) }));
  const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;

  const exact = scored.filter((r) => r.matched === q.required.length && r.score > 0).sort(byScore);
  if (exact.length > 0) return { items: exact.map((r) => r.item), isApproximate: false };

  // Fallback: places matching at least half of the meaningful words
  const needed = Math.max(1, Math.ceil(q.required.length / 2));
  const partial = scored
    .filter((r) => q.required.length > 1 && r.matched >= needed)
    .sort((a, b) => b.matched - a.matched || byScore(a, b))
    .slice(0, 8);
  return { items: partial.map((r) => r.item), isApproximate: partial.length > 0 };
};
