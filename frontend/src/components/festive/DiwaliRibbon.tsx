import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import type { Group } from '../../types';
import { isPastTrip } from '../../utils/groups';
import { DIWALI, DIWALI_TRIP_WINDOW, isDiwaliTrip } from '../../utils/festive';

const useNow = (everyMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
};

/* A festive strip above the departure board: a countdown to Diwali and the trips leaving over the long weekend. */
export const DiwaliRibbon = ({ groups, loaded }: { groups: Group[]; loaded: boolean }) => {
  const now = useNow(30_000);
  const trips = groups.filter((g) => isDiwaliTrip(g.trip_date) && !isPastTrip(g) && g.status !== 'cancelled');
  const ms = DIWALI.getTime() - now;
  const parts = [
    { value: Math.floor(ms / 864e5), label: 'days' },
    { value: Math.floor(ms / 36e5) % 24, label: 'hrs' },
    { value: Math.floor(ms / 6e4) % 60, label: 'min' },
  ];
  const window_ = DIWALI_TRIP_WINDOW.label;

  return (
    <div className="festive-ribbon relative overflow-hidden rounded-[24px] px-5 sm:px-8 py-5 mb-5 text-[#FFF4E2] flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="relative z-10 min-w-0">
        <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#FFD27A] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> Diwali long weekend
        </p>
        <p className="font-display text-2xl sm:text-3xl leading-tight mt-1">
          Diwali <em className="italic text-[#FFD27A]">getaways</em>
        </p>
        <p className="text-sm text-[#FFF4E2]/80 mt-1">
          {!loaded
            ? `Trips leaving ${window_}`
            : trips.length
              ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} leaving ${window_}`
              : `No trips for ${window_} yet. Host the first one.`}
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-4">
        {ms > 0 ? (
          <div className="flex gap-2" aria-label={`${parts[0].value} days, ${parts[1].value} hours to Diwali`}>
            {parts.map((p) => (
              <span key={p.label} className="min-w-[3.5rem] text-center px-2 py-2 rounded-xl bg-[#FFF4E2]/10 border border-[#FFF4E2]/20" aria-hidden>
                <span className="block font-display text-2xl leading-none tabular-nums">{p.label === 'days' ? p.value : String(p.value).padStart(2, '0')}</span>
                <span className="text-[10px] tracking-[0.1em] uppercase opacity-80">{p.label}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="font-display text-2xl">Happy Diwali</p>
        )}
        <Link
          to={trips.length ? '/groups' : '/groups?host=1'}
          className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full bg-[#FFF4E2] text-[#7A2A0C] text-sm font-bold hover:bg-white transition-colors"
        >
          {trips.length ? (
            <>
              See trips <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Host a trip
            </>
          )}
        </Link>
      </div>
    </div>
  );
};
