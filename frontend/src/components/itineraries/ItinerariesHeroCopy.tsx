import { useEffect, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from 'motion/react';
import type { Itinerary } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';

/* ─── Itineraries hero copy ───
   Few words, big: the heading rises in straight away, then the road, the counts and the
   route chips all arrive together the moment the routes have loaded, in time with the
   photos flying out behind them. Tapping a chip jumps to that route in the deck. */

const EASE = [0.22, 1, 0.36, 1] as const;
const SYNC_SECONDS = 1.4;
const MAX_CHIPS = 4;
const ROAD_PATH = 'M2 10 C 60 2, 110 16, 160 8 S 260 4, 298 10';

interface ItinerariesHeroCopyProps {
  itineraries: Itinerary[];
  ready: boolean;
  activeId?: number;
  onSelect: (id: number) => void;
  /** Admin button, shown with the chips */
  action?: ReactNode;
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

export const ItinerariesHeroCopy = ({ itineraries, ready, activeId, onSelect, action }: ItinerariesHeroCopyProps) => {
  const reduced = !!useReducedMotion();
  const routes = itineraries.length;
  const stops = itineraries.reduce((sum, it) => sum + (it.stops?.length || 0), 0);

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
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: ready ? 1 : reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : SYNC_SECONDS, ease: EASE }}
            />
            {ready && !reduced && (
              <circle r="4" fill="var(--color-diya)" stroke="var(--color-accent)" strokeWidth="1">
                <animateMotion dur="4s" begin="1.4s" repeatCount="indefinite" path={ROAD_PATH} />
              </circle>
            )}
          </svg>
        </span>
      </h1>

      <motion.div
        initial={false}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
        className="mt-[clamp(0.75rem,3dvh,1.75rem)] flex flex-col items-center gap-[clamp(0.5rem,2dvh,1rem)]"
      >
        {routes > 0 && (
          <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-accent-text">
            <CountUp value={routes} ready={ready} reduced={reduced} /> {routes === 1 ? 'route' : 'routes'}
            <span className="mx-2 text-faint">·</span>
            <CountUp value={stops} ready={ready} reduced={reduced} /> {stops === 1 ? 'stop' : 'stops'}
          </p>
        )}
        <p className="text-lg sm:text-2xl font-medium text-ink [@media(max-height:480px)]:hidden">
          Pick a route. Bring your crew.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
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
                className={`inline-flex items-center gap-2 h-11 pl-1.5 pr-4 rounded-full bg-paper border text-sm font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(14,31,34,0.5)] transition-colors hover:border-accent hover:text-accent-text ${
                  isActive ? 'border-accent' : 'border-line'
                }`}
              >
                <img
                  src={optimizeImageUrl(it.image_url || undefined, 96) || fallbackPhoto(it.id)}
                  alt=""
                  draggable={false}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="max-w-[9rem] truncate">{it.title}</span>
              </motion.button>
            );
          })}
          {action}
        </div>
      </motion.div>
    </div>
  );
};
