import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Lock, MapPin, Route } from 'lucide-react';
import type { Group, Place } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';
import { groupDestination, isBoardingSoon, isPastTrip, seatsLeft, timeToDeparture } from '../../utils/groups';
import { openTrip, prefetchTripPage } from '../../utils/tripTransition';
import { cn } from '../../utils/cn';

/* One badge, one meaning: gold leaves within a day, orange almost full, sage seats open, stone done. */
const StatusBadge: React.FC<{ group: Group }> = ({ group }) => {
  const left = seatsLeft(group);
  const base = 'badge shrink-0 whitespace-nowrap';
  if (isPastTrip(group)) return <span className={`${base} bg-stone text-muted`}>Completed</span>;
  if (group.status === 'full' || left === 0) return <span className={`${base} bg-stone text-muted`}>Full</span>;
  if (isBoardingSoon(group)) return <span className={`${base} bg-boarding-soft text-boarding-text`}>Leaves in {timeToDeparture(group)}</span>;
  if (left <= 3) return <span className={`${base} bg-accent-soft text-accent-text`}>{left} {left === 1 ? 'seat' : 'seats'} left</span>;
  return <span className={`${base} bg-sage-soft text-sage-text`}>{left} seats open</span>;
};

/** Seats filling up: one tick per seat for small groups, a plain bar for big ones. */
const SeatBar: React.FC<{ group: Group }> = ({ group }) => {
  const { current_members: taken, max_members: total } = group;
  const label = { role: 'progressbar', 'aria-valuenow': taken, 'aria-valuemax': total, 'aria-label': 'Seats filled' } as const;
  if (total <= 12) {
    return (
      <div className="flex gap-1 mb-3" {...label}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-700', i < taken ? 'bg-seat' : 'bg-stone')} />
        ))}
      </div>
    );
  }
  const fill = Math.min(100, Math.round((taken / Math.max(1, total)) * 100));
  return (
    <div className="h-1.5 rounded-full bg-stone overflow-hidden mb-3" {...label}>
      <div className="h-full bg-seat rounded-full transition-[width] duration-1000" style={{ width: `${fill}%` }} />
    </div>
  );
};

interface GroupCardProps {
  group: Group;
  place?: Place;
  /** 'photo': destination photo on top (Groups page). 'ticket': compact stub layout (home). */
  variant?: 'photo' | 'ticket';
}

/* One trip, styled as a travel ticket: a date stub, the route, seats filling up.
   Opening it tears the ticket away and grows the photo into the trip page (utils/tripTransition). */
export const GroupCard: React.FC<GroupCardProps> = ({ group, place, variant = 'photo' }) => {
  const navigate = useNavigate();
  const date = new Date(group.trip_date);
  const destination = groupDestination(group, place);
  const isRoute = Boolean(group.custom_destination);
  const boarding = isBoardingSoon(group);
  const fallback = fallbackPhoto(String(group.id) + destination);
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const linkProps = {
    to: `/groups/${group.id}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => openTrip(e, group, place, navigate),
    onPointerEnter: () => prefetchTripPage(group.id),
    onFocus: () => prefetchTripPage(group.id),
  };

  const footer = (
    <div className="mt-auto pt-4">
      <SeatBar group={group} />
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-2 text-muted min-w-0">
          <span className="w-7 h-7 rounded-full bg-sage-soft text-sage-text flex items-center justify-center text-xs font-bold shrink-0">
            {group.organizer_name?.charAt(0).toUpperCase() || 'H'}
          </span>
          <span className="truncate">
            {group.current_members}/{group.max_members} going
          </span>
        </span>
      </div>
    </div>
  );

  const dateStub = (className: string, labelClass: string, dayClass: string) => (
    <div className={cn('relative overflow-hidden bg-ink text-sand flex flex-col items-center justify-center', className)}>
      {boarding && <span className="absolute inset-x-0 top-0 h-1 bg-boarding" aria-hidden />}
      <span className={labelClass}>{month}</span>
      <span className={dayClass}>{date.getDate()}</span>
      <span className={labelClass}>{weekday}</span>
    </div>
  );

  if (variant === 'ticket') {
    return (
      <Link {...linkProps} className="group-card group flex h-full bg-paper border border-line rounded-[22px] overflow-hidden card-shadow">
        <div className="relative w-24 shrink-0">
          {dateStub('h-full py-6', 'text-label text-sand/60', 'font-display text-4xl leading-none my-1')}
          <span className="absolute -right-[6px] top-0 bottom-0 perforation" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="badge badge-teal min-w-0" title={destination}>
              {isRoute ? <Route className="w-3 h-3 shrink-0" /> : <MapPin className="w-3 h-3 shrink-0" />}
              <span className="truncate">{destination}</span>
            </span>
            <StatusBadge group={group} />
          </div>
          <h3 className="font-display text-xl text-ink leading-snug line-clamp-2 mb-3">{group.title}</h3>
          <p className="flex items-center gap-2 text-sm text-muted">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">Meet at {group.meeting_area}</span>
          </p>
          {footer}
        </div>
      </Link>
    );
  }

  return (
    <Link {...linkProps} className="group-card group flex flex-col h-full bg-paper border border-line rounded-[26px] overflow-hidden card-shadow">
      {/* Destination photo: becomes the trip page hero when opened */}
      <div data-trip-photo className="relative aspect-[16/10] overflow-hidden bg-stone">
        <img
          src={optimizeImageUrl(place?.image_url, 800) || fallback}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith(fallback)) img.src = fallback;
          }}
          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-night/10" />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-2">
          <StatusBadge group={group} />
          {/* Every trip has a chat; the list just never sends the link */}
          <span className="badge glass-dark !px-2" title="The group chat unlocks after the host approves you">
            <Lock className="w-3 h-3" />
            <span className="sr-only">Private chat, unlocks after the host approves you</span>
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sand text-sm font-semibold min-w-0">
            {isRoute ? <Route className="w-4 h-4 shrink-0 text-[#F4B08A]" /> : <MapPin className="w-4 h-4 shrink-0 text-[#F4B08A]" />}
            <span className="truncate">{destination}</span>
          </p>
          <span className="w-10 h-10 rounded-full bg-sand text-ink flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-45">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Tear line: notches cut into the card edge, the dashes darken on hover */}
      <div className="relative z-10" aria-hidden>
        <span className="absolute -left-2.5 -top-2.5 w-5 h-5 rounded-full bg-sand border border-line" />
        <span className="absolute -right-2.5 -top-2.5 w-5 h-5 rounded-full bg-sand border border-line" />
        <span className="ticket-tear absolute left-5 right-5 top-0 border-t-2 border-dashed border-line-strong" />
      </div>

      {/* Ticket body: tears away when the trip opens */}
      <div data-trip-stub className="ticket-stub flex gap-4 p-5 flex-1 bg-paper">
        {dateStub(
          'w-16 shrink-0 rounded-2xl py-3 self-start',
          'text-[10px] font-mono uppercase tracking-[0.18em] text-sand/60',
          'font-display text-3xl leading-none my-0.5'
        )}
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="font-display text-xl text-ink leading-snug line-clamp-2 mb-1.5">{group.title}</h3>
          <p className="text-sm text-muted line-clamp-1">
            {time} · Meet at {group.meeting_area}
          </p>
          {footer}
        </div>
      </div>
    </Link>
  );
};
