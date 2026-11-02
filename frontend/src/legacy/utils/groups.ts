import type React from 'react';
import type { Group, Place } from '../types';
import { isSampleId, sampleTrips } from '../mock/sampleTrips';

export const groupDestination = (group: Group, place?: Place) => group.custom_destination || place?.name || 'Local destination';

/** The listed place a trip heads to, looked up by id (older rows use place_id). */
export const findGroupPlace = (group: Group, places: Place[]) => {
  const destId = group.destination_id || Number(group.place_id);
  return destId ? places.find((p) => p.id === destId) : undefined;
};

export const seatsLeft = (group: Group) => Math.max(0, group.max_members - group.current_members);

/** Three quarters of the seats taken, but not yet full. */
export const isAlmostFull = (group: Group) => seatsLeft(group) > 0 && group.current_members / group.max_members >= 0.75;

/** Everyone already going across these trips. */
export const travellerCount = (groups: Group[]) => groups.reduce((n, g) => n + g.current_members, 0);

/** Trips heading to a listed place. */
export const groupsForPlace = (groups: Group[], placeId: number | string) =>
  groups.filter((g) => (g.destination_id || Number(g.place_id)) === Number(placeId));

/** A placeholder trip from `withSamples`, not one anyone posted. */
export const isSampleTrip = (group: Group) => isSampleId(group.id);

/** How many trips a board should look like it has while the site is new. */
export const SAMPLE_TARGET = 6;

/** Real trips first, then sample trips to real places until there are `target` upcoming ones.
    Places that already have a real trip are skipped, so a sample never shadows one. */
export const withSamples = <T extends Group>(real: T[], places: Place[], target = SAMPLE_TARGET): (T | Group)[] => {
  const upcoming = real.filter((g) => !isPastTrip(g) && g.status !== 'cancelled' && g.status !== 'completed').length;
  const need = target - upcoming;
  if (need <= 0) return real;
  const taken = new Set(real.map((g) => g.destination_id || Number(g.place_id)));
  return [...real, ...sampleTrips(places.filter((p) => !taken.has(p.id)), need)];
};

/** Fired with the trip as detail; `SampleTripSheet` listens and explains it's a sample. */
export const SAMPLE_TRIP_EVENT = 'safarnamma:sample-trip';

/** Click handler for trip links: a sample opens the "start your own" sheet instead of navigating. */
export const openSampleTrip = (e: React.MouseEvent, group: Group) => {
  if (!isSampleTrip(group)) return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent<Group>(SAMPLE_TRIP_EVENT, { detail: group }));
};

/** "Aarav Mehta" → "Aarav" */
export const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || '';

const start = (group: Group) => new Date(group.trip_date).getTime();

/** A trip that has departed: no more joining, shown as "just wrapped". */
export const isPastTrip = (group: Group) => start(group) <= Date.now();

/** Leaving within the next 24 hours: shown in gold as "boarding". */
export const isBoardingSoon = (group: Group) => {
  const ms = start(group) - Date.now();
  return ms > 0 && ms <= 24 * 3_600_000;
};

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

/** How long until the trip starts: "4d 6h", "3h 20m", "25m". Null once it has left. */
export const timeToDeparture = (group: Group, withSeconds = false): string | null => {
  const ms = start(group) - Date.now();
  if (ms <= 0) return null;
  // In the last hour a live page can count down second by second: "24m 05s"
  if (withSeconds && ms < 3_600_000) {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, '0')}s`;
  }
  const totalMin = Math.max(1, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h >= 1 ? `${h}h ${m}m` : `${m}m`;
};

/** Check if trip is a multi-stop itinerary */
export const isMultiRoute = (group: Group): boolean => {
  return routeStops(group.custom_destination).length > 1;
};


/** Milliseconds until departure; negative once the trip has left. */
export const msToDeparture = (group: Group) => start(group) - Date.now();

/** A Google Calendar "add event" link for the trip: a 4-hour block starting at the meet-up. */
export const calendarUrl = (group: Group, destination: string) => {
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const from = start(group);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: group.title,
    dates: `${stamp(from)}/${stamp(from + 4 * 3_600_000)}`,
    location: group.meeting_area || destination,
    details: `Trip to ${destination}. Meet at ${group.meeting_area}.\n${tripShareUrl(group)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

/** A Google Maps search link for the meeting point. */
export const meetingMapUrl = (group: Group) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${group.meeting_area}, Bengaluru`)}`;
