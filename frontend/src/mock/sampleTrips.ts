import type { Group, Place } from '../types';

/* Sample trips that keep the boards from looking empty while the site is new. Each one heads to a real
   place from the database; opening one explains it's a sample and points to hosting a real trip. */

const HOUR = 3_600_000;
const HOSTS = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Ananya', 'Ishaan', 'Sana'];
const MEETING_POINTS = ['Indiranagar Metro', 'Majestic Bus Stand', 'Hebbal Flyover', 'MG Road Metro', 'Koramangala Sony Signal', 'Jayanagar 4th Block'];
// [taken, total] seats: lively but never full, so every sample looks joinable
const SEATS: [number, number][] = [[3, 6], [5, 8], [2, 5], [4, 6], [6, 8], [3, 5]];
// Days from today, spread over the next week and a bit
const DAYS_AHEAD = [1, 2, 3, 5, 6, 8];

const NATURE = /nature|adventure/i;
const HERITAGE = /monument|museum|religious/i;
const FOOD = /cafe|food|restaurant/i;

const titleFor = (p: Place) => {
  if (NATURE.test(p.category)) return `Sunrise at ${p.name}`;
  if (HERITAGE.test(p.category)) return `${p.name} heritage walk`;
  if (FOOD.test(p.category)) return `Café hop: ${p.name}`;
  return `${p.name} evening out`;
};

// Nature trips leave before dawn, heritage mid-morning, the rest in the evening
const hourFor = (p: Place) => (NATURE.test(p.category) ? 5 : HERITAGE.test(p.category) ? 10 : 17);

const shuffled = <T,>(items: T[]) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const SAMPLE_PREFIX = 'sample-';

export const isSampleId = (id: string | number) => String(id).startsWith(SAMPLE_PREFIX);

/** `count` sample trips to random places (with a photo) from `places`, dated from today. */
export const sampleTrips = (places: Place[], count: number): Group[] => {
  const now = new Date();
  return shuffled(places.filter((p) => p.image_url))
    .slice(0, Math.min(count, DAYS_AHEAD.length))
    .map((p, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DAYS_AHEAD[i], hourFor(p));
      const [taken, total] = SEATS[i];
      return {
        id: `${SAMPLE_PREFIX}${p.id}`,
        title: titleFor(p),
        description: `A relaxed group trip to ${p.name}.`,
        destination_id: p.id,
        trip_date: date.toISOString(),
        meeting_area: MEETING_POINTS[i % MEETING_POINTS.length],
        estimated_cost: Number(p.budget_tier) || 500,
        max_members: total,
        current_members: taken,
        organizer_name: HOSTS[i % HOSTS.length],
        organizer_email: '',
        status: 'open' as const,
        safety_notes: '',
        created_at: new Date(now.getTime() - (i + 1) * 9 * HOUR).toISOString(),
      };
    });
};
