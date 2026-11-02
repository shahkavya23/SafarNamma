import type { Group } from '../types';

const HOUR = 3_600_000;
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * HOUR).toISOString();

const base = {
  description: 'Sample trip for previewing the home page.',
  estimated_cost: 600,
  organizer_email: 'demo@sst.scaler.com',
  safety_notes: '',
  status: 'open' as const,
};

/** Fresh sample trips, dated from now, for previewing the home page in dev with `?demo=1`. Never used in production. */
export const demoTrips = (): Group[] => [
  { ...base, id: 'demo-1', title: 'Nandi Hills sunrise ride', custom_destination: 'Nandi Hills', trip_date: at(30), meeting_area: 'Hebbal Flyover', max_members: 6, current_members: 5, organizer_name: 'Aarav Mehta', created_at: at(-3) },
  { ...base, id: 'demo-2', title: 'Coorg coffee weekend', custom_destination: 'Coorg', trip_date: at(76), meeting_area: 'Mysore Road Metro', max_members: 8, current_members: 6, organizer_name: 'Diya Rao', created_at: at(-20) },
  { ...base, id: 'demo-3', title: 'Skandagiri night trek', custom_destination: 'Skandagiri', trip_date: at(52), meeting_area: 'Indiranagar Metro', max_members: 10, current_members: 4, organizer_name: 'Kabir Singh', created_at: at(-40) },
  { ...base, id: 'demo-4', title: 'Gokarna beach escape', custom_destination: 'Gokarna', trip_date: at(120), meeting_area: 'Majestic', max_members: 6, current_members: 2, organizer_name: 'Meera Nair', created_at: at(-60) },
  { ...base, id: 'demo-5', title: 'Lalbagh photo walk', destination_id: 7, trip_date: at(20), meeting_area: 'Lalbagh West Gate', max_members: 5, current_members: 3, organizer_name: 'Rohan Das', created_at: at(-90) },
];
