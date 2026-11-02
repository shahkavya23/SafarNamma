import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Plus, Route as RouteIcon } from 'lucide-react';
import type { Group, Place } from '../../types';
import { findGroupPlace, groupDestination, isAlmostFull, isPastTrip, openSampleTrip, seatsLeft } from '../../utils/groups';

const ROWS = 6;

/* Each letter only tilts while it flips. Waiting letters are just hidden and finished ones are flat:
   a letter parked at rotateX(-90deg) got its own GPU layer, and ~200 of them made every repaint on
   the home page slow, scrolling included. */
const letter = {
  hidden: { opacity: 0 },
  shown: (delay: number) => ({
    rotateX: [-90, 0],
    opacity: 1,
    transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* Letters drop in one by one, like the flaps on a station departure board. */
const Flap = ({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) => {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;
  return (
    // One viewport watcher per word rather than per letter
    <motion.span className={className} aria-label={text} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.6 }}>
      {Array.from(text).map((ch, i) => (
        <motion.span key={i} aria-hidden className="inline-block [transform-origin:50%_0%]" variants={letter} custom={delay + i * 0.025}>
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </motion.span>
  );
};

const upper = (s: string) => s.toUpperCase();

const Status = ({ group }: { group: Group }) => {
  const left = seatsLeft(group);
  const start = new Date(group.trip_date);
  const hoursAway = (start.getTime() - Date.now()) / 36e5;
  if (group.status === 'full' || left === 0) return <span className="text-on-night-alert">FULL</span>;
  if (hoursAway <= 24) return <span className="text-on-night-ok animate-pulse">BOARDING</span>;
  return (
    <span className={left <= 3 ? 'text-on-night-accent' : 'text-on-night-ok'}>
      {left} {left === 1 ? 'SEAT' : 'SEATS'}
    </span>
  );
};

const COLS = 'grid grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_minmax(0,0.8fr)_6.5rem_4.5rem] gap-x-4 items-center';

/* Upcoming trips as a station-style departure board: when, where, seats left, join. */
export const DepartureBoard = ({
  groups,
  places,
  loaded,
  tagFor,
}: {
  groups: Group[];
  places: Place[];
  loaded: boolean;
  /** Optional small tag beside a trip's destination (e.g. "DIWALI"). */
  tagFor?: (g: Group) => string | undefined;
}) => {
  const upcoming = groups
    .filter((g) => !isPastTrip(g))
    .sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime());
  const rows = upcoming.slice(0, ROWS);

  return (
    <div className="rounded-[28px] bg-night text-sand overflow-hidden card-shadow-hover border border-night-soft">
      {/* Board header */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-white/10 bg-night-soft">
        <p className="font-mono text-xs sm:text-sm tracking-[0.3em] text-on-night-accent flex items-center gap-2.5">
          <span className="live-dot" /> DEPARTURES
        </p>
        <p className="font-mono text-xs tracking-[0.2em] text-sand/65">
          {loaded ? `${upcoming.length} ${upcoming.length === 1 ? 'TRIP' : 'TRIPS'} SCHEDULED` : 'UPDATING…'}
        </p>
      </div>

      {/* Column labels */}
      <div className={`${COLS} px-5 sm:px-8 pt-4 pb-2 font-mono text-xs tracking-[0.2em] text-sand/60`}>
        <span>DATE</span>
        <span className="hidden sm:block">TIME</span>
        <span>DESTINATION</span>
        <span className="hidden sm:block">MEETING POINT</span>
        <span className="text-right sm:text-left">STATUS</span>
        <span className="hidden sm:block" />
      </div>

      <ul className="font-mono">
        {!loaded &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className={`${COLS} px-5 sm:px-8 py-4 border-t border-white/5 text-sand/25`}>
              <span>— — —</span>
              <span className="hidden sm:block">——:——</span>
              <span>— — — — — —</span>
              <span className="hidden sm:block">— — — —</span>
              <span>— —</span>
              <span className="hidden sm:block" />
            </li>
          ))}

        {loaded && rows.length === 0 && (
          <li className="px-5 sm:px-8 py-8 border-t border-white/5 text-center">
            <Flap text="NO DEPARTURES YET" className="text-sand/70 tracking-[0.2em]" />
            <p className="font-body text-sm text-sand/55 mt-2">Be the first to plan one.</p>
          </li>
        )}

        {rows.map((g, row) => {
          const d = new Date(g.trip_date);
          const date = upper(`${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-IN', { month: 'short' })}`);
          const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const dest = upper(groupDestination(g, findGroupPlace(g, places)));
          const delay = row * 0.12;
          const tag = tagFor?.(g);
          const almostFull = isAlmostFull(g);
          return (
            <li key={g.id} className="border-t border-white/5">
              <Link
                to={`/groups/${g.id}`}
                onClick={(e) => openSampleTrip(e, g)}
                className={`${COLS} group relative px-5 sm:px-8 py-4 hover:bg-white/[0.04] transition-colors`}
                aria-label={`${g.title}: ${dest}, ${date} ${time}${almostFull ? ', almost full' : ''}`}
              >
                {/* A lit edge marks the row under the pointer as the one you'd board */}
                <span aria-hidden className="absolute left-0 inset-y-2 w-[3px] rounded-full bg-accent scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
                <span className="text-on-night-accent text-xs sm:text-sm tracking-wider">
                  <Flap text={date} delay={delay} />
                  <span className="block sm:hidden text-sand/65 text-xs mt-0.5">{time}</span>
                </span>
                <span className="hidden sm:block text-sm text-sand/80 tabular-nums">
                  <Flap text={time} delay={delay + 0.1} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm sm:text-base tracking-wide text-sand truncate">
                    {g.custom_destination && <RouteIcon className="w-3.5 h-3.5 shrink-0 text-sand/50" />}
                    <Flap text={dest} delay={delay + 0.15} className="truncate" />
                    {tag && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-marigold/20 text-diya text-xs font-bold tracking-wider">{tag}</span>
                    )}
                    {almostFull && (
                      <span className="hidden sm:inline shrink-0 px-2 py-0.5 rounded-full bg-accent/25 text-on-night-accent text-xs font-bold tracking-wider animate-pulse-dot">
                        ALMOST FULL
                      </span>
                    )}
                  </span>
                  <span className="block font-body text-xs text-sand/65 truncate mt-0.5">{g.title}</span>
                </span>
                <span className="hidden sm:block font-body text-sm text-sand/60 truncate">{g.meeting_area}</span>
                <span className="text-right sm:text-left text-xs sm:text-sm tracking-wider">
                  <Status group={g} />
                </span>
                <span className="hidden sm:flex justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider text-sand/70 group-hover:text-on-night-accent transition-colors">
                    JOIN <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Board footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-white/10 bg-night-soft">
        <p className="font-body text-sm text-sand/60">
          {upcoming.length > ROWS ? `+ ${upcoming.length - ROWS} more on the Groups page.` : 'Going somewhere? Put it on the board.'}
        </p>
        <div className="flex gap-2">
          <Link to="/groups?host=1" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-bold hover:bg-accent-text transition-colors">
            <Plus className="w-4 h-4" /> Host a trip
          </Link>
          <Link to="/groups" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-white/20 text-sand text-sm font-bold hover:border-sand transition-colors">
            All trips <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
