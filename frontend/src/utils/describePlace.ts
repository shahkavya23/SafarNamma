/* ─── Place description → sections ───
   Descriptions are free text written by whoever submitted the place. This sorts them into
   the parts a visitor looks for: where it is, when to go, what it costs, and what to see and do,
   with whatever is left as the intro. A section with nothing in it is simply left out.
   The stored description is never changed; this only decides where each sentence is shown. */

export interface Highlight {
  /** The writer's own label ("Dining & Nightlife"), or a short one picked from the text. */
  title?: string;
  text: string;
}

export interface PlaceSections {
  /** Intro sentences, grouped back into paragraphs. */
  about: string[];
  /** Where it is: area, road, distance. */
  where: string[];
  /** When to go: timings, opening days, best season. */
  when: string[];
  /** What it costs: entry fees, tickets, prices. */
  cost: string[];
  /** What to see and do. */
  highlights: Highlight[];
}

const TIME_RE =
  /\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)|\b24\s?(?:\/\s?7|x\s?7|hours)\b|\b(?:timings?|visiting hours|opening hours|open daily|open every|opens at|closes at|closed on|best time|best season|ideal time|time to visit)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:to|and|till|until|through|–|-)\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
const TIME_LABEL_RE = /\b(?:time|timings?|hours|when|season|schedule|open)\b/i;

const COST_RE =
  /₹|\brs\.?\s?\d|\binr\b|\b(?:entry|entrance|admission)\s(?:fee|ticket|charge)s?\b|\btickets?\b|\bfree\s(?:entry|of cost|admission)\b|\bis free\b|\bper (?:person|head)\b|\bcosts?\s\d/i;
const COST_LABEL_RE = /\b(?:entry|entrance|tickets?|price|pricing|fees?|cost|charges?|admission)\b/i;

const PLACE_RE =
  /\b(?:located|situated|nestled|lies (?:in|on|along|about|near)|in the heart of|on the outskirts of|\d+(?:\.\d+)?\s?(?:km|kms|kilometres|kilometers)\s(?:from|away)|away from|address)\b/i;
const PLACE_LABEL_RE = /\b(?:location|address|where|how to reach|getting there|directions)\b/i;
// The clause that names the place, so "X is a mall located along Y" splits into intro + where
const PLACE_CLAUSE_RE = /,?\s*\b(?:located|situated|nestled)\s+(.+)$/i;

const HIGHLIGHT_RE =
  /\b(?:famous for|known for|popular for|attractions?|highlights?|must[- ]see|don'?t miss|home to|houses|offers|features|you can|activities|things to do|stands|contains)\b/i;

/** "Dining & Nightlife: Offers…" → a label and its text. Labels are short, so ordinary colons in a sentence don't count. */
const LABELLED_RE = /^([A-Z][\w &/'’+-]{1,40}?):\s+(.+)$/s;
/** "Inside Tour Timings - Sundays…": a dash works as a label too, but only for timing / price / place labels. */
const DASHED_RE = /^([A-Z][\w &/'’+-]{1,40}?)\s+[-–—]\s+(.+)$/s;

/** A short title for a highlight that came without one, from what it talks about. */
const TOPICS: [RegExp, string][] = [
  [/\b(?:shop|brand|market|luxury|store|bazaar)/i, 'Shopping'],
  [/\b(?:dining|food|cafe|eat|restaurant|nightlife|drink)/i, 'Food & drink'],
  [/\b(?:entertain|movie|cinema|theat|game|arcade|music|show)/i, 'Entertainment'],
  [/\b(?:architect|dome|pillar|carving|feet tall|storey|rooms|granite|built|tower)/i, 'Architecture'],
  [/\b(?:history|heritage|temple|fort|palace|monument|ancient|century)/i, 'History'],
  [/\b(?:trek|hill|peak|view|summit|mountain|sunrise|sunset)/i, 'Views'],
  [/\b(?:garden|nature|park|forest|wildlife|bird)/i, 'Nature'],
  [/\b(?:water|lake|beach|falls|river|boat)/i, 'Water'],
];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const endWithStop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);
const words = (s: string) => s.trim().split(/\s+/).length;

/** Splits a paragraph into sentences without breaking on decimals ("1.2 million") or initials.
    A full stop typed without a space ("India.Constructed") still ends a sentence. */
export const sentences = (para: string) =>
  para
    .replace(/([a-z]{2})\.(?=[A-Z][a-z])/g, '$1. ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(₹])/)
    .map((s) => s.trim())
    .filter(Boolean);

/** A line's own label ("Timings: 9 AM – 5 PM", "Inside Tour Timings - Sundays…"), if it has a short one. */
export const splitLabel = (line: string): { label?: string; text: string } => {
  const m = line.match(LABELLED_RE) || line.match(DASHED_RE);
  if (m && words(m[1]) <= 5) return { label: m[1].trim(), text: m[2] };
  return { text: line };
};

const titleFor = (text: string, taken: Set<string>) => {
  const topic = TOPICS.find(([re, title]) => re.test(text) && !taken.has(title))?.[1];
  if (topic) return topic;
  // Nothing fits: the first few words of the line
  const lead = text.replace(/^(?:it|this|the place|there)\s+/i, '').split(/\s+/).slice(0, 4).join(' ').replace(/[,.;:]+$/, '');
  return `${capitalise(lead)}…`;
};

export const describePlace = (description?: string | null): PlaceSections => {
  const out: PlaceSections = { about: [], where: [], when: [], cost: [], highlights: [] };
  const paragraphs = (description || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

  for (const para of paragraphs) {
    const labelled = para.match(LABELLED_RE);
    const dashed = !labelled && para.match(DASHED_RE);
    const label = labelled || (dashed && [TIME_LABEL_RE, COST_LABEL_RE, PLACE_LABEL_RE].some((re) => re.test(dashed[1])) ? dashed : null);
    if (label && words(label[1]) <= 5) {
      const [, title, text] = label;
      if (COST_LABEL_RE.test(title)) out.cost.push(para);
      else if (TIME_LABEL_RE.test(title)) out.when.push(para);
      else if (PLACE_LABEL_RE.test(title)) out.where.push(text);
      else out.highlights.push({ title: title.trim(), text });
      continue;
    }

    // Unlabelled text is sorted sentence by sentence; intro sentences stay together as a paragraph
    const intro: string[] = [];
    for (const sentence of sentences(para)) {
      if (COST_RE.test(sentence)) {
        out.cost.push(sentence);
      } else if (TIME_RE.test(sentence)) {
        out.when.push(sentence);
      } else if (PLACE_RE.test(sentence)) {
        const clause = sentence.match(PLACE_CLAUSE_RE);
        const before = clause ? sentence.slice(0, clause.index).trim() : '';
        // "Phoenix Mall of Asia is a mall located along Bellary Road" → intro + "Along Bellary Road"
        if (clause && words(before) >= 3) {
          intro.push(endWithStop(before.replace(/[,;:\s]+$/, '')));
          out.where.push(endWithStop(capitalise(clause[1].trim())));
        } else {
          out.where.push(sentence);
        }
      } else if (HIGHLIGHT_RE.test(sentence)) {
        out.highlights.push({ text: sentence });
      } else {
        intro.push(sentence);
      }
    }
    if (intro.length) out.about.push(intro.join(' '));
  }

  // Every highlight gets a title, so they can all be opened from a list
  const taken = new Set(out.highlights.map((h) => h.title).filter((t): t is string => !!t));
  for (const h of out.highlights) {
    if (h.title) continue;
    h.title = titleFor(h.text, taken);
    taken.add(h.title);
  }

  return out;
};
