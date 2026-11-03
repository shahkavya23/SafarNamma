import { useEffect, useRef } from 'react';
import type { Itinerary } from '../../types';

/* ─── Route index ───
   Every route as a numbered pill under the deck, so the full count is always in sight and any
   route is one tap away, even when the deck only shows the few cards around the front one. */

interface RouteIndexProps {
  itineraries: Itinerary[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const RouteIndex = ({ itineraries, activeIndex, onSelect }: RouteIndexProps) => {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the active pill in the middle of the row; scrolling the row itself leaves the page where it is
  useEffect(() => {
    const row = rowRef.current;
    const pill = row?.children[activeIndex] as HTMLElement | undefined;
    if (!row || !pill) return;
    row.scrollTo({ left: pill.offsetLeft - (row.clientWidth - pill.offsetWidth) / 2, behavior: 'smooth' });
  }, [activeIndex]);

  if (itineraries.length < 2) return null;

  return (
    <nav aria-label="All routes" className="mt-4 flex flex-col items-center gap-3">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-accent-text">
        Route {activeIndex + 1} of {itineraries.length}
      </p>
      {/* Safe centring: once the pills overflow they start at the left edge, so the first ones can still be scrolled to */}
      <div
        ref={rowRef}
        className="w-full max-w-4xl flex gap-2 overflow-x-auto px-4 py-1 sm:justify-center-safe [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itineraries.map((it, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-current={isActive || undefined}
              className={`shrink-0 inline-flex items-center gap-2 h-10 pl-1.5 pr-4 rounded-full border text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-line hover:border-accent hover:text-accent-text'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] ${
                  isActive ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-text'
                }`}
              >
                {i + 1}
              </span>
              <span className="max-w-[10rem] truncate">{it.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
