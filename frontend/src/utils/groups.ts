import type { Group, Place } from '../types';

export const groupDestination = (group: Group, place?: Place) => group.custom_destination || place?.name || 'Local destination';

/** The listed place a trip heads to, looked up by id (older rows use place_id). */
export const findGroupPlace = (group: Group, places: Place[]) => {
  const destId = group.destination_id || Number(group.place_id);
  return destId ? places.find((p) => p.id === destId) : undefined;
};

export const seatsLeft = (group: Group) => Math.max(0, group.max_members - group.current_members);

const start = (group: Group) => new Date(group.trip_date).getTime();

/** A trip that has departed: no more joining, shown as "just wrapped". */
export const isPastTrip = (group: Group) => start(group) <= Date.now();

/** Departed trips stay listed this long (a 6 PM trip stays until 6 PM the next day). Same as the backend. */
export const TRIP_LISTED_HOURS = 24;

/** When a departed trip drops off the list, and the story maker closes. */
export const tripHiddenAt = (group: Group) => new Date(start(group) + TRIP_LISTED_HOURS * 3_600_000);

/** Members can make their trip story this long after the start time (a 6 PM trip opens at 7:30 PM). */
export const STORY_UNLOCK_AFTER_MIN = 90;

export const storyUnlockTime = (group: Group) => new Date(start(group) + STORY_UNLOCK_AFTER_MIN * 60_000);

/** The story maker is open from 90 minutes after the start until the trip leaves the list, 24 hours after it. */
export const isStoryUnlocked = (group: Group) => Date.now() >= storyUnlockTime(group).getTime() && Date.now() < tripHiddenAt(group).getTime();

/** Story window is over: the 24 hours after departure have passed. */
export const isStoryClosed = (group: Group) => Date.now() >= tripHiddenAt(group).getTime();

/** "5h left", "40m left" until a wrapped trip drops off the list. */
export const timeLeftLabel = (group: Group) => {
  const ms = tripHiddenAt(group).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.round(ms / 60_000))}m left`;
};

/** "Nandi Hills ➔ Devanahalli Fort" → ["Nandi Hills", "Devanahalli Fort"] */
export const routeStops = (custom?: string | null) =>
  custom ? custom.split(/\s*(?:➔|->|→)\s*/).map((s) => s.trim()).filter(Boolean) : [];
