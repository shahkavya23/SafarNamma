/* ─── Festival dates ───
   Every Diwali-only touch on the site checks isDiwaliSeason(), so the whole
   festive layer switches itself off once the festival is over.
   Add ?festive=1 or ?festive=0 to a URL to force it on or off while testing. */

const IST = '+05:30';

/** Lakshmi Puja, the main day of Diwali 2026. */
export const DIWALI = new Date(`2026-11-08T00:00:00${IST}`);

const SEASON_START = new Date(`2026-10-20T00:00:00${IST}`);
const SEASON_END = new Date(`2026-11-15T23:59:59${IST}`);

/** Trips leaving in this window count as Diwali getaways (Dhanteras to Bhai Dooj). */
export const DIWALI_TRIP_WINDOW = {
  start: new Date(`2026-11-06T00:00:00${IST}`),
  end: new Date(`2026-11-11T23:59:59${IST}`),
  label: '6–11 Nov',
};

const forced = (): boolean | null => {
  try {
    const v = new URLSearchParams(window.location.search).get('festive');
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
};

export const isDiwaliSeason = (now = new Date()) => forced() ?? (now >= SEASON_START && now <= SEASON_END);

export const isDiwaliTrip = (tripDate: string) => {
  const t = new Date(tripDate).getTime();
  return t >= DIWALI_TRIP_WINDOW.start.getTime() && t <= DIWALI_TRIP_WINDOW.end.getTime();
};
