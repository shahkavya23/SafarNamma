import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Clock, MapPin, Sparkles, Users, X } from 'lucide-react';
import { PHOTOS, photoSrc } from '../../utils/images';
import { setScrollLocked } from '../../hooks/useLenis';

/* Home page: a one-time "coming soon" poster for Itineraries. It is armed once the visitor has
   read the "Don't go alone" steps, then opens after a short pause. It is a teaser, not a link,
   while itineraries are still admin-only. Bump the key to :v2 for a "now live" version. */

const SEEN_KEY = 'sn:itineraryTeaserSeen:v1';
const hasSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable: it may show again, nothing breaks */
  }
};

const EASE = [0.22, 1, 0.36, 1] as const;
const OPEN_DELAY_MS = 1200;

// Stops on the poster's route, in % of the photo box
const STOPS = [
  { x: 14, y: 80 },
  { x: 36, y: 58 },
  { x: 62, y: 68 },
  { x: 86, y: 34 },
];
const ROUTE_D = 'M14 80 C 22 70, 28 60, 36 58 S 54 72, 62 68 S 78 42, 86 34';

const PROOF = [
  { icon: Clock, text: 'A timed plan, stop by stop' },
  { icon: MapPin, text: 'A live map with every pin' },
  { icon: Users, text: 'Turn any route into a group trip' },
];

export const ItineraryTeaser = ({ armed }: { armed: boolean }) => {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed || hasSeen()) return;
    const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [armed]);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const f = setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 50);
    return () => {
      clearTimeout(f);
      setScrollLocked(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Route draws after the card lands, then pins pop in one by one
  const drawDelay = 0.35;
  const drawDur = 1.1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={close} aria-label="Close" tabIndex={-1} />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="itinerary-teaser-title"
            initial={reduced ? { opacity: 0 } : { y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative w-full sm:max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-night text-sand grain outline-none shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]"
            data-lenis-prevent
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-night/50 hover:bg-night/70 backdrop-blur-md text-sand flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ── Poster art: photo, a route that draws itself, four stops ── */}
            <div className="relative h-[250px] sm:h-[290px] overflow-hidden">
              <motion.img
                src={photoSrc('skandagiri', 800)}
                alt={PHOTOS.skandagiri.alt}
                className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
                initial={reduced ? false : { scale: 1.12 }}
                animate={{ scale: 1 }}
                transition={{ duration: 2.4, ease: EASE }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/5 to-night" aria-hidden />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />

              {/* Ticket tag */}
              <span className="absolute top-5 left-5 z-10 rounded-full border border-white/25 bg-night/45 backdrop-blur-md px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-sand/90">
                ROUTE 01 · 4 STOPS · SUNRISE
              </span>

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <path d={ROUTE_D} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="5 6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                <path
                  d={ROUTE_D}
                  fill="none"
                  stroke="url(#teaser-route)"
                  strokeWidth={3.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  clipPath="url(#teaser-reveal)"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(242,165,22,0.75))' }}
                />
                <defs>
                  {/* The route runs left to right, so a widening clip draws it without pathLength (which breaks on a stretched SVG) */}
                  <clipPath id="teaser-reveal">
                    <motion.rect
                      x={0}
                      y={0}
                      height={100}
                      initial={{ width: reduced ? 100 : 0 }}
                      animate={{ width: 100 }}
                      transition={{ delay: drawDelay, duration: drawDur, ease: EASE }}
                    />
                  </clipPath>
                  <linearGradient id="teaser-route" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E0561F" />
                    <stop offset="100%" stopColor="#F2A516" />
                  </linearGradient>
                </defs>
              </svg>

              {STOPS.map((s, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  initial={reduced ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: drawDelay + (drawDur * i) / (STOPS.length - 1) * 0.9, type: 'spring', stiffness: 500, damping: 18 }}
                >
                  {i === STOPS.length - 1 && !reduced && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-marigold"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2.4, opacity: 0 }}
                      transition={{ delay: drawDelay + drawDur, duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <span
                    className={`relative flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ring-2 ring-white/90 shadow-lg ${
                      i === STOPS.length - 1 ? 'bg-marigold text-night' : 'bg-accent text-white'
                    }`}
                  >
                    {i + 1}
                  </span>
                </motion.span>
              ))}
            </div>

            {/* ── Copy ── */}
            <motion.div
              className="on-photo relative px-7 pb-7 sm:px-8 sm:pb-8 -mt-6"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.15 } } }}
            >
              {[
                <span key="b" className="badge bg-accent text-white mb-4">
                  <Sparkles className="w-3 h-3" /> Coming soon · Itineraries
                </span>,
                <h2 key="h" id="itinerary-teaser-title" className="font-display text-sand text-[2.1rem] sm:text-[2.5rem] leading-[1.02] tracking-tight mb-3">
                  Weekend, <span className="italic font-medium text-on-night-accent">already planned.</span>
                </h2>,
                <p key="p" className="text-[#D8DEDA] text-[15px] leading-relaxed mb-6">
                  Ready-made routes around Bengaluru. Every stop timed, mapped and one tap from a crew.
                </p>,
                <ul key="l" className="space-y-3 mb-7">
                  {PROOF.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-sand/90">
                      <span className="w-8 h-8 rounded-xl bg-night-soft border border-white/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-diya" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>,
                <div key="c" className="flex flex-wrap gap-3">
                  <button type="button" onClick={close} className="btn-primary">
                    Can't wait
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      navigate('/groups');
                    }}
                    className="btn-ghost"
                  >
                    Find a trip meanwhile
                  </button>
                </div>,
              ].map((el, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                >
                  {el}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
