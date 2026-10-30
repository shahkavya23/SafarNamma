/* Small readings of a place's stored fields, for the facts strip on the place page:
   is it open right now, is this a good month, how much of a day it takes, how pricey it is. */

export type Tone = 'open' | 'soon' | 'closed';
export interface FactStatus {
  label: string;
  tone: Tone;
}

/** "10:00", "22:30", "10:00 AM" → minutes after midnight. */
const minutesOf = (value?: string | null) => {
  const m = value?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const period = m[3]?.toLowerCase();
  if (period === 'pm' && h < 12) h += 12;
  if (period === 'am' && h === 12) h = 0;
  return h > 24 || min > 59 ? null : h * 60 + min;
};

const span = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h >= 1 ? `${h}h${m ? ` ${m}m` : ''}` : `${Math.max(1, m)}m`;
};

const clock = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** "Open now · closes in 3h", "Closing soon · 40m left", "Closed · opens 10 AM". Null when the times can't be read. */
export const hoursStatus = (open?: string | null, close?: string | null, now = new Date()): FactStatus | null => {
  const o = minutesOf(open);
  let c = minutesOf(close);
  if (o == null || c == null) return null;
  if (c <= o) c += 24 * 60; // closes after midnight
  let t = now.getHours() * 60 + now.getMinutes();
  if (t < o && t + 24 * 60 < c) t += 24 * 60; // still open from last night
  if (t >= o && t < c) {
    const left = c - t;
    return left <= 60 ? { label: `Closing soon · ${span(left)} left`, tone: 'soon' } : { label: `Open now · closes in ${span(left)}`, tone: 'open' };
  }
  return { label: `Closed · opens ${clock(o)}`, tone: 'closed' };
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SEASONS: [RegExp, number[]][] = [
  [/winter/i, [10, 11, 0, 1]],
  [/summer/i, [2, 3, 4]],
  [/monsoon|rain/i, [5, 6, 7, 8]],
  [/post[- ]?monsoon/i, [9, 10]],
];

/** Whether the stored best season includes this month. Null when the text names no months or seasons. */
export const seasonStatus = (season?: string | null, now = new Date()): FactStatus | null => {
  const text = (season || 'all year').toLowerCase();
  const month = now.getMonth();
  if (/all year|year round|any ?time|throughout/.test(text)) return { label: 'Good to go this month', tone: 'open' };

  const named = [...text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/g)].map((m) => MONTHS.indexOf(m[1]));
  let months: number[] = [];
  if (named.length >= 2) {
    // "October to March" wraps round the new year
    const [from, to] = [named[0], named[named.length - 1]];
    for (let m = from; ; m = (m + 1) % 12) {
      months.push(m);
      if (m === to || months.length > 12) break;
    }
  } else if (named.length === 1) {
    months = named;
  } else {
    months = SEASONS.filter(([re]) => re.test(text)).flatMap(([, ms]) => ms);
  }
  if (!months.length) return null;
  return months.includes(month) ? { label: 'Good time to go now', tone: 'open' } : { label: 'Not the best month', tone: 'closed' };
};

/** "2-3 Hours" → "Fits an afternoon or evening"; days → "Plan a full day". */
export const durationNote = (duration?: string | null) => {
  if (!duration) return null;
  const text = duration.toLowerCase();
  if (/day|overnight|night/.test(text)) return /\b[2-9]\s*(?:-|to)?\s*\d*\s*days?/.test(text) ? 'Plan a weekend' : 'Plan a full day';
  const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!nums.length) return null;
  const hours = /min/.test(text) ? Math.max(...nums) / 60 : Math.max(...nums);
  if (hours <= 1.5) return 'A quick stop';
  if (hours <= 3) return 'Fits an afternoon or evening';
  if (hours <= 6) return 'Plan half a day';
  return 'Plan a full day';
};

/** Price level 0–3 from the stored rupee amount: 0 free, 1 under ₹300, 2 under ₹1,000, 3 above. */
export const budgetLevel = (tier?: string | number | null) => {
  const n = Number(tier);
  if (!n || Number.isNaN(n) || n <= 0) return 0;
  return n < 300 ? 1 : n < 1000 ? 2 : 3;
};
