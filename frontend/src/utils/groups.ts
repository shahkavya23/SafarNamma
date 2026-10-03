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

/** The link a friend opens to see this trip. */
export const tripShareUrl = (group: Group) => `${window.location.origin}/groups/${group.id}`;

/** One-line invite for WhatsApp, Telegram and the share sheet. Never carries the chat link or the host's email. */
export const tripShareText = (group: Group, destination: string) => {
  const stops = routeStops(group.custom_destination);
  const when = new Date(group.trip_date).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const left = seatsLeft(group);
  const parts = [
    `Join me on "${group.title}"`,
    stops.length > 1 ? `${stops.length}-stop route: ${stops.join(' → ')}` : destination,
    when,
    group.meeting_area && `meet at ${group.meeting_area}`,
    !isPastTrip(group) && left > 0 && `${left} ${left === 1 ? 'seat' : 'seats'} left`,
  ];
  return parts.filter(Boolean).join(' · ');
};

/** Trips can only be edited up to 12 hours before departure */
export const EDIT_CUTOFF_HOURS = 12;

/** Returns true if the trip departure is at least 12 hours in the future */
export const isTripEditable = (group: Group): boolean => {
  const msUntilTrip = start(group) - Date.now();
  return msUntilTrip >= EDIT_CUTOFF_HOURS * 3_600_000;
};

/** Tells the user how much time is left before the edit window closes */
export const editWindowLabel = (group: Group): string => {
  const msUntilCutoff = (start(group) - EDIT_CUTOFF_HOURS * 3_600_000) - Date.now();
  if (msUntilCutoff <= 0) return 'Editing closed (within 12h of trip)';
  const totalMin = Math.floor(msUntilCutoff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const days = Math.floor(h / 24);
    return `Edit window closes in ${days}d ${h % 24}h`;
  }
  return h >= 1 ? `Edit window closes in ${h}h ${m}m` : `Edit window closes in ${m}m`;
};

/** Check if trip is a multi-stop itinerary */
export const isMultiRoute = (group: Group): boolean => {
  return routeStops(group.custom_destination).length > 1;
};

