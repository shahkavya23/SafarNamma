import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarClock, MapPin, MessageCircle, Plus, Users, X } from 'lucide-react';
import type { Group } from '../../types';
import { SAMPLE_TRIP_EVENT } from '../../utils/groups';
import { setScrollLocked } from '../../hooks/useLenis';

const EASE = [0.22, 1, 0.36, 1] as const;

// The same four things the create-a-trip flow asks for, in its order
const STEPS = [
  { icon: MapPin, title: 'Pick a place', body: 'The trip title fills itself in.' },
  { icon: CalendarClock, title: 'Set the date & meeting point', body: 'Choose a day, a time and where everyone meets.' },
  { icon: Users, title: 'Choose your group size', body: 'Small crews of 2 or more.' },
  { icon: MessageCircle, title: 'Add your group chat', body: 'A WhatsApp or Telegram link, shared only with people you approve.' },
];

/* Opens when someone taps a sample trip: owns up that it's a sample and makes hosting a real one the
   obvious next step. Mounted once; any card opens it through SAMPLE_TRIP_EVENT. */
export const SampleTripSheet = () => {
  const [trip, setTrip] = useState<Group | null>(null);

  useEffect(() => {
    const open = (e: Event) => setTrip((e as CustomEvent<Group>).detail);
    window.addEventListener(SAMPLE_TRIP_EVENT, open);
    return () => window.removeEventListener(SAMPLE_TRIP_EVENT, open);
  }, []);

  return createPortal(<AnimatePresence>{trip && <Sheet trip={trip} onClose={() => setTrip(null)} />}</AnimatePresence>, document.body);
};

const Sheet = ({ trip, onClose }: { trip: Group; onClose: () => void }) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      setScrollLocked(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button type="button" className="absolute inset-0 bg-night/60 backdrop-blur-sm cursor-default" onClick={onClose} aria-label="Close" tabIndex={-1} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-trip-title"
        initial={reduced ? false : { y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={reduced ? undefined : { y: 40, scale: 0.98 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full sm:max-w-lg max-h-[94dvh] overflow-y-auto overscroll-contain bg-paper rounded-t-[28px] sm:rounded-[28px] border border-line shadow-[0_40px_90px_-30px_rgba(14,31,34,0.7)] px-6 sm:px-8 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        data-lenis-prevent
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full hover:bg-stone text-ink flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-label text-accent-text mb-2">{trip.title}</p>
        <h2 id="sample-trip-title" className="font-display text-3xl text-ink leading-tight pr-10">
          You found a <span className="accent-word">sample trip</span> 👀
        </h2>
        <p className="text-body leading-relaxed mt-3">
          We're new, so we put up a few trips to show what's possible. The real ones are posted by SST students like you, and
          yours could be the first on the board.
        </p>

        <ol className="mt-6 space-y-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              className="flex items-start gap-3.5"
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.15 + i * 0.08 }}
            >
              <span className="relative w-10 h-10 shrink-0 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center">
                <Icon className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <Link to="/groups?host=1" onClick={onClose} className="btn-accent flex-1 !py-3.5">
            <Plus className="w-4 h-4" /> Host a trip, it's 4 steps
          </Link>
          <Link to="/groups" onClick={onClose} className="btn-ghost sm:flex-none !py-3.5">
            See real trips <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};
