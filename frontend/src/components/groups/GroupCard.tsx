import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock, MapPin, Route } from 'lucide-react';
import type { Group, Place } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';
import { groupDestination, isPastTrip, seatsLeft } from '../../utils/groups';

const StatusBadge: React.FC<{ group: Group; onPhoto?: boolean }> = ({ group, onPhoto }) => {
  const left = seatsLeft(group);
  const base = 'badge shrink-0 whitespace-nowrap';
  if (isPastTrip(group)) return <span className={`${base} ${onPhoto ? 'glass-dark' : 'bg-stone text-muted'}`}>Completed</span>;
  if (group.status === 'full' || left === 0) return <span className={`${base} badge-danger`}>Full</span>;
  if (left <= 3) return <span className={`${base} bg-accent text-white`}>{left} {left === 1 ? 'seat' : 'seats'} left</span>;
  return <span className={`${base} ${onPhoto ? 'glass-dark' : 'badge-success'}`}>{left} seats open</span>;
};

interface GroupCardProps {
  group: Group;
  place?: Place;
  /** 'photo': destination photo on top (Groups page). 'ticket': compact stub layout (home). */
  variant?: 'photo' | 'ticket';
}

/* One trip, styled as a travel ticket: a date stub, the route, seats filling up. */
export const GroupCard: React.FC<GroupCardProps> = ({ group, place, variant = 'photo' }) => {
  const date = new Date(group.trip_date);
  const fill = Math.min(100, Math.round((group.current_members / Math.max(1, group.max_members)) * 100));
  const destination = groupDestination(group, place);
  const isRoute = Boolean(group.custom_destination);
  const fallback = fallbackPhoto(String(group.id) + destination);
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const footer = (
    <div className="mt-auto pt-4">
      <div className="h-1.5 rounded-full bg-stone overflow-hidden mb-3" role="progressbar" aria-valuenow={group.current_members} aria-valuemax={group.max_members} aria-label="Seats filled">
        <div className="h-full bg-accent rounded-full transition-[width] duration-1000" style={{ width: `${fill}%` }} />
      </div>
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

  if (variant === 'ticket') {
    return (
      <Link to={`/groups/${group.id}`} className="group-card group flex h-full bg-paper border border-line rounded-[22px] overflow-hidden card-shadow">
        <div className="w-24 shrink-0 bg-ink text-sand flex flex-col items-center justify-center py-6 relative">
          <span className="text-label text-sand/60">{month}</span>
          <span className="font-display text-4xl leading-none my-1">{date.getDate()}</span>
          <span className="text-label text-sand/60">{weekday}</span>
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
    <Link to={`/groups/${group.id}`} className="group-card group flex flex-col h-full bg-paper border border-line rounded-[26px] overflow-hidden card-shadow">
      {/* Destination photo */}
      <div className="relative aspect-[16/10] overflow-hidden bg-stone">
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
          <StatusBadge group={group} onPhoto />
          {group.chat_link && (
            <span className="badge glass-dark" title="The group chat unlocks after the host approves you">
              <Lock className="w-3 h-3" /> Private chat
            </span>
          )}
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

      {/* Ticket body */}
      <div className="flex gap-4 p-5 flex-1">
        <div className="w-16 shrink-0 rounded-2xl bg-ink text-sand flex flex-col items-center justify-center py-3 self-start">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sand/60">{month}</span>
          <span className="font-display text-3xl leading-none my-0.5">{date.getDate()}</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sand/60">{weekday}</span>
        </div>
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
