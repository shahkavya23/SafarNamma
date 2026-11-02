import { Fragment } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight, Clock, MapPin, Plus, Route as RouteIcon, Users } from 'lucide-react';
import type { Itinerary, ItineraryStop } from '../../types';

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
  isAdmin: boolean;
  onStartGroup: () => void;
  onAddStop: () => void;
  onSelectStop: (stop: ItineraryStop) => void;
}

export const ItineraryHero = ({ itinerary, stops, isAdmin, onStartGroup, onAddStop, onSelectStop }: ItineraryHeroProps) => {
  const reduced = useReducedMotion();
  const duration = readableDuration(itinerary.estimated_duration);
  const words = itinerary.title.split(/\s+/);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.15 } },
  };
  const rise: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };
  const word: Variants = {
    hidden: reduced ? { opacity: 0 } : { y: '110%' },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <div className="relative rounded-[32px] overflow-hidden bg-night text-sand border border-white/10 card-shadow isolate">
      {/* Cover photo: slow settle-in zoom, faded into the night on the left so the copy stays readable */}
      {itinerary.image_url && (
        <motion.div
          className="absolute inset-0 -z-10"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.4, ease: EASE }}
        >
          <img src={itinerary.image_url} alt="" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-transparent to-transparent" />
        </motion.div>
      )}

      {/* Soft moving glows */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/25 blur-3xl -z-10 motion-safe:animate-[sn-breathe_7s_ease-in-out_infinite]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-10 w-80 h-80 rounded-full bg-[#2A7C84]/30 blur-3xl -z-10 motion-safe:animate-[sn-breathe_9s_ease-in-out_infinite_1s]" />

      <motion.div
        className="relative p-7 sm:p-12 max-w-3xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={rise} className="flex flex-wrap items-center gap-2.5 mb-5">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-accent text-white flex items-center gap-1.5 shadow-[0_6px_20px_-6px_rgba(224,90,71,0.8)]">
            <RouteIcon className="w-3.5 h-3.5" /> Curated Blueprint
          </span>
          {duration && (
            <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-sand backdrop-blur-md border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F4B08A]" /> {duration}
            </span>
          )}
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-sand backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F4B08A]" />
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
          </span>
        </motion.div>

        {/* Title: each word slides up out of a mask */}
        <h1 className="font-display text-4xl sm:text-6xl text-white mb-4 leading-[1.05] tracking-tight">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom pb-1 mr-[0.25em] last:mr-0">
              <motion.span variants={word} className="inline-block">
                {w}
              </motion.span>
            </span>
          ))}
        </h1>

        {itinerary.description && (
          <motion.p variants={rise} className="text-sand/80 text-base sm:text-lg leading-relaxed whitespace-pre-line mb-7 max-w-2xl">
            {itinerary.description}
          </motion.p>
        )}

        {/* Route ribbon: the stops in order, joined by a line that draws itself */}
        {stops.length > 0 && (
          <motion.div variants={rise} className="mb-8 -mx-1 overflow-x-auto no-scrollbar">
            <ol className="flex items-center gap-0 px-1 py-1 w-max">
              {stops.map((stop, i) => (
                <Fragment key={stop.id}>
                  {i > 0 && (
                    <li aria-hidden className="relative w-8 sm:w-12 h-px mx-1.5 shrink-0">
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-white/40 to-accent/80 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: reduced ? 0 : 0.9 + i * 0.15, ease: EASE }}
                      />
                      {!reduced && (
                        <motion.span
                          className="absolute -top-[2px] w-[5px] h-[5px] rounded-full bg-[#F4B08A] shadow-[0_0_8px_#F4B08A]"
                          initial={{ left: '0%', opacity: 0 }}
                          animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                          transition={{ duration: 1.6, delay: 1.6 + i * 0.4, repeat: Infinity, repeatDelay: stops.length * 0.4, ease: 'easeInOut' }}
                        />
                      )}
                    </li>
                  )}
                  <li className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectStop(stop)}
                      className="group flex items-center gap-2 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 hover:border-white/30 pl-1 pr-3 py-1 text-xs text-sand transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-white text-night text-[10px] font-bold flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                        {i + 1}
                      </span>
                      <span className="max-w-[10rem] truncate font-medium">{stop.destination?.name || `Stop ${i + 1}`}</span>
                    </button>
                  </li>
                </Fragment>
              ))}
            </ol>
          </motion.div>
        )}

        <motion.div variants={rise} className="flex flex-wrap items-center gap-3 sm:gap-4">
          <motion.button
            onClick={onStartGroup}
            whileHover={reduced ? undefined : { y: -2 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="cta-sheen group relative overflow-hidden btn-primary !bg-[#E05A47] hover:!bg-[#D04936] text-white py-3 px-6 flex items-center gap-2 font-semibold shadow-[0_12px_30px_-10px_rgba(224,90,71,0.9)]"
          >
            <Users className="w-4 h-4" /> Start Travel Group for this Route
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>

          {isAdmin && (
            <motion.button
              onClick={onAddStop}
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className="group btn-ghost !text-white !border-white/20 hover:!bg-white/10 hover:!border-white/40 py-3 px-5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-accent transition-transform duration-300 group-hover:rotate-90" /> Add Waypoint Stop
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
