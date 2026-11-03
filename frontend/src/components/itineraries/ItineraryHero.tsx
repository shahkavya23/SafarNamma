import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Lock, Users } from 'lucide-react';
import type { Itinerary, ItineraryStop } from '../../types';
import { RouteSchedule, parseSchedule } from './RouteSchedule';

/** Old rows can hold "-1" or "0" from before the backend validated it; plain numbers read as hours. */
export const readableDuration = (raw?: string | null) => {
  const value = raw?.trim();
  if (!value || value.startsWith('-')) return null;
  const n = Number(value);
  if (!isNaN(n)) return n > 0 ? `${n} ${n === 1 ? 'Hour' : 'Hours'}` : null;
  return value;
};

const EASE = [0.22, 1, 0.36, 1] as const;

interface ItineraryHeroProps {
  itinerary: Itinerary;
  stops: ItineraryStop[];
  onStartGroup: () => void;
  /** Locked routes show their teaser and offer the unlock instead */
  isLocked?: boolean;
}

export const ItineraryHero = ({ itinerary, stops, onStartGroup, isLocked = false }: ItineraryHeroProps) => {
  const reduced = useReducedMotion();
  const duration = readableDuration(itinerary.estimated_duration);
  const count = isLocked ? itinerary.stop_count : stops.length;
  const stopCount = `${count} ${count === 1 ? 'stop' : 'stops'}`;
  const words = itinerary.title.split(/\s+/);
  const schedule = parseSchedule(itinerary.description);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.05 } },
  };
  // Eyebrow, description and button: soft fade-up
  const rise: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };
  // Title words: slide up out of a mask
  const word: Variants = {
    hidden: reduced ? { opacity: 0 } : { y: '110%' },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
  };

  return (
    <motion.div
      className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10 pb-8 border-b border-line"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="flex-1 min-w-0">
        <motion.span variants={rise} className="flex items-center gap-1.5 text-xs font-semibold text-accent-text mb-2">
          {isLocked && <Lock className="w-3.5 h-3.5" />}
          {[isLocked && 'Locked route', duration, stopCount].filter(Boolean).join(' · ')}
        </motion.span>

        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight tracking-tight">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom pb-1 mr-[0.25em] last:mr-0">
              <motion.span variants={word} className="inline-block">
                {w}
              </motion.span>
            </span>
          ))}
        </h1>

        {schedule ? (
          <motion.div variants={rise} className="mt-6">
            <RouteSchedule schedule={schedule} />
          </motion.div>
        ) : (
          itinerary.description && (
            <motion.p variants={rise} className="text-ink/80 text-base leading-relaxed whitespace-pre-line mt-3 max-w-2xl">
              {itinerary.description}
            </motion.p>
          )
        )}
      </div>

      <motion.button
        variants={rise}
        onClick={onStartGroup}
        className="btn-primary text-white py-3 px-6 flex items-center justify-center gap-2 font-semibold shrink-0"
      >
        {isLocked ? (
          <>
            <Lock className="w-4 h-4" /> Create group to unlock
          </>
        ) : (
          <>
            <Users className="w-4 h-4" /> Start Travel Group
          </>
        )}
      </motion.button>
    </motion.div>
  );
};
