import { useSyncExternalStore } from 'react';
import { getTripOpening, subscribeTripOpening } from '../../utils/tripTransition';
import { TripLoadingTips } from './TripLoadingTips';

/* Covers the page between clicking a trip card and the trip page's code arriving. */
export const TripOpeningOverlay = () => {
  const opening = useSyncExternalStore(subscribeTripOpening, getTripOpening);
  if (!opening) return null;
  return (
    <div className="fixed inset-0 z-40 bg-night overflow-y-auto flex items-center justify-center px-page pt-28 pb-12" data-lenis-prevent>
      <div className="w-full max-w-2xl">
        <TripLoadingTips />
      </div>
    </div>
  );
};
