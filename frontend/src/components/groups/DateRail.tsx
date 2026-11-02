import React, { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Group } from '../../types';
import { isBoardingSoon, seatsLeft } from '../../utils/groups';
import { cn } from '../../utils/cn';

const RAIL_DAYS = 14;
const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

/** Local calendar day as "2026-11-06", the key the rail and the URL use. */
export const dayKey = (d: Date) => d.toLocaleDateString('en-CA');

const fromKey = (key: string) => new Date(`${key}T00:00:00`);
const short = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** "Thu 6 Nov", or "Sat 8 – Sun 9 Nov" for a weekend. */
export const daysLabel = (keys: string[]) => {
  if (!keys.length) return '';
  const first = fromKey(keys[0]);
  if (keys.length === 1) return short(first);
  const last = fromKey(keys[keys.length - 1]);
  return `${first.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })} – ${short(last)}`;
};

/** Trips grouped by the day they leave. */
export const tripsByDay = (groups: Group[]) => {
  const map = new Map<string, Group[]>();
  for (const g of groups) {
    const key = dayKey(new Date(g.trip_date));
    map.set(key, [...(map.get(key) ?? []), g]);
  }
  return map;
};

const dotClass = (g: Group) => (g.status === 'full' || seatsLeft(g) === 0 ? 'bg-faint' : isBoardingSoon(g) ? 'bg-boarding' : 'bg-seat');

interface DateRailProps {
  /** Upcoming trips by day (from `tripsByDay`). */
  trips: Map<string, Group[]>;
  /** Selected day keys; empty means any day. */
  value: string[];
  onChange: (keys: string[]) => void;
}

/* ─── Departure date rail ───
   The next two weeks as a strip of days, each with a dot per trip (sage open, gold leaving
   within a day, grey full). An ink pill slides to the chosen day; Sat + Sun share a
   "Weekend" bracket that selects both, and the pill stretches across them. */
export const DateRail: React.FC<DateRailProps> = ({ trips, value, onChange }) => {
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const transition = reduced ? { duration: 0 } : SPRING;

  // Days, chunked so each Sat + Sun pair renders together under its bracket
  const chunks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: RAIL_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
    const out: Date[][] = [];
    for (const d of days) {
      const prev = out[out.length - 1];
      if (d.getDay() === 0 && prev?.length === 1 && prev[0].getDay() === 6) prev.push(d);
      else out.push([d]);
    }
    return out;
  }, []);
  const keys = useMemo(() => chunks.flat().map(dayKey), [chunks]);
  const selected = value.join(',');

  // Keep the chosen day in view on narrow screens, without moving the page
  useEffect(() => {
    const rail = railRef.current;
    const target = rail?.querySelector<HTMLElement>(value.length ? `[data-day="${value[0]}"]` : '[data-day="any"]');
    if (!rail || !target) return;
    const left = target.offsetLeft - rail.clientWidth / 2 + target.offsetWidth / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  }, [selected, reduced]);

  // Arrow keys step one day at a time
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const at = value.length ? keys.indexOf(value[e.key === 'ArrowRight' ? value.length - 1 : 0]) : -1;
    const next = e.key === 'ArrowRight' ? Math.min(keys.length - 1, at + 1) : at - 1;
    const key = next < 0 ? null : keys[next];
    onChange(key ? [key] : []);
    railRef.current?.querySelector<HTMLElement>(`[data-day="${key ?? 'any'}"]`)?.focus();
  };

  const pill = <motion.span layoutId="rail-pill" className="absolute inset-0 rounded-2xl bg-ink" transition={transition} />;

  const dayButton = (d: Date, inWeekendPick: boolean) => {
    const key = dayKey(d);
    const list = trips.get(key) ?? [];
    const active = selected === key;
    const lit = active || inWeekendPick;
    const isToday = key === keys[0];
    const label = `${short(d)}, ${list.length ? `${list.length} ${list.length === 1 ? 'trip' : 'trips'}` : 'no trips yet'}`;
    return (
      <button
        key={key}
        type="button"
        data-day={key}
        aria-pressed={active}
        aria-label={label}
        tabIndex={active || (!value.length && isToday) ? 0 : -1}
        onClick={() => onChange(active ? [] : [key])}
        className={cn(
          'relative w-[3.25rem] shrink-0 snap-start rounded-2xl py-2 flex flex-col items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors',
          !lit && 'hover:bg-stone/70'
        )}
      >
        {active && pill}
        <span className={cn('relative text-[10px] font-mono uppercase tracking-[0.14em]', lit ? 'text-sand/70' : 'text-muted')}>
          {isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}
        </span>
        <span className={cn('relative font-display text-xl leading-none', lit ? 'text-sand' : list.length ? 'text-ink' : 'text-faint')}>{d.getDate()}</span>
        <span className="relative flex gap-[3px] h-1.5 mt-1" aria-hidden>
          {list.slice(0, 3).map((g) => (
            <span key={g.id} className={cn('w-1.5 h-1.5 rounded-full', dotClass(g))} />
          ))}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={railRef}
      role="group"
      aria-label="Departure day"
      onKeyDown={onKeyDown}
      data-lenis-prevent-horizontal
      className="flex items-start gap-1 overflow-x-auto scrollbar-none snap-x snap-mandatory flex-1 min-w-0 px-1"
    >
      <button
        type="button"
        data-day="any"
        aria-pressed={!value.length}
        onClick={() => onChange([])}
        className={cn(
          'relative shrink-0 snap-start h-[3.9rem] px-4 rounded-2xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors',
          value.length ? 'text-ink hover:bg-stone/70' : 'text-sand'
        )}
      >
        {!value.length && pill}
        <span className="relative">Any day</span>
      </button>
      <span className="w-px self-stretch my-2 bg-line shrink-0" aria-hidden />

      {chunks.map((chunk) => {
        if (chunk.length === 1) return dayButton(chunk[0], false);
        const pair = chunk.map(dayKey);
        const weekendPick = selected === pair.join(',');
        const pairTrips = pair.reduce((n, k) => n + (trips.get(k)?.length ?? 0), 0);
        return (
          <div key={pair[0]} className="relative flex flex-col shrink-0 snap-start">
            <div className="relative flex gap-1">
              {weekendPick && pill}
              {chunk.map((d) => dayButton(d, weekendPick))}
            </div>
            <button
              type="button"
              aria-pressed={weekendPick}
              aria-label={`Weekend ${daysLabel(pair)}, ${pairTrips} ${pairTrips === 1 ? 'trip' : 'trips'}`}
              onClick={() => onChange(weekendPick ? [] : pair)}
              className={cn(
                'group/wk mx-2 mt-1 pt-1 border-t-2 text-[9px] font-mono uppercase tracking-[0.2em] transition-colors outline-none focus-visible:text-ink',
                weekendPick ? 'border-ink text-ink' : 'border-line-strong text-muted hover:border-ink hover:text-ink'
              )}
            >
              Weekend
            </button>
          </div>
        );
      })}
    </div>
  );
};
