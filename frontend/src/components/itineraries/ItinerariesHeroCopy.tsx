import { useEffect, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from 'motion/react';
import type { Itinerary } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';

/* ─── Itineraries hero copy ───
   Few words, big: the heading, the road and the tagline need nothing from the server, so
   they arrive straight away. The counts and route chips join them the moment the routes
   have loaded, into space kept for them so the heading doesn't jump. Tapping a chip jumps
   to that route in the deck. */

const EASE = [0.22, 1, 0.36, 1] as const;
const SYNC_SECONDS = 1.4;
// The road starts drawing as the heading settles
const ROAD_DELAY = 0.35;
const MAX_CHIPS = 5;
const ROAD_PATH = 'M2 10 C 60 2, 110 16, 160 8 S 260 4, 298 10';

interface ItinerariesHeroCopyProps {
  itineraries: Itinerary[];
  ready: boolean;
  activeId?: number;
  onSelect: (id: number) => void;
  /** The "+N more" chip: jump to the deck, where every route is listed */
  onSeeAll?: () => void;
  /** Admin button, shown with the chips */
  action?: ReactNode;
  /** A line under the tagline, e.g. how locked routes open up */
  note?: string;
}

const CountUp = ({ value, ready, reduced }: { value: number; ready: boolean; reduced: boolean }) => {
  const count = useMotionValue(0);
  const shown = useTransform(count, (c) => Math.round(c));

  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: SYNC_SECONDS, ease: EASE });
    return () => controls.stop();
  }, [value, ready, reduced, count]);

  return <motion.span>{shown}</motion.span>;
};

export const ItinerariesHeroCopy = ({ itineraries, ready, activeId, onSelect, onSeeAll, action, note }: ItinerariesHeroCopyProps) => {
  const reduced = !!useReducedMotion();
  const routes = itineraries.length;
  // Locked routes come without their stops, so count from the server's number
  const stops = itineraries.reduce((sum, it) => sum + (it.stop_count ?? it.stops?.length ?? 0), 0);

  const word: Variants = {
    hidden: reduced ? { opacity: 0 } : { y: '110%' },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay: reduced ? 0 : i * 0.12, ease: EASE } }),
  };

  return (
    // The sand-coloured outline keeps the words crisp when a photo passes right behind them
    <div className="flex flex-col items-center text-center [text-shadow:0_0_2px_var(--color-sand),0_0_14px_var(--color-sand),0_0_28px_var(--color-sand)]">
      <h1 className="font-display text-ink leading-[0.98] tracking-tight text-[clamp(2.75rem,min(11vw,13dvh),6.5rem)]">
        <span className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.22em]">
          <motion.span className="inline-block" custom={0} variants={word} initial="hidden" animate="show">
            Handcrafted
          </motion.span>
        </span>
        <span className="relative inline-block">
          <span className="inline-block overflow-hidden align-bottom pb-[0.08em]">
            <motion.span className="inline-block font-italic text-accent" custom={1} variants={word} initial="hidden" animate="show">
              Itineraries
            </motion.span>
          </span>
          {/* The road under the word, with the same glowing traveller the route cards use */}
          <svg
            aria-hidden
            viewBox="0 0 300 18"
            preserveAspectRatio="none"
            className="absolute left-0 -bottom-[0.08em] w-full h-[0.16em] overflow-visible"
          >
            <motion.path
              d={ROAD_PATH}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              // Hidden until it draws: a zero-length line with round caps paints as two dots
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: reduced ? 0 : SYNC_SECONDS,
                delay: reduced ? 0 : ROAD_DELAY,
                ease: EASE,
                opacity: { duration: 0, delay: reduced ? 0 : ROAD_DELAY },
              }}
            />
            {!reduced && (
              <circle r="4" fill="var(--color-diya)" stroke="var(--color-accent)" strokeWidth="1" opacity="0">
                <set attributeName="opacity" to="1" begin={`${ROAD_DELAY + SYNC_SECONDS}s`} />
                <animateMotion dur="4s" begin={`${ROAD_DELAY + SYNC_SECONDS}s`} repeatCount="indefinite" path={ROAD_PATH} />
              </circle>
            )}
          </svg>
        </span>
      </h1>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : ROAD_DELAY, ease: EASE }}
        className="mt-[clamp(0.75rem,3dvh,1.75rem)] flex flex-col items-center gap-[clamp(0.5rem,2dvh,1rem)]"
      >
        {(routes > 0 || !ready) && (
          <motion.p
            initial={false}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
            className="min-h-4 sm:min-h-5 font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-accent-text"
          >
            {routes > 0 && (
              <>
                <CountUp value={routes} ready={ready} reduced={reduced} /> {routes === 1 ? 'route' : 'routes'}
                <span className="mx-2 text-faint">·</span>
                <CountUp value={stops} ready={ready} reduced={reduced} /> {stops === 1 ? 'stop' : 'stops'}
              </>
            )}
          </motion.p>
        )}
        <p className="text-lg sm:text-2xl font-medium text-ink [@media(max-height:480px)]:hidden">
          Pick a route. Bring your crew.
        </p>
        {note && (
          <p className="max-w-xl text-sm sm:text-base text-muted leading-snug [@media(max-height:560px)]:hidden">{note}</p>
        )}

        {/* Phones: one row that swipes sideways, edge to edge, so the hero never grows past the screen.
            The padding leaves room for the chips' shadows inside the scroller. */}
        <div className="self-stretch -mx-5 sm:mx-0 overflow-x-auto no-scrollbar sm:overflow-visible">
        <div className={`flex flex-nowrap sm:flex-wrap items-center sm:justify-center gap-2 sm:gap-2.5 w-max sm:w-auto mx-auto px-5 sm:px-0 pt-1 pb-4 sm:py-0 ${ready ? '' : 'min-h-11'}`}>
          {itineraries.slice(0, MAX_CHIPS).map((it, i) => {
            const isActive = it.id === activeId;
            return (
              <motion.button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                animate={ready ? { opacity: 1, scale: 1 } : undefined}
                transition={{ delay: reduced ? 0 : 0.25 + i * 0.1, type: 'spring', stiffness: 320, damping: 22 }}
                whileHover={reduced ? undefined : { y: -3 }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                aria-current={isActive || undefined}
                className={`shrink-0 inline-flex items-center gap-2 h-11 pl-1.5 pr-4 rounded-full bg-paper border text-sm font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(14,31,34,0.5)] transition-colors hover:border-accent hover:text-accent-text ${
                  isActive ? 'border-accent' : 'border-line'
                }`}
              >
                <img
                  src={optimizeImageUrl(it.image_url || undefined, 96) || fallbackPhoto(it.id)}
                  alt=""
                  draggable={false}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const fallback = fallbackPhoto(it.id);
                    if (!img.src.endsWith(fallback)) img.src = fallback;
                  }}
                />
                <span className="max-w-[9rem] truncate">{it.title}</span>
              </motion.button>
            );
          })}
          {ready && onSeeAll && routes > MAX_CHIPS && (
            <button
              type="button"
              onClick={onSeeAll}
              className="shrink-0 whitespace-nowrap inline-flex items-center h-11 px-4 rounded-full bg-paper border border-line text-sm font-semibold text-accent-text shadow-[0_10px_24px_-12px_rgba(14,31,34,0.5)] transition-colors hover:border-accent"
            >
              +{routes - MAX_CHIPS} more
            </button>
          )}
        </div>
        </div>
        {/* On its own line, so it's never scrolled out of sight with the chips */}
        {ready && action}
      </motion.div>
    </div>
  );
};
