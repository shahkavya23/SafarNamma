import type React from 'react';
import { flushSync } from 'react-dom';
import type { NavigateFunction } from 'react-router-dom';
import type { Group, Place } from '../types';
import { groupsApi } from '../api/client';
import { isSampleTrip, openSampleTrip } from './groups';
import { isSampleId } from '../mock/sampleTrips';

/** What a trip card hands the trip page, so its hero can draw on the first frame. */
export interface TripPreview {
  group: Group;
  place?: Place | null;
}

/** Shared element names; the trip page's hero photo carries `TRIP_PHOTO`. */
export const TRIP_PHOTO = 'trip-photo';
const TRIP_STUB = 'trip-stub';
/** Set on the trip page's hero once it has a photo frame on screen. */
export const TRIP_HERO_ATTR = 'data-trip-hero';

let pagePromise: Promise<unknown> | null = null;
let pageLoaded = false;
const loadTripPage = () => {
  pagePromise ??= import('../pages/GroupDetailsPage')
    .then(() => {
      pageLoaded = true;
    })
    .catch(() => {
      pagePromise = null;
    });
  return pagePromise;
};

/** Loads the trip page's code early (on hover/focus), so opening a trip doesn't wait on the network. */
export const prefetchTripPage = (id?: number | string) => {
  if (id !== undefined && !isSampleId(id)) groupsApi.prefetchGroup(id);
  void loadTripPage();
};

/* While the trip page's code is still downloading the router keeps the old page up, so the click looks
   dead. This flag lets a loading panel (TripOpeningOverlay) cover that gap. */
let opening = false;
const openingListeners = new Set<() => void>();
const setOpening = (value: boolean) => {
  opening = value;
  openingListeners.forEach((l) => l());
};
export const subscribeTripOpening = (listener: () => void) => {
  openingListeners.add(listener);
  return () => void openingListeners.delete(listener);
};
export const getTripOpening = () => opening;

/** Resolves once `selector` is on the page, or after `timeout` ms, whichever comes first.
    Polls with a timer: requestAnimationFrame doesn't fire during a view transition's update step,
    so a frame-based loop never finishes and the old page stays frozen until the browser gives up (4s). */
const waitFor = (selector: string, timeout = 400) =>
  new Promise<void>((resolve) => {
    const started = performance.now();
    const check = () => {
      if (document.querySelector(selector) || performance.now() - started > timeout) resolve();
      else setTimeout(check, 16);
    };
    check();
  });

const canTransition = () =>
  typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Click handler for a trip card: the stub tears away and the photo grows into the trip page hero.
   Samples still open their sheet; browsers without view transitions follow the link as usual. */
export const openTrip = (e: React.MouseEvent<HTMLElement>, group: Group, place: Place | undefined, navigate: NavigateFunction) => {
  if (isSampleTrip(group)) return openSampleTrip(e, group);
  // Let new-tab and modified clicks behave like a normal link
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const to = `/groups/${group.id}`;
  const state: TripPreview = { group, place };
  e.preventDefault();
  // currentTarget is cleared once the handler returns, and we may wait for the page's code below
  const card = e.currentTarget;

  const start = () => {
    if (!canTransition()) {
      navigate(to, { state });
      return;
    }

    // Only the clicked card carries the shared names; two elements with one name would cancel the transition
    const photo = card.querySelector<HTMLElement>('[data-trip-photo]');
    const stub = card.querySelector<HTMLElement>('[data-trip-stub]');
    if (photo) photo.style.viewTransitionName = TRIP_PHOTO;
    if (stub) stub.style.viewTransitionName = TRIP_STUB;

    const transition = document.startViewTransition(async () => {
      flushSync(() => navigate(to, { state }));
      // The trip page is lazy-loaded; hold the old frame until its hero is mounted
      await waitFor(`[${TRIP_HERO_ATTR}]`);
    });
    transition.finished.finally(() => {
      if (photo) photo.style.viewTransitionName = '';
      if (stub) stub.style.viewTransitionName = '';
    });
  };

  if (pageLoaded) return start();

  // Code not here yet: show the loading panel straight away, then open once it arrives
  groupsApi.prefetchGroup(group.id);
  setOpening(true);
  void loadTripPage().finally(() => {
    flushSync(() => setOpening(false));
    start();
  });
};
