import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Clock, Flag, Lock, MapPin, MoreHorizontal, Navigation, Route as RouteIcon, Star, Trash2, Wallet } from 'lucide-react';
import type { Itinerary, ItineraryStop } from '../../types';
import { readableDuration } from './ItineraryHero';
import { startGroupUrl, UNLOCK_RULE } from './unlock';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';

/* ─── Itinerary card ───
   One tall card sized to fit the screen: the route's photo and details on top, its stops
   drawn as a path below, and the way in at the bottom. The photo gives up height so the
   path can grow. Routes too long for the screen keep their start and finish, with
   "+N more stops" in between, so nothing scrolls inside the card. The line inks itself
   in and a small traveller walks it whenever the card comes to the front. */

const EASE = [0.22, 1, 0.36, 1] as const;
const ROW_HEIGHT = 52;
// Matches the photo's min-h-[28%], so the path can never push the photo below it
const ROUTE_SHARE = 0.72;
const MIN_ROWS = 3;

// The card's width and height; the deck needs them to work out how far the side cards sit
export const ITINERARY_CARD_SIZE = 'w-[min(calc(100vw-2.5rem),28rem)] h-[max(30rem,min(calc(100dvh-8.5rem),46rem))]';
export const itineraryCardWidth = (windowWidth: number) => Math.min(windowWidth - 40, 448);

interface ItineraryCardProps {
  itinerary: Itinerary;
  fallbackImage: string;
  isActive?: boolean;
  isAdmin?: boolean;
  onDelete?: (e: React.MouseEvent, id: number) => void;
  onToggleFeatured?: (e: React.MouseEvent, itinerary: Itinerary) => void;
}

export const ItineraryCard = ({ itinerary, fallbackImage, isActive = true, isAdmin, onDelete, onToggleFeatured }: ItineraryCardProps) => {
  const reduced = useReducedMotion();
  const stops = [...(itinerary.stops ?? [])].sort((a, b) => a.order_index - b.order_index);
  const locked = itinerary.is_locked;
  // A locked route has no stops to count, so the server counts them
  const stopCount = locked ? itinerary.stop_count : stops.length;
  const duration = readableDuration(itinerary.estimated_duration);
  const href = `/itineraries/${itinerary.id}`;
  const play = isActive && !reduced;
  const drawTime = play ? 0.5 + stops.length * 0.15 : 0;

  const cardRef = useRef<HTMLElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [maxRows, setMaxRows] = useState(stops.length);

  // How many stops fit: the path's share of the card, less the heading and button around it
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const lower = lowerRef.current;
      const list = listRef.current;
      if (!lower || !list) return;
      const around = lower.offsetHeight - list.offsetHeight;
      setMaxRows(Math.max(MIN_ROWS, Math.floor((card.offsetHeight * ROUTE_SHARE - around) / ROW_HEIGHT)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [stops.length]);

  const fits = stops.length <= maxRows;
  const leading = fits ? stops : stops.slice(0, maxRows - 2);
  const finish = fits ? null : stops[stops.length - 1];
  const hiddenCount = fits ? 0 : stops.length - leading.length - 1;
  const rowCount = fits ? stops.length : maxRows;

  const renderStop = (stop: ItineraryStop, position: number, row: number) => (
    <StopRow
      key={stop.id}
      stop={stop}
      position={position}
      isFirst={position === 0}
      isLast={position === stops.length - 1}
      fallbackHref={href}
      play={play}
      delay={0.25 + row * 0.15}
    />
  );

  return (
    <article
      ref={cardRef}
      className="flex flex-col w-full h-full rounded-[28px] overflow-hidden bg-paper border border-line shadow-[0_40px_100px_-40px_rgba(14,31,34,0.55)]"
    >
      {/* ── Photo and details ── */}
      <Link
        to={href}
        draggable={false}
        className="relative flex-1 min-h-[28%] overflow-hidden bg-night text-sand flex flex-col justify-end p-5 focus-visible:-outline-offset-4"
      >
        <img
          src={optimizeImageUrl(itinerary.image_url || undefined, 900) || fallbackImage}
          alt=""
          draggable={false}
          // Painted only once decoded, so a card sliding in never shows a blank photo for a frame
          decoding="sync"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith(fallbackImage)) img.src = fallbackImage;
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-night via-night/55 to-night/5" />

        <div className="relative">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {itinerary.is_featured && <Chip icon={<Star className="w-3 h-3 fill-diya text-diya" />}>Free pick</Chip>}
            {locked && <Chip icon={<Lock className="w-3 h-3 text-diya" />}>Locked</Chip>}
            <Chip icon={<MapPin className="w-3 h-3 text-accent" />}>
              {stopCount} {stopCount === 1 ? 'Stop' : 'Stops'}
            </Chip>
            {duration && <Chip icon={<Clock className="w-3 h-3 text-[#F4B08A]" />}>{duration}</Chip>}
            {!!itinerary.estimated_budget && (
              <Chip icon={<Wallet className="w-3 h-3 text-diya" />}>
                ₹{itinerary.estimated_budget.toLocaleString('en-IN')}
              </Chip>
            )}
          </div>
          <h3 className="font-display text-3xl sm:text-4xl leading-[1.05] line-clamp-2 text-sand! [text-shadow:0_2px_18px_rgba(14,31,34,0.6)]">
            {itinerary.title}
          </h3>
          {itinerary.description && (
            <p className="mt-1.5 text-sm text-sand/80 leading-snug line-clamp-2 [@media(max-height:760px)]:hidden">
              {itinerary.description}
            </p>
          )}
        </div>
      </Link>

      {/* ── The path and the way in ── */}
      <div ref={lowerRef} className="shrink-0 px-5 pt-3.5 pb-4 bg-[radial-gradient(circle_at_100%_0%,rgba(224,86,31,0.08),transparent_55%)]">
        <div className="flex items-center gap-2 mb-1.5 text-accent-text">
          <RouteIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold">The Route</span>
        </div>

        {locked ? (
          <LockedRoute rows={MIN_ROWS} />
        ) : stops.length === 0 ? (
          <EmptyRoute rows={MIN_ROWS} />
        ) : (
          // Not remounted when the card comes to the front: the animations replay on their own,
          // and the stop photos stay loaded instead of blinking out and back mid-slide
          <ol ref={listRef} className="relative" style={{ height: rowCount * ROW_HEIGHT }}>
            {/* Track, the inked line, and the traveller walking it */}
            <div
              aria-hidden
              className="absolute left-[16.5px] w-[3px] rounded-full bg-stone"
              style={{ top: ROW_HEIGHT / 2, bottom: ROW_HEIGHT / 2 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-linear-to-b from-sage via-accent to-accent origin-top"
                initial={play ? { scaleY: 0 } : false}
                animate={play ? { scaleY: [0, 1] } : { scaleY: 1 }}
                transition={play ? { duration: drawTime, ease: 'easeInOut', delay: 0.15 } : { duration: 0 }}
              />
              {play && stops.length > 1 && (
                <motion.span
                  className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-diya shadow-[0_0_0_3px_rgba(255,193,94,0.3),0_0_14px_3px_rgba(255,193,94,0.7)]"
                  initial={{ top: '0%', opacity: 0 }}
                  animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 1.4 + rowCount * 0.6,
                    times: [0, 0.1, 0.9, 1],
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    ease: 'easeInOut',
                    delay: drawTime + 0.4,
                  }}
                />
              )}
            </div>

            {leading.map((stop, i) => renderStop(stop, i, i))}
            {finish && (
              <Fragment>
                <li className="relative" style={{ height: ROW_HEIGHT }}>
                  <Link
                    to={href}
                    draggable={false}
                    className="group/stop flex items-center gap-3 h-full rounded-xl hover:bg-sand transition-colors"
                  >
                    <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-paper border-2 border-dashed border-line text-muted flex items-center justify-center">
                      <MoreHorizontal className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-muted group-hover/stop:text-accent-text transition-colors">
                      +{hiddenCount} more {hiddenCount === 1 ? 'stop' : 'stops'}
                    </span>
                  </Link>
                </li>
                {renderStop(finish, stops.length - 1, leading.length + 1)}
              </Fragment>
            )}
          </ol>
        )}

        <div className="flex items-center gap-2.5 mt-2.5">
          <Link
            to={locked ? startGroupUrl(itinerary) : href}
            draggable={false}
            className="group/cta flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full bg-accent text-white text-sm font-semibold shadow-[0_12px_30px_-10px_rgba(224,86,31,0.8)] hover:bg-accent-text transition-colors"
          >
            {locked ? (
              <>
                <Lock className="w-4 h-4" />
                Create group to unlock
              </>
            ) : (
              <>
                Explore Route
                <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
              </>
            )}
          </Link>
          {isAdmin && onToggleFeatured && (
            <button
              onClick={(e) => onToggleFeatured(e, itinerary)}
              className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                itinerary.is_featured
                  ? 'bg-diya/20 border-diya text-ink'
                  : 'bg-sand border-line text-muted hover:text-ink'
              }`}
              title={itinerary.is_featured ? 'Free for everyone. Click to lock it again' : 'Make this one of the 3 free routes'}
              aria-pressed={itinerary.is_featured}
            >
              <Star className={`w-4 h-4 ${itinerary.is_featured ? 'fill-diya text-diya' : ''}`} />
            </button>
          )}
          {isAdmin && onDelete && (
            <button
              onClick={(e) => onDelete(e, itinerary.id)}
              className="shrink-0 w-11 h-11 rounded-full bg-sand border border-line text-muted hover:bg-[#FDF3F1] hover:text-[#B42318] flex items-center justify-center transition-colors"
              title="Delete itinerary"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

interface StopRowProps {
  stop: ItineraryStop;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  fallbackHref: string;
  play: boolean;
  delay: number;
}

const StopRow = ({ stop, position, isFirst, isLast, fallbackHref, play, delay }: StopRowProps) => {
  const place = stop.destination;
  const img = optimizeImageUrl(place?.image_url, 120) || fallbackPhoto(stop.destination_id);
  const stage = isFirst ? 'Start' : isLast ? 'Finish' : `Stop ${position + 1}`;
  // The way on to the next stop says more here than the category; the last stop has no way on
  const detail = !isLast && stop.transport_mode ? `then by ${stop.transport_mode}` : place?.category;

  return (
    <motion.li
      initial={play ? { opacity: 0, x: 18 } : false}
      animate={play ? { opacity: [0, 1], x: [18, 0] } : { opacity: 1, x: 0 }}
      transition={play ? { delay, duration: 0.45, ease: EASE } : { duration: 0 }}
      className="relative"
      style={{ height: ROW_HEIGHT }}
    >
      <Link
        to={place ? `/places/${place.id}` : fallbackHref}
        draggable={false}
        className="group/stop flex items-center gap-3 h-full rounded-xl hover:bg-sand transition-colors"
      >
        <span
          className={`relative z-10 shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold ring-3 ring-paper transition-transform group-hover/stop:scale-110 ${
            isFirst ? 'bg-sage text-white' : isLast ? 'bg-accent text-white' : 'bg-night text-sand'
          }`}
        >
          {isFirst ? <Navigation className="w-3.5 h-3.5" /> : isLast ? <Flag className="w-3.5 h-3.5" /> : String(position + 1).padStart(2, '0')}
          {isFirst && play && <span className="absolute inset-0 rounded-full bg-sage/50 animate-ping" />}
        </span>

        <span className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-stone">
          <img
            src={img}
            alt=""
            decoding="sync"
            draggable={false}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              const fallback = fallbackPhoto(stop.destination_id);
              if (!el.src.endsWith(fallback)) el.src = fallback;
            }}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-muted truncate">
            {stage}
            {detail ? ` · ${detail}` : ''}
          </span>
          <span className="block font-display text-base text-ink leading-tight truncate group-hover/stop:text-accent-text transition-colors">
            {place?.name ?? 'Unnamed stop'}
          </span>
        </span>
      </Link>
    </motion.li>
  );
};

/** Stand-in stop rows, blurred, with the unlock rule laid over them. */
const LockedRoute = ({ rows }: { rows: number }) => (
  <div className="relative" style={{ height: rows * ROW_HEIGHT }}>
    <div aria-hidden className="blur-[3px] pointer-events-none select-none opacity-70">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ height: ROW_HEIGHT }}>
          <span className="shrink-0 w-9 h-9 rounded-full bg-night/80" />
          <span className="shrink-0 w-10 h-10 rounded-lg bg-stone" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-2 w-16 rounded-full bg-stone" />
            <span className="block h-3 rounded-full bg-line" style={{ width: `${70 - (i % 3) * 12}%` }} />
          </span>
        </div>
      ))}
    </div>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <span className="w-10 h-10 rounded-full bg-night text-diya flex items-center justify-center mb-2 shadow-lg">
        <Lock className="w-4 h-4" />
      </span>
      <p className="text-sm font-semibold text-ink leading-snug max-w-[18rem] [text-shadow:0_0_12px_var(--color-paper,#fff)]">
        {UNLOCK_RULE}
      </p>
    </div>
  </div>
);

/** A route with no stops yet keeps the same room as a short one, so its photo isn't
    stretched tall and cropped. Dashed stand-in stops sit behind the note. */
const EmptyRoute = ({ rows }: { rows: number }) => (
  <div className="relative" style={{ height: rows * ROW_HEIGHT }}>
    <div aria-hidden className="pointer-events-none select-none">
      <div
        className="absolute left-[17px] w-0 border-l-2 border-dashed border-line"
        style={{ top: ROW_HEIGHT / 2, bottom: ROW_HEIGHT / 2 }}
      />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="relative flex items-center gap-3" style={{ height: ROW_HEIGHT }}>
          <span className="shrink-0 w-9 h-9 rounded-full bg-paper border-2 border-dashed border-line" />
          <span className="flex-1 space-y-1.5 opacity-60">
            <span className="block h-2 w-14 rounded-full bg-stone" />
            <span className="block h-3 rounded-full bg-stone/70" style={{ width: `${62 - (i % 3) * 12}%` }} />
          </span>
        </div>
      ))}
    </div>
    <div className="absolute inset-0 flex items-center justify-center pl-14 pr-2">
      <p className="px-3 py-1.5 rounded-full bg-paper border border-line text-xs font-semibold text-muted shadow-sm">
        Stops are being mapped out
      </p>
    </div>
  </div>
);

const Chip = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-night/70 backdrop-blur-md border border-white/15 text-sand flex items-center gap-1.5">
    {icon}
    {children}
  </span>
);
