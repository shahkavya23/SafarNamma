import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { Search, ArrowRight, MapPin, Users, Compass, ShieldCheck, Camera, Plus, Sparkles, ArrowUpRight } from 'lucide-react';
import { placesApi, groupsApi } from '../api/client';
import type { Place, Group } from '../types';
import { PlaceCard, type PlaceCardData } from '../components/places/PlaceCard';
import { useLiveCount } from '../context/PresenceContext';
import { Reveal, RevealItem } from '../components/motion/Reveal';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Counter } from '../components/motion/Counter';
import { optimizeImageUrl, photoProps, photoSrc, type PhotoKey } from '../utils/images';
import { findGroupPlace, firstName, groupDestination, groupsForPlace, isPastTrip, seatsLeft, timeToDeparture, travellerCount, withSamples } from '../utils/groups';
import { DepartureBoard } from '../components/groups/DepartureBoard';
import { TravellersProof } from '../components/home/TravellersProof';
import { HeroIntro } from '../components/home/HeroIntro';
import { INTRO_POP, useIntroOnce } from '../hooks/useIntroOnce';
import { TripActivityToast } from '../components/home/TripActivityToast';
import { TripNudgeBar } from '../components/home/TripNudgeBar';
import { demoTrips } from '../mock/demoTrips';
import { categoryIcon } from '../utils/categories';
import { StoryPhoneMock } from '../components/groups/StoryPromo';
import { LiquidMetalButton } from '../components/ui/liquid-metal-button';
import { Toran } from '../components/festive/Toran';
import { Embers } from '../components/festive/Embers';
import { Rangoli } from '../components/festive/Rangoli';
import { isDiwaliSeason, isDiwaliTrip } from '../utils/festive';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─── Seeded place cards (fallback when the API has no weekend picks) ─── */
const SEED_PLACES: PlaceCardData[] = [
  {
    id: 'skandagiri',
    name: 'Skandagiri Sunrise Trek',
    category: 'Nature',
    state: 'Chikkaballapur',
    image_url: photoSrc('skandagiri', 800),
    is_hidden_gem: true,
    description: 'A moonlit trek to the granite peak above Chikkaballapur, rewarded by a sea of clouds at sunrise.',
    best_season: 'Oct – Feb',
    budget_tier: '500',
  },
  {
    id: 'coorg-falls',
    name: 'Abbey Falls, Coorg',
    category: 'Nature',
    state: 'Madikeri',
    image_url: photoSrc('coorgFalls', 800),
    is_hidden_gem: false,
    description: 'Coffee and spice plantations frame a cascade into emerald pools. Best after the monsoon rains.',
    best_season: 'Jul – Oct',
    budget_tier: '1200',
  },
  {
    id: 'nandi',
    name: 'Nandi Hills at Dawn',
    category: 'Nature',
    state: 'Chikkaballapur',
    image_url: photoSrc('nandi', 800),
    is_hidden_gem: true,
    description: 'The winding hill road crests above a golden fog-sea most mornings between October and March.',
    best_season: 'Oct – Mar',
    budget_tier: '300',
  },
  {
    id: 'hampi',
    name: 'Vittala Temple, Hampi',
    category: 'Monuments',
    state: 'Hampi',
    image_url: photoSrc('hampi', 800),
    is_hidden_gem: false,
    description: 'Carved stone mandapas and the famous stone chariot, best explored in the soft light of early morning.',
    best_season: 'Oct – Feb',
    budget_tier: '600',
  },
];

/* ════════════════════════════════════════
   NEXT TRIP CARD — the soonest real trip, with its seats drawn as dots
   ════════════════════════════════════════ */
const MAX_SEAT_DOTS = 10;
// Taken seats fill in one after another; the Host button pops once they're done
const SEAT_FILL_START = 1;
const SEAT_FILL_STEP = 0.14;
// Seats left at or below this get the urgent pill
const FEW_SEATS = 2;
const COUNTDOWN_TICK_MS = 30_000;

const NextTripCard: React.FC<{ trip?: Group; places: Place[]; loaded: boolean }> = ({ trip, places, loaded }) => {
  const reduced = useReducedMotion();
  // Re-render now and then so the countdown keeps moving
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), COUNTDOWN_TICK_MS);
    return () => window.clearInterval(t);
  }, []);
  const shell = 'block bg-paper rounded-2xl border border-line card-shadow p-4 pr-5 w-[15.5rem]';

  if (!loaded) {
    return (
      <div className={shell} aria-label="Loading">
        <p className="text-label text-muted mb-2">Next trip</p>
        <span className="block w-40 h-6 rounded-md bg-line/70 animate-pulse" />
        <span className="block w-28 h-4 mt-3 rounded-md bg-line/70 animate-pulse" />
      </div>
    );
  }

  if (!trip) {
    return (
      <Link to="/groups?host=1" className={`${shell} group hover:border-ink transition-colors`}>
        <p className="text-label text-muted mb-1">Next trip · Open</p>
        <p className="font-display text-2xl text-ink leading-tight">Be the first</p>
        {/* Empty seats waiting for a host; the first one is yours */}
        <div className="flex items-center gap-1 mt-3" aria-hidden>
          <span className="relative w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-accent/50 motion-safe:animate-ping" />
            <Plus className="relative w-3 h-3" />
          </span>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="w-5 h-5 rounded-full border-[1.5px] border-dashed border-accent/70" />
          ))}
        </div>
        {/* A quiet link, so it doesn't outshout the hero's Find a trip button */}
        <span className="mt-4 flex items-center gap-1.5 text-sm font-bold text-accent-text">
          Host the first one <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    );
  }

  const left = seatsLeft(trip);
  const dots = Math.min(trip.max_members, MAX_SEAT_DOTS);
  const taken = Math.min(trip.current_members, dots);
  const extra = trip.max_members - dots;
  const d = new Date(trip.trip_date);
  const when = `${d.toLocaleDateString('en-IN', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`;
  const countdown = timeToDeparture(trip);
  const host = firstName(trip.organizer_name);

  return (
    <Link to={`/groups/${trip.id}`} className={`${shell} group hover:border-ink transition-colors`}>
      <p className="text-label text-muted mb-1 flex items-center gap-2">
        <span className="live-dot" /> Next trip · {when}
      </p>
      <p className="font-display text-2xl text-ink leading-tight truncate">{groupDestination(trip, findGroupPlace(trip, places))}</p>
      {(countdown || host) && (
        <p className="text-xs text-muted mt-1 truncate">
          {countdown && (
            <>
              Leaves in <span className="font-bold text-ink tabular-nums">{countdown}</span>
            </>
          )}
          {countdown && host && ' · '}
          {host && `with ${host}`}
        </p>
      )}
      <div className="flex items-center gap-1 mt-3" aria-label={`${trip.current_members} going, ${left} seats left`}>
        {Array.from({ length: dots }).map((_, i) =>
          i < taken ? (
            <motion.span
              key={i}
              className="w-5 h-5 rounded-full bg-ink text-sand flex items-center justify-center"
              initial={reduced ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: SEAT_FILL_START + i * SEAT_FILL_STEP }}
            >
              <Users className="w-2.5 h-2.5" />
            </motion.span>
          ) : (
            <span key={i} className="w-5 h-5 rounded-full border-[1.5px] border-dashed border-accent" />
          )
        )}
        {extra > 0 && <span className="text-xs font-bold text-muted ml-0.5">+{extra}</span>}
      </div>
      <p className="text-xs font-semibold mt-2 flex items-center justify-between">
        {left > 0 && left <= FEW_SEATS ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 -my-1 rounded-full bg-accent-soft text-accent-text">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            Only {left} {left === 1 ? 'seat' : 'seats'} left
          </span>
        ) : (
          <span className={left === 0 ? 'text-muted' : 'text-accent-text'}>{left === 0 ? 'Full' : `${left} ${left === 1 ? 'seat' : 'seats'} left`}</span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-ink transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
};

/* ════════════════════════════════════════
   HERO — a short headline, two actions and quick picks on the left,
   a tidy grid of real destinations on the right with the next trip pinned to it.
   ════════════════════════════════════════ */
/* Each tile slowly cycles through its photos. A slide with `placeId` opens that place; otherwise an
   empty `q` links the tile to trips instead of a search. */
type TileSlide = { key: PhotoKey | `place-${number}`; label: string; q: string; src?: string; placeId?: number };
const GROUP_SLIDE: TileSlide = { key: 'friends', label: 'Go as a group', q: '' };

// Real places from the catalogue, using the photos stored on each destination
const placeSlide = (placeId: number, label: string, src: string): TileSlide => ({ key: `place-${placeId}`, label, q: '', src, placeId });
const CLOUD = 'https://res.cloudinary.com/my3tjiae/image/upload';

const HERO_TILES: { slides: TileSlide[]; className: string }[] = [
  {
    className: 'row-span-4',
    slides: [
      placeSlide(30, 'UB City', `${CLOUD}/v1790172494/2C1F43C3-8285-4964-94A3-18354626894F.png`),
      placeSlide(7, 'Lalbagh', `${CLOUD}/v1790101571/IMG_7965.jpg`),
      placeSlide(6, 'Church Street', `${CLOUD}/v1790059988/IMG_7947.jpg`),
    ],
  },
  {
    className: 'row-span-2',
    slides: [
      placeSlide(53, 'MG Road', `${CLOUD}/v1790280655/images-1--mufyvm3zn9bgs.jpg`),
      placeSlide(15, 'Bangalore Palace', `${CLOUD}/v1790160469/hdgu.jpg`),
    ],
  },
  {
    className: 'row-span-3',
    slides: [
      placeSlide(35, 'HAL Aerospace Museum', `${CLOUD}/v1790247523/hal.webp`),
      placeSlide(56, 'Ulsoor Lake', `${CLOUD}/v1790281419/unnamed-mufzbyo1gf19i.webp`),
      placeSlide(60, 'Visvesvaraya Museum', `${CLOUD}/v1790282490/images-mufzyx4dff6kg.jpg`),
    ],
  },
  { className: 'row-span-3', slides: [GROUP_SLIDE] },
];

const SLIDES_PER_TILE = 10;

const shuffled = <T,>(items: T[]) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Real places that have a photo, shuffled and dealt across the photo tiles, up to ten each, so every
    visit opens on a different mix and newly added places join on their own. Until places load (or if the
    API is down) the curated slides stand in. */
const buildHeroTiles = (places: Place[]) => {
  const pool = shuffled(places.filter((p) => p.image_url));
  const photoTiles = HERO_TILES.filter((t) => t.slides[0].placeId);
  if (pool.length < photoTiles.length) return HERO_TILES;
  const dealt: TileSlide[][] = photoTiles.map(() => []);
  pool.forEach((p, i) => dealt[i % dealt.length].push(placeSlide(p.id, p.name, p.image_url!)));
  let n = 0;
  return HERO_TILES.map((t) => (t.slides[0].placeId ? { ...t, slides: dealt[n++].slice(0, SLIDES_PER_TILE) } : t));
};

const CYCLE_SECONDS = 6;
const FADE_SECONDS = 1.2;

const HeroTile: React.FC<{ slides: TileSlide[]; index: number }> = ({ slides, index }) => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  // Only the photo painted on first load starts visible; anything swapped in later (the shuffled
  // real places) fades in over it instead of cutting
  const [firstKey] = useState(slides[0].key);

  useEffect(() => {
    if (reduced || slides.length < 2) return;
    let timer: number | undefined;
    const next = () => setActive((a) => (a + 1) % slides.length);
    // Tiles change at staggered moments so the grid never flips all at once
    const start = window.setTimeout(() => {
      next();
      timer = window.setInterval(next, CYCLE_SECONDS * 1000);
    }, (CYCLE_SECONDS + index * 1.7) * 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [reduced, slides.length, index]);

  // Slides can grow once real places load, so wrap rather than trust the old index
  const current = active % slides.length;
  const slide = slides[current];
  // Only the photo on show, the one fading out and the next one are mounted, so a tile with
  // ten places doesn't download all ten up front
  const mounted = (i: number) => i === current || i === (current + 1) % slides.length || i === (current - 1 + slides.length) % slides.length;

  return (
    <Link
      to={slide.placeId ? `/places/${slide.placeId}` : slide.q ? `/explore?q=${encodeURIComponent(slide.q)}` : '/groups'}
      className="group relative block w-full h-full rounded-[28px] overflow-hidden bg-stone card-shadow-hover"
    >
      <span className="absolute inset-0 transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]">
        <AnimatePresence initial={false}>
        {slides.map((s, i) => {
          if (!mounted(i)) return null;
          const on = i === current;
          const sizes = '(min-width: 1024px) 22vw, 45vw';
          const imgProps = s.src
            ? {
                src: optimizeImageUrl(s.src, 900),
                srcSet: `${optimizeImageUrl(s.src, 600)} 600w, ${optimizeImageUrl(s.src, 1400)} 1400w`,
                sizes,
                alt: s.label,
              }
            : photoProps(s.key as PhotoKey, sizes);
          return (
            <motion.img
              key={s.key}
              {...imgProps}
              aria-hidden={!on}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 && i === 0 ? 'high' : undefined}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: s.key === firstKey ? 1 : 0, transform: 'scale(1)' }}
              exit={{ opacity: 0, transition: { duration: FADE_SECONDS, ease: 'easeInOut' } }}
              // Slow zoom while shown; snap back only after it has faded out. A whole `transform` string
              // runs on the GPU; a bare `scale` is stepped in JS every frame and made the page stutter
              animate={{ opacity: on ? 1 : 0, transform: on && !reduced ? 'scale(1.08)' : 'scale(1)' }}
              transition={{
                opacity: { duration: FADE_SECONDS, ease: 'easeInOut' },
                transform: on ? { duration: CYCLE_SECONDS + FADE_SECONDS, ease: 'linear' } : { duration: 0, delay: FADE_SECONDS },
              }}
            />
          );
        })}
        </AnimatePresence>
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/0 to-night/0" />
      <span className="absolute left-4 right-4 bottom-4 flex items-center justify-between gap-2 text-sand">
        <motion.span
          key={slide.label}
          className="font-display text-lg sm:text-xl leading-tight drop-shadow"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {slide.label}
        </motion.span>
        <span className="w-9 h-9 shrink-0 rounded-full glass-dark flex items-center justify-center lg:opacity-0 lg:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </span>
    </Link>
  );
};

const QUICK_PICKS = ['Nandi Hills', 'Coorg', 'Gokarna', 'Chikmagalur'];

const Hero: React.FC<{
  nextTrip?: Group;
  upcoming: Group[];
  places: Place[];
  groupsLoaded: boolean;
  /** Trips and places are both in, so `upcoming` (with any samples) is final. */
  tripsReady: boolean;
  placeCount: number;
  tripCount: number;
  festive: boolean;
}> = ({
  nextTrip,
  upcoming,
  places,
  groupsLoaded,
  tripsReady,
  placeCount,
  tripCount,
  festive,
}) => {
  const liveCount = useLiveCount();
  const reduced = useReducedMotion();

  // Tiles rise in one after another
  const rise = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay: 0.2 + i * 0.12 },
        };

  const stats = [
    placeCount ? { value: placeCount, label: 'places to go' } : null,
    // A zero here reads as "nobody uses this"; the empty next-trip card speaks for that case instead
    groupsLoaded && tripCount > 0 ? { value: tripCount, label: tripCount === 1 ? 'trip leaving soon' : 'trips leaving soon' } : null,
    liveCount !== null ? { value: liveCount, label: 'online now', live: true } : null,
  ].filter(Boolean) as { value: number; label: string; live?: boolean }[];

  const seatsShown = nextTrip ? Math.min(nextTrip.current_members, MAX_SEAT_DOTS) : 0;
  // Opening scene (road, car, gathering crew) plays on the first visit of the session
  const intro = useIntroOnce('home:heroIntro');
  const copyRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const seatsPop = SEAT_FILL_START + seatsShown * SEAT_FILL_STEP + 0.2;
  // "Host a trip" gives one small pop right after the seats fill (or as the intro's car parks)
  const hostPop = groupsLoaded && !reduced ? Math.max(seatsPop, intro ? INTRO_POP : 0) : 0;
  const navigate = useNavigate();
  // Shuffled once when the places arrive, so each visit gets a different mix
  const heroTiles = useMemo(() => buildHeroTiles(places), [places]);

  return (
    <section className={`relative overflow-hidden bg-sand pb-16 lg:pb-24 ${festive ? 'pt-36 lg:pt-40' : 'pt-28 lg:pt-32'}`}>
      {/* Soft sunrise glow behind the photos; a breathing diya glow during Diwali */}
      <div
        aria-hidden
        className={`absolute -top-40 right-[-10%] w-[640px] h-[640px] rounded-full pointer-events-none ${festive ? 'diya-glow blur-2xl' : 'bg-accent/15 blur-3xl'}`}
      />
      <div aria-hidden className="absolute bottom-[-20%] left-[-10%] w-[480px] h-[480px] rounded-full bg-sage/15 blur-3xl pointer-events-none" />
      {festive && (
        <>
          {/* Hung just below the floating navbar */}
          <Toran className="absolute left-0 top-[84px] w-full h-14 pointer-events-none" />
          <Embers className="absolute inset-0 w-full h-full pointer-events-none" />
        </>
      )}

      <div className="relative max-w-7xl mx-auto px-page grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
        {/* Copy */}
        <div ref={copyRef} className="lg:col-span-6 relative z-10">
          <HeroIntro
            play={intro}
            container={copyRef}
            from={pillRef}
            to={hostRef}
            proof={proofRef}
            hasProof={travellerCount(upcoming) > 0}
            ready={tripsReady}
          />
          <span ref={pillRef} className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-paper border border-line text-xs font-semibold text-body mb-7 animate-fade-in">
            <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-text flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </span>
            Group getaways from Bengaluru
          </span>

          <SplitHeading
            as="h1"
            onMount
            delay={0.15}
            className="text-display text-ink"
            style={{ fontSize: 'clamp(2.9rem, 5.6vw, 5.5rem)', textWrap: 'wrap' }}
            parts={[{ text: 'Weekend trips.', breakAfter: true }, { text: 'Real people.', accent: true }]}
          />

          <p className="text-body text-lg sm:text-xl leading-relaxed mt-6 max-w-md animate-fade-up delay-500">
            Join a small group heading out this weekend, or host your own. Treks, waterfalls and road trips, all a short drive away.
          </p>

          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up delay-600">
            <Link to="/groups" className="btn-accent group !py-4 !px-7 !text-base">
              Find a trip <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {/* Remounts once trips load, so its pop lands right after the seats fill (or as the intro's car parks) */}
            <span ref={hostRef} className="inline-flex">
              <motion.span
                key={groupsLoaded ? 'loaded' : 'loading'}
                className="inline-flex"
                animate={hostPop ? { scale: [1, 1.07, 1] } : undefined}
                transition={hostPop ? { duration: 0.6, delay: hostPop, ease: EASE } : undefined}
              >
                {/* Same 56px height as "Find a trip" beside it */}
                <LiquidMetalButton
                  label="Host a trip"
                  icon={<Plus className="w-4 h-4" />}
                  width={176}
                  height={56}
                  fontSize={16}
                  onClick={() => navigate('/groups?host=1')}
                />
              </motion.span>
            </span>
          </div>

          {/* Who's already going, then who it's for and why it's safe: one row, so it reads as one reassurance */}
          <div ref={proofRef} className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-5 animate-fade-up delay-600">
            {/* With the intro, the avatars pop in as the gathering crew lands on them */}
            <TravellersProof trips={upcoming} delay={intro ? INTRO_POP - 0.3 : undefined} />
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-sage" /> Free · For SST students · Hosts approve every member
            </p>
          </div>

          {/* Quick picks: a separate group, so set further apart */}
          <div className="flex flex-wrap items-center gap-2 mt-10 animate-fade-up delay-600">
            <span className="text-xs font-semibold text-muted mr-1">Popular:</span>
            {QUICK_PICKS.map((name) => (
              <Link
                key={name}
                to={`/explore?q=${encodeURIComponent(name)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-paper border border-line text-xs font-semibold text-ink hover:border-ink hover:-translate-y-0.5 transition-all"
              >
                <MapPin className="w-3 h-3 text-accent" /> {name}
              </Link>
            ))}
          </div>

          {/* Next trip beside the live numbers, kept off the photos */}
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6 mt-10 pt-8 border-t border-line">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
            >
              <NextTripCard trip={nextTrip} places={places} loaded={groupsLoaded} />
            </motion.div>
            {stats.length > 0 && (
              <div className="flex sm:flex-col flex-wrap gap-x-10 gap-y-4 animate-fade-in">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="font-display text-3xl text-ink leading-none tabular-nums flex items-center gap-2">
                      {s.live && <span className="live-dot" />}
                      {s.value}
                    </p>
                    <p className="text-xs font-semibold text-muted mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Destination grid */}
        <div className="lg:col-span-6 relative">
          <div className="grid grid-cols-2 grid-rows-6 grid-flow-col gap-3 sm:gap-4 h-[440px] sm:h-[560px] lg:h-[620px]">
            {heroTiles.map((t, i) => (
              <motion.div key={i} {...rise(i)} className={t.className}>
                <HeroTile slides={t.slides} index={i} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   NAME MARQUEE — real place names drifting past
   ════════════════════════════════════════ */
const NameMarquee: React.FC<{ names: string[] }> = ({ names }) => {
  if (names.length < 4) return null;
  const row = [...names, ...names];
  return (
    <div className="band-night py-6 overflow-hidden" aria-hidden>
      <div className="flex w-max animate-marquee">
        {row.map((n, i) => (
          <span key={i} className="flex items-center font-display italic text-2xl sm:text-3xl text-sand/90 whitespace-nowrap px-6">
            {n}
            <Sparkles className="w-4 h-4 text-on-night-accent ml-12" />
          </span>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   ACTIVE GROUPS — the departure board, right under the hero
   ════════════════════════════════════════ */
const diwaliTag = (g: Group) => (isDiwaliTrip(g.trip_date) ? 'DIWALI' : undefined);

const ActiveGroups: React.FC<{ groups: Group[]; boardGroups: Group[]; places: Place[]; loaded: boolean; festive: boolean }> = ({
  groups,
  boardGroups,
  places,
  loaded,
  festive,
}) => (
  <section className="py-16 lg:py-20 px-page max-w-7xl mx-auto w-full">
    <div className="flex items-center justify-between gap-6 mb-6">
      <Reveal>
        <p className="section-label">Leaving soon</p>
      </Reveal>
      <Reveal delay={0.1}>
        <Link to="/groups" className="btn-ghost shrink-0 !py-2.5 !px-4">
          See all <ArrowRight className="w-4 h-4" />
        </Link>
      </Reveal>
    </div>

    <Reveal>
      <DepartureBoard groups={boardGroups} places={places} loaded={loaded} tagFor={festive ? diwaliTag : undefined} />
    </Reveal>
  </section>
);

/* ════════════════════════════════════════
   GROUP FLOW — how a trip works, in four icons and no paragraphs
   ════════════════════════════════════════ */
const FLOW = [
  { icon: Compass, label: 'Pick a trip' },
  { icon: ShieldCheck, label: 'Get approved' },
  { icon: Users, label: 'Go together' },
  { icon: Camera, label: 'Story made for you' },
];

const GroupFlow: React.FC = () => {
  const reduced = useReducedMotion();
  const routeRef = useRef<HTMLDivElement>(null);
  // The route draws itself as the band scrolls into view, lighting each step as the line reaches it
  const { scrollYProgress } = useScroll({ target: routeRef, offset: ['start 0.9', 'start 0.35'] });
  const [lit, setLit] = useState(reduced ? FLOW.length : 0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduced) return;
    setLit(v <= 0 ? 0 : Math.min(FLOW.length, Math.floor(v * (FLOW.length - 1) + 0.001) + 1));
  });

  return (
    <section className="px-3 sm:px-5 pb-20 lg:pb-24">
      <div className="relative overflow-hidden rounded-[36px] bg-night grain">
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-accent/25 blur-3xl pointer-events-none" aria-hidden />
        <div className="on-photo relative max-w-7xl mx-auto px-page py-16 sm:py-20 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-14 items-center">
          <div>
            <SplitHeading
              className="text-display text-sand mb-12"
              style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.75rem)' }}
              accentClassName="italic font-medium text-on-night-accent"
              parts={[{ text: "Don't go" }, { text: 'alone.', accent: true }]}
            />

            <div ref={routeRef} className="relative mb-12">
              {/* Dashed route joining the steps (one row on wider screens), with a lit line drawn over it on scroll */}
              <span aria-hidden className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] border-t-2 border-dashed border-white/15" />
              <motion.span
                aria-hidden
                className="hidden sm:block absolute top-8 -mt-px left-[12.5%] right-[12.5%] h-[3px] origin-left rounded-full bg-gradient-to-r from-accent to-marigold shadow-[0_0_12px_rgba(242,165,22,0.7)]"
                style={{ scaleX: reduced ? 1 : scrollYProgress }}
              />
              <Reveal stagger={0.12} className="relative grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-10">
                {FLOW.map(({ icon: Icon, label }, i) => {
                  const on = i < lit;
                  return (
                    <RevealItem key={label} className="flex flex-col items-center text-center">
                      <span
                        className={`relative w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                          on ? 'bg-night-soft border-marigold/70 shadow-[0_0_28px_-4px_rgba(242,165,22,0.65)]' : 'bg-night-soft border-white/10'
                        }`}
                      >
                        <Icon className={`w-7 h-7 transition-colors duration-500 ${on ? 'text-diya' : 'text-on-night-accent/45'}`} />
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      </span>
                      <p className={`mt-4 font-semibold text-sm sm:text-base transition-colors duration-500 ${on ? 'text-sand' : 'text-sand/55'}`}>{label}</p>
                    </RevealItem>
                  );
                })}
              </Reveal>
            </div>

            <Reveal delay={0.2} className="flex flex-wrap gap-3">
              <Link to="/groups" className="btn-primary">
                <Users className="w-4 h-4" /> Find a trip
              </Link>
              <Link to="/groups?host=1" className="btn-ghost">
                <Plus className="w-4 h-4" /> Host a trip
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="flex justify-center lg:justify-end pr-6 sm:pr-10">
            <StoryPhoneMock />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   PLACES — the count, a search box and four picks
   ════════════════════════════════════════ */
const TOP_CATEGORIES = 6;

const FeaturedPlaces: React.FC<{ places: Place[]; allPlaces: Place[]; total: number; festive: boolean; trips: Group[] }> = ({
  places,
  allPlaces,
  total,
  festive,
  trips,
}) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const displayPlaces: PlaceCardData[] = places.length > 0 ? places.slice(0, 4) : SEED_PLACES;
  // The categories with the most real places, busiest first
  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    allPlaces.forEach((p) => p.category && counts.set(p.category, (counts.get(p.category) || 0) + 1));
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORIES)
      .map(([name, count]) => ({ name, count, Icon: categoryIcon(name) }));
  }, [allPlaces]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    else navigate('/explore');
  };

  return (
    <section className="pb-24 px-page max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 lg:gap-16 mb-12">
        {festive ? (
          // During Diwali the count sits inside a rangoli that draws itself around it
          <Reveal className="flex flex-col items-center w-fit">
            <div className="relative w-[280px] sm:w-[360px] aspect-square grid place-items-center">
              <Rangoli className="absolute inset-0 w-full h-full pointer-events-none" />
              <p className="relative text-display text-ink leading-none" style={{ fontSize: 'clamp(3.25rem, 6.5vw, 5.25rem)' }}>
                {total ? <Counter value={total} /> : <span className="inline-block w-24 h-16 align-middle rounded-xl bg-line/70 animate-pulse" aria-label="Loading" />}
              </p>
            </div>
            <p className="section-label mt-2">Places to go</p>
          </Reveal>
        ) : (
          <Reveal>
            <p className="text-display text-ink leading-none" style={{ fontSize: 'clamp(3.75rem, 9vw, 7rem)' }}>
              {total ? <Counter value={total} /> : <span className="inline-block w-32 h-20 align-middle rounded-xl bg-line/70 animate-pulse" aria-label="Loading" />}
            </p>
            <p className="section-label mt-3">Places to go</p>
          </Reveal>
        )}

        {/* Beside the count: a prompt, the busiest categories as one-tap filters, then search */}
        <Reveal delay={0.15} className="w-full lg:max-w-xl">
          <h2 className="text-display text-ink leading-[1.05]" style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>
            Where to this <span className="accent-word">weekend?</span>
          </h2>
          <p className="text-body text-base sm:text-lg leading-relaxed mt-4 max-w-md">
            Spots around Bengaluru, sent in and checked by students. Pick a mood, or search for something specific.
          </p>

          {topCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {topCategories.map(({ name, count, Icon }) => (
                <Link
                  key={name}
                  to={`/explore?category=${encodeURIComponent(name)}`}
                  className="group inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-paper border border-line text-sm font-semibold text-ink hover:border-ink hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="w-4 h-4 text-accent-text" />
                  {name}
                  <span className="min-w-6 h-6 px-1.5 rounded-full bg-stone text-xs font-bold text-muted flex items-center justify-center tabular-nums transition-colors group-hover:bg-ink group-hover:text-sand">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <form onSubmit={handleSearch} className="mt-6 flex items-center gap-2 pl-5 pr-2 py-2 bg-paper border border-line-strong rounded-full card-shadow focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(16,42,46,0.08)] transition-all" role="search">
            <Search className="w-5 h-5 text-muted shrink-0" />
            <input
              id="home-search"
              type="text"
              placeholder="Trails, waterfalls, cafés…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-muted text-base font-medium py-2.5 focus:outline-none"
              aria-label="Search places"
            />
            <button type="submit" className="btn-primary !py-3 !px-5" aria-label="Search">
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </Reveal>
      </div>

      <Reveal stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPlaces.map((place) => (
          <RevealItem key={place.id} className="h-full">
            <PlaceCard place={place} groupCount={groupsForPlace(trips, place.id).length} />
          </RevealItem>
        ))}
      </Reveal>

      <Reveal delay={0.2} className="mt-12 flex justify-center">
        <Link to="/explore" className="btn-ghost">
          Explore all <ArrowRight className="w-4 h-4" />
        </Link>
      </Reveal>
    </section>
  );
};

/* ════════════════════════════════════════
   HOME PAGE
   ════════════════════════════════════════ */
const PLACE_COUNT_KEY = 'home:placeCount';

export const HomePage: React.FC = () => {
  const [featuredPlaces, setFeaturedPlaces] = useState<Place[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  // Last known count, so the places header has a number before the places request returns
  const [cachedCount, setCachedCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(PLACE_COUNT_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    // Each section fills in as soon as its own request lands; one failing
    // (or slow) request shouldn't hold back or blank the others
    const onError = (err: unknown) => console.error('Failed to load home data:', err);
    placesApi.getPopularWeekend().then((v) => setFeaturedPlaces(v || [])).catch(onError);
    // Dev-only preview: `?demo=1` swaps in sample trips so every trip nudge can be seen without real data
    const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');
    groupsApi
      .getGroups()
      .then((v) => setActiveGroups(demo ? demoTrips() : v || []))
      .catch(onError)
      .finally(() => setGroupsLoaded(true));
    placesApi
      .getPlaces()
      .then((v) => {
        const places = v || [];
        setAllPlaces(places);
        if (places.length) {
          setCachedCount(places.length);
          try {
            localStorage.setItem(PLACE_COUNT_KEY, String(places.length));
          } catch {
            /* storage unavailable */
          }
        }
      })
      .catch(onError)
      .finally(() => setPlacesLoaded(true));
  }, []);

  const upcoming = useMemo(
    () => activeGroups.filter((g) => !isPastTrip(g) && g.status !== 'cancelled' && g.status !== 'completed'),
    [activeGroups]
  );
  const upcomingCount = upcoming.length;

  const nextTrip = useMemo(
    () =>
      [...upcoming]
        .sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime())[0],
    [upcoming]
  );

  // Sample trips top up the board, the travellers row (where the intro's crew lands) and the "new trip"
  // pop-up while the site is new. The next-trip card, stats, place badges and phone bar stay on real trips.
  // Waits for both trips and places (samples are built from places), so samples never flash in ahead of
  // real trips and the intro's crew knows whether there's a travellers row to land on
  const tripsReady = groupsLoaded && placesLoaded;
  const boardGroups = useMemo(
    () => (tripsReady ? withSamples(activeGroups, allPlaces) : activeGroups),
    [tripsReady, activeGroups, allPlaces]
  );
  const boardUpcoming = useMemo(
    () => boardGroups.filter((g) => !isPastTrip(g) && g.status !== 'cancelled' && g.status !== 'completed'),
    [boardGroups]
  );

  const marqueeNames = useMemo(() => allPlaces.slice(0, 14).map((p) => p.name), [allPlaces]);
  // Decided once per visit, so the festive layer never flickers mid-page
  const [festive] = useState(() => isDiwaliSeason());

  return (
    <div className="flex flex-col w-full bg-sand min-h-screen">
      <Hero
        nextTrip={nextTrip}
        upcoming={boardUpcoming}
        places={allPlaces}
        groupsLoaded={groupsLoaded}
        tripsReady={tripsReady}
        placeCount={allPlaces.length || cachedCount}
        tripCount={upcomingCount}
        festive={festive}
      />
      {/* Trips are the USP: the live board, then how a trip works */}
      <ActiveGroups groups={activeGroups} boardGroups={boardGroups} places={allPlaces} loaded={groupsLoaded} festive={festive} />
      <GroupFlow />
      <FeaturedPlaces places={featuredPlaces} allPlaces={allPlaces} total={allPlaces.length || cachedCount} festive={festive} trips={upcoming} />
      <NameMarquee names={marqueeNames} />
      {/* Nudges that keep a trip one tap away */}
      <TripActivityToast trips={boardUpcoming} places={allPlaces} />
      <TripNudgeBar trips={upcoming} />
    </div>
  );
};
