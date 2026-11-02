import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import type { Group, Place } from '../../types';
import { findGroupPlace, firstName, groupDestination, openSampleTrip, seatsLeft } from '../../utils/groups';

// Once per page load: a refresh shows it again, clicking back to Home doesn't
let shownThisLoad = false;
const FRESH_HOURS = 72;
const SHOW_AFTER_MS = 6000;
const HIDE_AFTER_MS = 8000;

const ago = (iso: string) => {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

/** The most recently posted trip that still has seats, if it went up in the last three days. */
const newestFreshTrip = (trips: Group[]) => {
  const cutoff = Date.now() - FRESH_HOURS * 3_600_000;
  return trips
    .filter((t) => seatsLeft(t) > 0 && new Date(t.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
};

/* Once per visit, a small note about the newest trip someone posted in the last three days.
   Nothing shows when no trip is that recent. */
export const TripActivityToast = ({ trips, places }: { trips: Group[]; places: Place[] }) => {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const newest = useMemo(() => newestFreshTrip(trips), [trips]);

  useEffect(() => {
    if (!newest || shownThisLoad) return;
    const show = window.setTimeout(() => {
      shownThisLoad = true;
      setOpen(true);
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(show);
  }, [newest]);

  useEffect(() => {
    if (!open) return;
    const hide = window.setTimeout(() => setOpen(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(hide);
  }, [open]);

  if (!newest) return null;
  const left = seatsLeft(newest);
  const host = firstName(newest.organizer_name);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          className="fixed left-4 right-4 sm:right-auto bottom-24 sm:bottom-6 z-40 sm:w-[22rem]"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <div className="relative flex items-start gap-3 bg-paper border border-line rounded-2xl card-shadow p-3.5 pr-10">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </span>
            <Link
              to={`/groups/${newest.id}`}
              className="min-w-0 group"
              onClick={(e) => {
                setOpen(false);
                // A sample trip opens the "start your own" sheet instead of a trip page
                openSampleTrip(e, newest);
              }}
            >
              <p className="text-label text-muted">New trip · {ago(newest.created_at)}</p>
              <p className="font-display text-lg text-ink leading-tight truncate group-hover:text-accent-text transition-colors">
                {groupDestination(newest, findGroupPlace(newest, places))}
              </p>
              <p className="text-xs text-body mt-0.5">
                {host && `${host} is hosting · `}
                <span className="font-semibold text-accent-text">
                  {left} {left === 1 ? 'seat' : 'seats'} open
                </span>
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full text-muted hover:bg-stone hover:text-ink flex items-center justify-center transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
