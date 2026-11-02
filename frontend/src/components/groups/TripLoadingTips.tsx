import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const TIPS = [
  'Say hi in the group chat before the trip. The first hour on the road feels easy when names are already known.',
  'Ask one real question, like "What was your best trip so far?" People remember being asked.',
  'Swap handles at the first stop, not the last. Everyone is still fresh and chatty.',
  'On the way back, sit next to someone new. Strangers on day one are friends by day two.',
  'Share a snack. It works in every language.',
  'Listen more than you talk. Good connections start with curiosity.',
  'Send the photos the same evening and tag people. A quick follow-up keeps the trip going.',
  'Be on time. Respecting the group is the first impression you make.',
];

/** A figure sitting cross-legged, hands on knees; the whole thing breathes. */
const Meditator = ({ breathing }: { breathing: boolean }) => (
  <motion.svg
    viewBox="0 0 64 64"
    className="w-24 h-24 text-accent-text"
    fill="currentColor"
    aria-hidden
    animate={breathing ? { scale: [1, 1.06, 1] } : undefined}
    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
  >
    <circle cx="32" cy="12" r="6.5" />
    {/* Torso */}
    <path d="M25 22c0-1.700 1.300-3 3-3h8c1.700 0 3 1.300 3 3l-1.500 21h-11z" />
    {/* Arms, resting on the knees */}
    <path d="M27 21c-4 3-7 8-9 14l-3 8" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M37 21c4 3 7 8 9 14l3 8" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    {/* Crossed legs */}
    <path d="M8 51c0-5 8-7.500 14-6.500 4 .7 7.500 2.300 10 3.800 2.500-1.500 6-3.100 10-3.800 6-1 14 1.500 14 6.500 0 3-4 4.500-8 4.500H16c-4 0-8-1.500-8-4.500z" />
  </motion.svg>
);

/* Shown while a trip loads: something calm to look at and a useful tip to read. */
export const TripLoadingTips = () => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="rounded-[28px] bg-paper border border-line card-shadow px-6 py-12 sm:py-16 flex flex-col items-center text-center"
      role="status"
      aria-live="polite"
    >
      <Meditator breathing={!reduced} />
      <p className="section-label mt-6">Getting your trip ready</p>
      <p className="mt-1 text-sm text-muted">Take a breath while we load the details.</p>

      <div className="mt-8 max-w-xl min-h-[6.5rem] flex flex-col items-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Travel networking tip</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mt-3 font-display text-xl sm:text-2xl leading-snug text-ink"
          >
            {TIPS[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* The trip page's loading screen. It waits a moment before covering the page, so the card's photo can
   finish growing into the hero first and quick loads never flash it. */
export const TripLoadingScreen = ({ delay = 600 }: { delay?: number }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-40 bg-night overflow-y-auto flex items-center justify-center px-page pt-28 pb-12" data-lenis-prevent>
      <div className="w-full max-w-2xl">
        <TripLoadingTips />
      </div>
    </div>
  );
};
