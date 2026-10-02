import { useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

const DAYS_SHOWN = 14;
const TIME_SLOTS = ['05:00', '06:00', '07:00', '08:00', '10:00', '12:00', '16:00', '18:00'];

const pad = (n: number) => String(n).padStart(2, '0');
/** Date → `YYYY-MM-DD` in local time. */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** `YYYY-MM-DD` → local midnight. */
const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
/** `HH:mm` → "6 AM" / "9:45 PM". */
const timeLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${pad(m)} ${suffix}` : `${h12} ${suffix}`;
};
const nowTime = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/**
 * Tap-first date & time picker for a trip's departure.
 * `value` / `onChange` use the `YYYY-MM-DDTHH:mm` string a datetime-local input would; it's '' until both halves are chosen.
 */
export const TripDateTimePicker = ({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) => {
  const [day, setDay] = useState(() => value.split('T')[0] ?? '');
  const [time, setTime] = useState(() => value.split('T')[1] ?? '');
  const [customTime, setCustomTime] = useState(() => Boolean(value) && !TIME_SLOTS.includes(value.split('T')[1]));
  const [showLaterInput, setShowLaterInput] = useState(false);
  const laterRef = useRef<HTMLInputElement>(null);

  const today = dayKey(new Date());
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_SHOWN }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );
  const inStrip = days.some((d) => dayKey(d) === day);

  const commit = (nextDay: string, nextTime: string) => {
    setDay(nextDay);
    setTime(nextTime);
    onChange(nextDay && nextTime ? `${nextDay}T${nextTime}` : '');
  };

  const openLater = () => {
    const input = laterRef.current;
    try {
      if (input && typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      /* showPicker can throw outside a user gesture or on older browsers: fall back to the visible input */
    }
    setShowLaterInput(true);
  };

  const isPastSlot = (t: string) => day === today && t <= nowTime();

  const summary = (() => {
    if (!day || !time) return null;
    const d = parseDay(day);
    const diff = Math.round((d.getTime() - parseDay(today).getTime()) / 86_400_000);
    const rel = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
    return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${timeLabel(time)} · ${rel}`;
  })();

  return (
    <div className="space-y-5">
      {/* Day */}
      <div>
        <p className="field-label !flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-muted" /> Day
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1" role="radiogroup" aria-label="Day" data-lenis-prevent>
          {days.map((d, i) => {
            const key = dayKey(d);
            const active = key === day;
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const top = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-IN', { weekday: 'short' });
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                onClick={() => commit(key, time)}
                className={cn(
                  'shrink-0 w-[3.75rem] py-2 rounded-2xl border flex flex-col items-center transition-colors',
                  active ? 'bg-ink text-sand border-ink' : 'bg-paper border-line-strong text-body hover:border-ink hover:text-ink',
                )}
              >
                <span className={cn('text-[0.68rem] font-bold uppercase tracking-wide', !active && weekend && 'text-accent-text')}>{top}</span>
                <span className="font-display text-xl leading-tight tabular-nums">{d.getDate()}</span>
                <span className={cn('text-[0.65rem]', active ? 'text-sand/70' : 'text-muted')}>{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={openLater}
            aria-pressed={Boolean(day) && !inStrip}
            className={cn(
              'shrink-0 min-w-[3.75rem] px-3 py-2 rounded-2xl border border-dashed flex flex-col items-center justify-center text-xs font-bold transition-colors',
              day && !inStrip ? 'bg-ink text-sand border-ink border-solid' : 'border-line-strong text-body hover:border-ink hover:text-ink',
            )}
          >
            {day && !inStrip ? (
              <>
                <span className="font-display text-xl leading-tight tabular-nums">{parseDay(day).getDate()}</span>
                <span className="text-[0.65rem] font-normal">{parseDay(day).toLocaleDateString('en-IN', { month: 'short' })}</span>
              </>
            ) : (
              <>
                <CalendarDays className="w-4 h-4 mb-1" /> Later…
              </>
            )}
          </button>
        </div>
        <input
          ref={laterRef}
          type="date"
          min={today}
          value={day}
          onChange={(e) => e.target.value && commit(e.target.value, time)}
          aria-label="Pick a later date"
          className={cn(showLaterInput ? 'field mt-2 max-w-xs' : 'sr-only')}
          tabIndex={showLaterInput ? 0 : -1}
        />
      </div>

      {/* Time */}
      <div>
        <p className="field-label !flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted" /> Time
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time">
          {TIME_SLOTS.map((t) => {
            const active = !customTime && time === t;
            const past = isPastSlot(t);
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={past}
                onClick={() => {
                  setCustomTime(false);
                  commit(day, t);
                }}
                className={cn(
                  'px-3.5 py-2 rounded-full border text-sm font-semibold tabular-nums transition-colors disabled:opacity-35 disabled:pointer-events-none',
                  active ? 'bg-ink text-sand border-ink' : 'border-line-strong text-body hover:border-ink hover:text-ink',
                )}
              >
                {timeLabel(t)}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={customTime}
            onClick={() => setCustomTime(true)}
            className={cn(
              'px-3.5 py-2 rounded-full border border-dashed text-sm font-semibold transition-colors',
              customTime ? 'bg-ink text-sand border-ink border-solid' : 'border-line-strong text-body hover:border-ink hover:text-ink',
            )}
          >
            Other time
          </button>
        </div>
        {customTime && (
          <input
            type="time"
            value={time}
            onChange={(e) => commit(day, e.target.value)}
            aria-label="Departure time"
            className={cn('field mt-3 max-w-[11rem]', invalid && 'field-error')}
            autoFocus
          />
        )}
      </div>

      {summary && (
        <p className={cn('text-sm font-bold flex items-center gap-1.5', invalid ? 'text-[#A8321F]' : 'text-sage-text')}>
          <CalendarDays className="w-4 h-4" /> {summary}
        </p>
      )}
    </div>
  );
};
