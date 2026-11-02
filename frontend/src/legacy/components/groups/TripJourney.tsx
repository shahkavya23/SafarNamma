import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { ArrowUpRight, Flag, MapPin, Sparkles } from 'lucide-react';
import type { Group, Place } from '../../types';
import { Reveal, RevealItem } from '../motion/Reveal';
import { storyUnlockTime } from '../../utils/groups';
import { cn } from '../../utils/cn';

interface Row {
  kind: 'meet' | 'stop' | 'final' | 'story';
  label: string;
  title: string;
  note?: string;
  to?: string;
  /** Stop number on a multi-stop route. */
  number?: number;
}

const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* ─── The day as a timeline ───
   Meeting point, every stop (or the one destination), then the story maker. Shown for every trip,
   so a one-place trip with no written plan still has a clear run of the day. The spine fills in as
   the section scrolls past. */
export const TripJourney = ({ group, place, stops, destination }: { group: Group; place: Place | null; stops: string[]; destination: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.55'] });
  const drawn = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  const places: Row[] = stops.length
    ? stops.map((s, i) => ({
        kind: i === stops.length - 1 ? 'final' : 'stop',
        label: i === stops.length - 1 ? 'Final stop' : `Stop ${i + 1}`,
        title: s,
        number: i + 1,
      }))
    : [{ kind: 'final', label: 'Destination', title: destination, to: place ? `/places/${place.id}` : undefined }];

  const rows: Row[] = [
    { kind: 'meet', label: `Meeting point · ${time(new Date(group.trip_date))}`, title: group.meeting_area, note: 'Be here a few minutes early so the group leaves on time.' },
    ...places,
    { kind: 'story', label: `After the trip · ${time(storyUnlockTime(group))}`, title: 'Story maker opens', note: 'The crew can turn their photos into an Instagram story.' },
  ];

  return (
    <div ref={ref} className="relative">
      <span className="absolute left-[19px] top-6 bottom-6 border-l-2 border-dashed border-line-strong" aria-hidden />
      <motion.span
        className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-accent origin-top rounded-full"
        style={reduced ? undefined : { scaleY: drawn }}
        aria-hidden
      />

      <Reveal stagger={0.1} as="div">
        {rows.map((row, i) => {
          const body = (
            <>
              <p className="text-label text-muted mb-1">{row.label}</p>
              <p className="font-display text-xl text-ink leading-snug flex items-center gap-2">
                <span className="min-w-0 break-words">{row.title}</span>
                {row.to && <ArrowUpRight className="w-4 h-4 shrink-0 text-accent-text transition-transform duration-500 group-hover:rotate-45" />}
              </p>
              {row.note && <p className="text-sm text-muted mt-1.5 leading-relaxed">{row.note}</p>}
            </>
          );
          const cardClass = cn('card px-5 py-4 flex-1 min-w-0 transition-colors duration-500', row.kind === 'story' && 'bg-transparent border-dashed');

          return (
            <RevealItem key={i} className="relative flex items-start gap-5 pb-5 last:pb-0">
              <span
                className={cn(
                  'relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  row.kind === 'meet' && 'bg-sand border-2 border-ink text-ink',
                  row.kind === 'stop' && 'bg-ink text-sand',
                  row.kind === 'final' && 'bg-accent text-white',
                  row.kind === 'story' && 'bg-accent-soft text-accent-text'
                )}
              >
                {row.kind === 'meet' ? (
                  <MapPin className="w-4 h-4" />
                ) : row.kind === 'story' ? (
                  <Sparkles className="w-4 h-4" />
                ) : row.number ? (
                  row.number
                ) : (
                  <Flag className="w-4 h-4" />
                )}
              </span>
              {row.to ? (
                <Link to={row.to} className={cn(cardClass, 'group hover:border-ink/40')}>
                  {body}
                </Link>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </RevealItem>
          );
        })}
      </Reveal>
    </div>
  );
};
