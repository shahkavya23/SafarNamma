import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';

export interface TripSection {
  id: string;
  label: string;
  /** A small count beside the label, e.g. requests waiting. */
  badge?: number;
}

/* ─── Section tabs for the trip page ───
   Sticks just under the navbar. The pill for the section in view slides along as you scroll,
   and tapping a tab glides the page there. Only sections the trip actually has are listed. */
export const TripSectionNav = ({ sections }: { sections: TripSection[] }) => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(sections[0]?.id);
  const ids = sections.map((s) => s.id).join(',');

  useEffect(() => {
    const els = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    // A section counts as "in view" while it crosses a band just below the tabs
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  if (sections.length < 2) return null;

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    // The wrapper spans the page width, so it lets clicks through to whatever it overlaps while stuck
    <div className="sticky top-[88px] z-30 max-w-7xl mx-auto px-4 sm:px-page mt-8 pointer-events-none">
      <nav
        aria-label="Trip sections"
        className="pointer-events-auto inline-flex max-w-full gap-1 overflow-x-auto scrollbar-none rounded-full bg-paper/85 backdrop-blur-md border border-line p-1.5 card-shadow"
        data-lenis-prevent-horizontal
      >
        {sections.map(({ id, label, badge }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={on ? 'true' : undefined}
              className={cn(
                'relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                on ? 'text-sand' : 'text-muted hover:text-ink'
              )}
            >
              {on && (
                <motion.span
                  layoutId="trip-section-pill"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {label}
                {badge ? (
                  <span className={cn('min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center', on ? 'bg-accent text-white' : 'bg-accent-soft text-accent-text')}>
                    {badge}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
