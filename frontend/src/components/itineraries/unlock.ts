import type { Itinerary } from '../../types';

// Shown wherever a route is locked, so the rule reads the same everywhere
export const UNLOCK_RULE = 'Host a group on this route to unlock it. One group = one new itinerary.';
export const FREE_RULE = '3 routes are free. Host a group on any other route to unlock it: one group, one new route.';

/** The Groups page link that opens the start-a-trip sheet with this route filled in. */
export const startGroupUrl = (itinerary: Itinerary) => {
  // A locked route has no stops, only their names
  const stopNames = itinerary.is_locked
    ? itinerary.route_preview ?? []
    : ([...(itinerary.stops ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((s) => s.destination?.name)
        .filter(Boolean) as string[]);
  const routeString = stopNames.length > 0 ? stopNames.join(' ➔ ') : itinerary.title;
  return `/groups?itineraryId=${itinerary.id}&customDestination=${encodeURIComponent(routeString)}`;
};
