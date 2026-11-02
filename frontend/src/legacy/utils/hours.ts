/** Stored in both opening_hours and closing_hours for places that never close. */
export const OPEN_24_7 = '24/7';

/** Stored in both fields when the timings are irregular and written in the description instead. */
export const HOURS_IN_DESCRIPTION = 'See description';

/** True for the 24/7 marker, and for older free-text values like "Open 24 hours". */
export const isOpen247 = (open?: string | null, close?: string | null) =>
  [open, close].some((v) => !!v && /24\s*\/\s*7|24\s*h(ou)?rs?|open 24/i.test(v));

/** True when the timings live in the description ("See description" / "Check description"). */
export const isHoursInDescription = (open?: string | null, close?: string | null) =>
  [open, close].some((v) => !!v && /(see|check)\s+(the\s+)?description/i.test(v));

export type HoursMode = 'times' | '247' | 'description';

export const hoursMode = (open?: string | null, close?: string | null): HoursMode =>
  isOpen247(open, close) ? '247' : isHoursInDescription(open, close) ? 'description' : 'times';

/** The value saved in both opening_hours and closing_hours for a special mode. */
export const hoursMarker = (mode: Exclude<HoursMode, 'times'>) => (mode === '247' ? OPEN_24_7 : HOURS_IN_DESCRIPTION);

/** "14:30" → "2:30 PM"; anything without a colon is returned as typed. */
export const formatTime = (timeStr?: string | null) => {
  if (!timeStr) return '';
  if (!timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

/** "10:00 AM – 6:00 PM", "Open 24/7", "Check description" or "Hours not listed". */
export const formatVisitingHours = (open?: string | null, close?: string | null) => {
  if (!open && !close) return 'Hours not listed';
  if (isOpen247(open, close)) return 'Open 24/7';
  if (isHoursInDescription(open, close)) return 'Check description';
  if (open && close) {
    return `${formatTime(open)} – ${formatTime(close)}`;
  }
  if (open) {
    if (open.toLowerCase().includes('to') || open.includes('-') || open.toLowerCase().includes('24')) {
      return open;
    }
    return `Opens at ${formatTime(open)}`;
  }
  return `Closes at ${formatTime(close)}`;
};
