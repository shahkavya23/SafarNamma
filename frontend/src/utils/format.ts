/** "₹250 / person", or "Free entry" for 0 / missing. */
export const formatBudget = (tier?: string | number | null) => {
  const n = Number(tier);
  if (tier === undefined || tier === null || tier === '' || Number.isNaN(n) || n <= 0) return 'Free entry';
  return `₹${n.toLocaleString('en-IN')} / person`;
};

const PLUS_CODE = /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/i;

/** A tidy, short place label from a free-text location ("JGQP+5FC, Haridevpur, …" → "Haridevpur"). Display only. */
export const shortLocation = (raw?: string | null, max = 30) => {
  if (!raw) return '';
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !PLUS_CODE.test(s) && !/^\d/.test(s) && !/\b(located|roughly|kilomet|km from)\b/i.test(s));
  const first = parts[0] ?? '';
  return first.length > max ? '' : first;
};

/**
 * Formats a place submitter's name cleanly in lowercase ("in small letters").
 * Gracefully parses user display names, student ID email handles (e.g. bhavya.26bcs10191 -> "bhavya"),
 * and standard email prefixes.
 */
export const formatSubmitterName = (name?: string | null, email?: string | null): string => {
  const candidate = (name && name.trim()) || (email && email.split('@')[0]) || '';
  if (!candidate) return 'community explorer';

  // If candidate is like "bhavya.26bcs10191" or "kavya.25bcs10125" (name + roll number)
  const rollMatch = candidate.match(/^([a-zA-Z]+)[._]\d{2}[a-zA-Z]{3}\d+/i);
  if (rollMatch) {
    return rollMatch[1].toLowerCase();
  }

  // Remove email domain if accidentally passed in name
  const withoutDomain = candidate.split('@')[0];

  // Replace dots, underscores, or hyphens with a clean space
  const cleaned = withoutDomain.replace(/[._-]+/g, ' ').trim();

  return cleaned.toLowerCase();
};

