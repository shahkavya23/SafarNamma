import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle2, Clock, Crown, MessageCircle, Sparkles } from 'lucide-react';
import type { Group, Place } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';
import { groupDestination, isBoardingSoon, isPastTrip, isStoryUnlocked, seatsLeft, timeToDeparture, tripHiddenAt } from '../../utils/groups';
import { openTrip, prefetchTripPage } from '../../utils/tripTransition';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

export type MyTrip = Group & { place?: Place };

/** Trips worth showing up top: everything still to come, plus ones that left in the last day (story time). */
export const activeMyTrips = (trips: MyTrip[]) =>
  trips.filter((t) => Date.now() < tripHiddenAt(t).getTime()).sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime());

const TripTicket = ({ trip, index }: { trip: MyTrip; index: number }) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const destination = groupDestination(trip, trip.place);
  const fallback = fallbackPhoto(String(trip.id) + destination);
  // The API marks trips the viewer joined as approved; everything else here is one they host
  const joined = trip.user_request_status === 'approved';
  const past = isPastTrip(trip);
  const boarding = isBoardingSoon(trip);
  const date = new Date(trip.trip_date);
  const left = seatsLeft(trip);

  const when = date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const status = past ? 'Just wrapped' : boarding ? `Leaves in ${timeToDeparture(trip)}` : `In ${timeToDeparture(trip)}`;

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.1 + index * 0.07 }}
      className="snap-start shrink-0 w-[300px] sm:w-[340px]"
    >
      <div className="group-card group h-full flex flex-col bg-paper border border-line rounded-[22px] overflow-hidden card-shadow">
        <Link
          to={`/groups/${trip.id}`}
          onClick={(e) => openTrip(e, trip, trip.place, navigate)}
          onPointerEnter={() => prefetchTripPage(trip.id)}
          onFocus={() => prefetchTripPage(trip.id)}
          className="flex gap-4 p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 rounded-[22px]"
        >
          <div data-trip-photo className="relative w-[88px] h-[88px] rounded-2xl overflow-hidden bg-stone shrink-0">
            <img
              src={optimizeImageUrl(trip.place?.image_url, 300) || fallback}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.endsWith(fallback)) img.src = fallback;
              }}
              className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08]"
            />
            {boarding && <span className="absolute inset-x-0 bottom-0 h-1 bg-boarding" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <span className={cn('badge mb-1.5', joined ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text')}>
              {joined ? <CheckCircle2 className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
              {joined ? 'Joined' : 'Hosting'}
            </span>
            <h3 className="font-display text-lg text-ink leading-snug line-clamp-1" title={trip.title}>
              {trip.title}
            </h3>
            <p className="text-xs text-muted truncate">{when}</p>
            <p className={cn('mt-1 text-xs font-semibold flex items-center gap-1', boarding ? 'text-boarding-text' : past ? 'text-muted' : 'text-ink')}>
              <Clock className={cn('w-3 h-3', boarding && 'animate-pulse')} /> {status}
            </p>
          </div>
        </Link>

        {/* One quick action, so the trip's main job is a tap from the list */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-3.5 py-2.5">
          <span className="text-xs text-muted tabular-nums">
            {trip.current_members}/{trip.max_members} going{!past && left > 0 ? ` · ${left} open` : ''}
          </span>
          {past && isStoryUnlocked(trip) ? (
            <Link to={`/groups/${trip.id}/story`} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-text hover:underline underline-offset-4">
              <Sparkles className="w-3.5 h-3.5" /> Make story
            </Link>
          ) : trip.chat_link ? (
            <a href={trip.chat_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-accent-text transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Open chat
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-ink">
              Open trip <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
};

/* ─── Your trips ───
   A sideways row at the top of the Groups page with every trip you host or were approved on,
   soonest first, so the ones you're part of never get lost among everyone else's. */
export const MyTripsStrip = ({ trips }: { trips: MyTrip[] }) => {
  if (!trips.length) return null;
  const hosting = trips.filter((t) => t.user_request_status !== 'approved').length;
  const joined = trips.length - hosting;

  return (
    <section aria-labelledby="my-trips-title" className="max-w-7xl mx-auto w-full px-page pt-4 pb-6">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="section-label mb-2">Your trips</p>
          <h2 id="my-trips-title" className="font-display text-2xl sm:text-3xl text-ink">
            {hosting > 0 && `Hosting ${hosting}`}
            {hosting > 0 && joined > 0 && ' · '}
            {joined > 0 && `Joined ${joined}`}
          </h2>
        </div>
        <Link to="/profile?tab=trips" className="btn-ghost !py-2 !px-3.5 !text-xs shrink-0">
          See all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <ul
        className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1"
        data-lenis-prevent-horizontal
        aria-label="Trips you host or joined"
      >
        {trips.map((trip, i) => (
          <TripTicket key={trip.id} trip={trip} index={i} />
        ))}
      </ul>
    </section>
  );
};
