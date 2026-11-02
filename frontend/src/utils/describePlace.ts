/* ─── Place description → sections ───
   Descriptions are free text written by whoever submitted the place. This sorts them into
   the parts a visitor looks for: where it is, when to go, and what to see and do, with whatever
   is left as the intro. A section with nothing in it is simply left out. */

export interface Highlight {
  /** The writer's own label ("Dining & Nightlife"), when the line had one. */
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
  /** What to see and do. */
  highlights: Highlight[];
}

const TIME_RE =
  /\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)|\b24\s?(?:\/\s?7|x\s?7|hours)\b|\b(?:timings?|visiting hours|opening hours|open daily|open every|opens at|closes at|closed on|best time|best season|ideal time|time to visit)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:to|and|till|until|through|–|-)\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
const TIME_LABEL_RE = /\b(?:time|timings?|hours|when|season|schedule|open)\b/i;

const PLACE_RE =
  /\b(?:located|situated|nestled|lies (?:in|on|along|about|near)|in the heart of|on the outskirts of|\d+(?:\.\d+)?\s?(?:km|kms|kilometres|kilometers)\s(?:from|away)|away from|address)\b/i;
const PLACE_LABEL_RE = /\b(?:location|address|where|how to reach|getting there|directions)\b/i;
// The clause that names the place, so "X is a mall located along Y" splits into intro + where
const PLACE_CLAUSE_RE = /,?\s*\b(?:located|situated|nestled)\s+(.+)$/i;

const HIGHLIGHT_RE =
  /\b(?:famous for|known for|popular for|attractions?|highlights?|must[- ]see|don'?t miss|home to|houses|offers|features|you can|activities|things to do)\b/i;

/** "Dining & Nightlife: Offers…" → a label and its text. Labels are short, so ordinary colons in a sentence don't count. */
const LABELLED_RE = /^([A-Z][\w &/'’+-]{1,40}?):\s+(.+)$/s;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const endWithStop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** Splits a paragraph into sentences without breaking on decimals ("1.2 million") or initials. */
const sentences = (para: string) =>
  para
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);

export const describePlace = (description?: string | null): PlaceSections => {
  const out: PlaceSections = { about: [], where: [], when: [], highlights: [] };
  const paragraphs = (description || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

  for (const para of paragraphs) {
    const labelled = para.match(LABELLED_RE);
    if (labelled && labelled[1].split(/\s+/).length <= 5) {
      const [, title, text] = labelled;
      if (TIME_LABEL_RE.test(title)) out.when.push(text);
      else if (PLACE_LABEL_RE.test(title)) out.where.push(text);
      else out.highlights.push({ title: title.trim(), text });
      continue;
    }

    // Unlabelled text is sorted sentence by sentence; intro sentences stay together as a paragraph
    const intro: string[] = [];
    for (const sentence of sentences(para)) {
      if (TIME_RE.test(sentence)) {
        out.when.push(sentence);
      } else if (PLACE_RE.test(sentence)) {
        const clause = sentence.match(PLACE_CLAUSE_RE);
        const before = clause ? sentence.slice(0, clause.index).trim() : '';
        // "Phoenix Mall of Asia is a mall located along Bellary Road" → intro + "Along Bellary Road"
        if (clause && before.split(/\s+/).length >= 3) {
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

  return out;
};
