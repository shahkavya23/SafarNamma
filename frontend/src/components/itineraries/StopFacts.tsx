import type { ComponentType } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Clock, Hourglass, IndianRupee } from 'lucide-react';
import type { Place } from '../../types';
import { formatBudget } from '../../utils/format';
import { formatVisitingHours, isOpen247 } from '../../utils/hours';
import { durationNote, hoursStatus, seasonStatus, type FactStatus } from '../../utils/visitInfo';

const TONE_DOT: Record<FactStatus['tone'], string> = {
  open: 'bg-[#12B76A]',
  soon: 'bg-[#F79009]',
  closed: 'bg-[#F04438]',
};

const TONE_TEXT: Record<FactStatus['tone'], string> = {
  open: 'text-[#067647]',
  soon: 'text-[#B54708]',
  closed: 'text-[#B42318]',
};

interface Cell {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note?: string | null;
  status?: FactStatus | null;
}

/** Hours, time needed, price and best time for one itinerary stop. */
export const StopFacts = ({ place }: { place: Place }) => {
  const reduced = useReducedMotion();
  const { opening_hours: open, closing_hours: close } = place;

  const cells: Cell[] = [];
  if (open || close) {
    cells.push({
      icon: Clock,
      label: 'Hours',
      value: formatVisitingHours(open, close),
      status: isOpen247(open, close) ? { label: 'Open now', tone: 'open' } : hoursStatus(open, close),
    });
  }
  if (place.duration) {
    cells.push({ icon: Hourglass, label: 'Time needed', value: place.duration, note: durationNote(place.duration) });
  }
  if (place.budget_tier != null && place.budget_tier !== '') {
    cells.push({ icon: IndianRupee, label: 'Entry / price', value: formatBudget(place.budget_tier) });
  }
  if (place.best_season) {
    cells.push({ icon: CalendarDays, label: 'Best time', value: place.best_season, status: seasonStatus(place.best_season) });
  }

  if (!cells.length) return null;

  const tile = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.dl
      className="mb-3 grid grid-cols-2 gap-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: reduced ? 0 : 0.07 }}
    >
      {cells.map(({ icon: Icon, label, value, note, status }) => (
        <motion.div
          key={label}
          variants={tile}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduced ? undefined : { y: -2 }}
          className="group/fact relative overflow-hidden bg-stone/60 border border-line rounded-2xl px-3 py-2.5 min-w-0 transition-colors hover:bg-paper hover:border-accent/40 hover:shadow-sm"
        >
          {/* accent bar that grows on hover */}
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-accent scale-y-0 group-hover/fact:scale-y-100 transition-transform duration-300 origin-center" />
          <dt className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
            <span className="w-5 h-5 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/fact:rotate-[-8deg] group-hover/fact:scale-110">
              <Icon className="w-3 h-3 text-accent" />
            </span>
            {label}
          </dt>
          <dd className="text-[13px] font-semibold text-ink mt-1.5 leading-snug break-words">{value}</dd>
          {status ? (
            <p className={`flex items-start gap-1.5 text-[11px] mt-1 leading-snug font-medium ${TONE_TEXT[status.tone]}`}>
              <span className="relative flex w-1.5 h-1.5 mt-[5px] shrink-0">
                {status.tone === 'open' && !reduced && (
                  <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${TONE_DOT[status.tone]}`} />
                )}
                <span className={`relative w-1.5 h-1.5 rounded-full ${TONE_DOT[status.tone]}`} />
              </span>
              {status.label}
            </p>
          ) : note ? (
            <p className="text-[11px] text-muted mt-1 leading-snug">{note}</p>
          ) : null}
        </motion.div>
      ))}
    </motion.dl>
  );
};
