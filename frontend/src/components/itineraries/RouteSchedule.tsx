import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { Bus, ChevronDown, Home, Library, MapPin, TreePine, Utensils, type LucideIcon } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

export interface ScheduleStep {
  time: string | null;
  title: string;
  body: string | null;
}

export interface Schedule {
  heading: string | null;
  intro: string[];
  steps: ScheduleStep[];
}

const BULLET = /^\s*[•\-*]\s+/;

/**
 * Reads seeded descriptions shaped like
 * "Route Flow & Schedule:\n• 11:30 AM – 12:45 PM | Title: body".
 * Returns null for plain prose so the caller can show it as a paragraph.
 */
export const parseSchedule = (description?: string | null): Schedule | null => {
  if (!description) return null;
  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.some((l) => BULLET.test(l))) return null;

  const schedule: Schedule = { heading: null, intro: [], steps: [] };
  for (const line of lines) {
    if (!BULLET.test(line)) {
      if (schedule.steps.length) {
        // Continuation of the previous step's text
        const last = schedule.steps[schedule.steps.length - 1];
        last.body = last.body ? `${last.body} ${line}` : line;
      } else if (!schedule.heading && line.endsWith(':')) {
        schedule.heading = line.slice(0, -1);
      } else {
        schedule.intro.push(line);
      }
      continue;
    }

    // Drop internal place refs like "(ID: 65)" before their colon confuses the title split
    let rest = line.replace(BULLET, '').replace(/\s*\(ID:\s*\d+\)/gi, '');
    let time: string | null = null;
    const pipe = rest.indexOf('|');
    if (pipe !== -1) {
      time = rest.slice(0, pipe).trim();
      rest = rest.slice(pipe + 1).trim();
    }
    // Times contain colons, so only look for the title split after the pipe
    const colon = time !== null ? rest.indexOf(':') : -1;
    const title = (colon !== -1 ? rest.slice(0, colon) : rest).trim();
    const body = colon !== -1 ? rest.slice(colon + 1).trim() : null;
    schedule.steps.push({ time, title, body: body || null });
  }
  return schedule.steps.length ? schedule : null;
};

const ICONS: [RegExp, LucideIcon][] = [
  [/\b(arriv\w*|home|back to)\b/i, Home],
  [/\b(transit|return|head|bus|metro|ride|drive)\b/i, Bus],
  [/\b(park|garden|lake|picnic|hill)\b/i, TreePine],
  [/\b(library|museum|palace|fort|temple|heritage)\b/i, Library],
  [/\b(dinner|lunch|breakfast|food|cafe|eat|snacks?)\b/i, Utensils],
];

const iconFor = (title: string) => ICONS.find(([re]) => re.test(title))?.[1] ?? MapPin;

export const RouteSchedule = ({ schedule }: { schedule: Schedule }) => {
  const reduced = useReducedMotion();
  const baseId = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  const list: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.15 } },
  };
  const rail: Variants = {
    hidden: reduced ? { opacity: 0 } : { scaleY: 0 },
    show: { opacity: 1, scaleY: 1, transition: { duration: reduced ? 0.3 : 1.1, ease: EASE } },
  };
  const step: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, x: -16 },
    show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
  };
  const dot: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 18 } },
  };
  const chip: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, delay: reduced ? 0 : 0.12 } },
  };

  const withBody = schedule.steps.flatMap((s, i) => (s.body ? [i] : []));
  const allOpen = withBody.length > 0 && withBody.every((i) => open.has(i));
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="max-w-2xl rounded-2xl border border-line bg-paper/70 p-4 sm:p-5 shadow-[0_1px_2px_rgba(16,42,46,0.04)]">
      <div className="flex items-center justify-between gap-3 mb-1">
        {schedule.heading && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">{schedule.heading}</p>
        )}
        {withBody.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(withBody))}
            className="ml-auto shrink-0 text-xs font-semibold text-accent-text hover:underline underline-offset-2"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>
      {schedule.intro.map((line, i) => (
        <p key={i} className="text-[15px] leading-7 text-ink/80">
          {line}
        </p>
      ))}

      <motion.ol
        className="relative mt-2"
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Rail drawn behind the dots, from the first dot to the last */}
        <motion.span
          aria-hidden
          variants={rail}
          className="absolute left-[13px] top-4 bottom-4 w-px bg-line-strong origin-top"
        />

        {schedule.steps.map((s, i) => {
          const Icon = iconFor(s.title);
          const isOpen = open.has(i);
          const bodyId = `${baseId}-step-${i}`;
          const header = (
            <>
              <motion.span
                variants={dot}
                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-paper text-accent-text transition-colors duration-300 group-hover:bg-accent group-hover:text-white"
              >
                <Icon className="h-3 w-3" strokeWidth={2.25} />
              </motion.span>
              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                {s.time && (
                  <motion.span
                    variants={chip}
                    className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent-text"
                  >
                    {s.time}
                  </motion.span>
                )}
                <h3 className="text-[15px] font-semibold leading-snug text-ink">{s.title}</h3>
              </div>
              {s.body && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink/55 group-hover:text-accent-text">
                  <span className="hidden sm:inline">{isOpen ? 'Less' : 'More info'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              )}
            </>
          );

          return (
            <motion.li key={i} variants={step} className="relative">
              {s.body ? (
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  className="group flex w-full items-center gap-3 rounded-xl py-1.5 pr-2 text-left transition-colors duration-300 hover:bg-accent-soft/40"
                >
                  {header}
                </button>
              ) : (
                <div className="group flex items-center gap-3 py-1.5 pr-2">{header}</div>
              )}
              <AnimatePresence initial={false}>
                {s.body && isOpen && (
                  <motion.div
                    id={bodyId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="pl-10 pr-2 pb-2 text-sm leading-6 text-ink/75">{s.body}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
};
