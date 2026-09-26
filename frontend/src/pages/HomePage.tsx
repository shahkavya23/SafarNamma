import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Users,
  Compass,
  UserPlus,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';
import { placesApi, groupsApi } from '../api/client';
import type { Place, Group } from '../types';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { PlaceCard, type PlaceCardData } from '../components/places/PlaceCard';
import { useLiveCount } from '../context/PresenceContext';
import { Reveal, RevealItem } from '../components/motion/Reveal';
import { SplitHeading } from '../components/motion/SplitHeading';
import { ParallaxImage } from '../components/motion/ParallaxImage';
import { Counter } from '../components/motion/Counter';
import { photoProps, photoSrc } from '../utils/images';
import { categoryIcon } from '../utils/categories';
import { DepartureBoard } from '../components/groups/DepartureBoard';

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

const QUICK_CATEGORIES = ['Nature', 'Cafes & Restaurants', 'Games & Adventure', 'Monuments', 'Religious Places'];

/* ════════════════════════════════════════
   HERO — a light, editorial opening on sandstone
   Headline and search on the left, a drifting photo collage on the right,
   joined by a route that draws itself.
   ════════════════════════════════════════ */
const Hero: React.FC<{ placeCount: number }> = ({ placeCount }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const liveCount = useLiveCount();
  const reduced = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bigY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const smallY = useTransform(scrollYProgress, [0, 1], ['0%', '-34%']);
  const cardY = useTransform(scrollYProgress, [0, 1], ['0%', '-60%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);

  // The route rides on the photos: its start pin moves with the small photo, its end pin with the
  // big one (each at that photo's parallax speed), and the line stretches between them.
  // Offsets are in the SVG's 600×660 units: photo height × its drift % (big: 80% × 12%, small: 52% × 34%).
  const BIG_DRIFT = -0.8 * 0.12 * 660;
  const SMALL_DRIFT = -0.52 * 0.34 * 660;
  const startPinY = useTransform(scrollYProgress, (p) => (reduced ? 0 : p * SMALL_DRIFT));
  const endPinY = useTransform(scrollYProgress, (p) => (reduced ? 0 : p * BIG_DRIFT));
  const routePath = useTransform(scrollYProgress, (p) => {
    const s = reduced ? 0 : p * SMALL_DRIFT;
    const b = reduced ? 0 : p * BIG_DRIFT;
    const m = (s + b) / 2;
    return `M 70 ${600 + s} C 140 ${470 + s}, 60 ${360 + m}, 190 ${300 + m} S 430 ${250 + b}, 470 ${120 + b}`;
  });
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    else navigate('/explore');
  };

  // Photos wipe open from the bottom, one after another
  const wipe = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { clipPath: 'inset(100% 0% 0% 0% round 36px)' },
          animate: { clipPath: 'inset(0% 0% 0% 0% round 36px)' },
          transition: { duration: 1.3, ease: EASE, delay },
        };

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-sand pt-32 lg:pt-36 pb-20 lg:pb-28">
      {/* Faint contour lines — a nod to the map */}
      <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none text-stone-deep/60" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <ellipse key={i} cx="1080" cy="420" rx={180 + i * 90} ry={120 + i * 62} fill="none" stroke="currentColor" strokeWidth="1" transform={`rotate(-14 1080 420)`} />
        ))}
      </svg>

      <div className="relative max-w-7xl mx-auto px-page grid lg:grid-cols-12 gap-14 lg:gap-8 items-center">
        {/* Copy */}
        <motion.div className="lg:col-span-6 relative z-10" style={reduced ? undefined : { y: textY, opacity: textOpacity }}>
          {liveCount !== null && (
            <div className="inline-flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-full bg-paper border border-line mb-8 animate-fade-in">
              <span className="live-dot" />
              <span className="text-xs font-semibold text-body">
                <span className="text-ink tabular-nums">{liveCount}</span> explorers online now
              </span>
            </div>
          )}

          <p className="section-label mb-6 animate-fade-up">Bengaluru's weekend directory</p>

          <SplitHeading
            as="h1"
            onMount
            delay={0.15}
            className="text-display text-ink"
            style={{ fontSize: 'clamp(2.9rem, 5.5vw, 5.5rem)', textWrap: 'wrap' }}
            parts={[{ text: 'Your city has', breakAfter: true }, { text: 'secrets.', accent: true, breakAfter: true }, { text: 'We have the map.' }]}
          />

          <p className="text-body text-lg sm:text-xl max-w-lg mt-7 leading-relaxed animate-fade-up delay-500">
            Hidden trails, cafés and viewpoints near Bengaluru, plus people to go with. Don't go alone.
          </p>

          <form onSubmit={handleSearch} className="flex items-center gap-2 pl-5 pr-2 py-2 mt-9 max-w-xl bg-paper border border-line-strong rounded-full card-shadow focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(16,42,46,0.08)] transition-all animate-fade-up delay-600" role="search">
            <Search className="w-5 h-5 text-muted shrink-0" />
            <input
              id="home-search"
              type="text"
              placeholder="Search trails, waterfalls, cafés…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-muted text-[15px] font-medium py-2.5 focus:outline-none"
              aria-label="Search places"
            />
            <button type="submit" className="btn-primary !py-3 !px-5">
              Explore <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap gap-2 mt-6 animate-fade-up delay-700">
            {QUICK_CATEGORIES.map((value) => {
              const Icon = categoryIcon(value);
              return (
                <button key={value} onClick={() => navigate(`/explore?category=${encodeURIComponent(value)}`)} className="chip !py-2 !text-[13px]">
                  <Icon className="w-3.5 h-3.5 text-accent-text" />
                  {value}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Collage */}
        <div className="lg:col-span-6 relative h-[440px] sm:h-[560px] lg:h-[660px]">
          {/* Route drawing between the photos */}
          <svg aria-hidden viewBox="0 0 600 660" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible">
            <motion.path
              d={routePath}
              vectorEffect="non-scaling-stroke"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeDasharray="2 9"
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: EASE, delay: 1 }}
            />
            {[
              [70, 600],
              [470, 120],
            ].map(([x, y], i) => (
              <motion.g key={i} style={{ y: i === 0 ? startPinY : endPinY }}>
                <motion.g initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 1 + i * 2, ease: EASE }} style={{ transformOrigin: `${x}px ${y}px` }}>
                  <circle cx={x} cy={y} r="13" fill="var(--color-accent)" opacity="0.18" />
                  <circle cx={x} cy={y} r="6" fill="var(--color-accent)" stroke="var(--color-sand)" strokeWidth="2.5" />
                </motion.g>
              </motion.g>
            ))}
          </svg>

          {/* Big photo */}
          <motion.div className="absolute right-0 top-0 w-[78%] h-[80%]" style={reduced ? undefined : { y: bigY }}>
            <motion.div {...wipe(0.2)} className="w-full h-full rounded-[36px] overflow-hidden bg-stone card-shadow-hover">
              <img {...photoProps('nandi', '(min-width: 1024px) 40vw, 80vw')} fetchPriority="high" className="w-full h-full object-cover" />
            </motion.div>
            <span className="absolute right-5 top-5 badge glass-dark">
              <MapPin className="w-3 h-3" /> Nandi Hills · 61 km
            </span>
          </motion.div>

          {/* Small photo */}
          <motion.div className="absolute left-0 bottom-0 w-[44%] h-[52%] z-10" style={reduced ? undefined : { y: smallY }}>
            <motion.div {...wipe(0.5)} className="w-full h-full rounded-[28px] overflow-hidden bg-stone ring-[10px] ring-sand card-shadow-hover">
              <img {...photoProps('skandagiri', '(min-width: 1024px) 22vw, 44vw')} className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* Floating card */}
          <motion.div
            className="absolute left-[6%] top-[8%] z-30"
            style={reduced ? undefined : { y: cardY }}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 1.1 }}
          >
            <div className="bg-paper/95 backdrop-blur rounded-2xl border border-line card-shadow-hover p-4 pr-6 animate-float">
              <p className="text-label text-muted mb-1">Mapped so far</p>
              <p className="font-display text-4xl text-ink leading-none">
                {placeCount ? (
                  <Counter value={placeCount} />
                ) : (
                  <span className="inline-block w-14 h-9 align-middle rounded-md bg-line/70 animate-pulse" aria-label="Loading" />
                )}
              </p>
              <p className="text-xs text-muted mt-1.5">verified places around Bengaluru</p>
            </div>
          </motion.div>
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
            <Sparkles className="w-4 h-4 text-[#F4B08A] ml-12" />
          </span>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   DISCOVERY COUNTER
   The real number of verified places, a route that draws itself,
   and a ticker of the newest finds: the map keeps growing.
   ════════════════════════════════════════ */
interface LatestFind {
  id: number;
  name: string;
  category: string;
}

const ROUTE_PATH = 'M 20 78 C 140 18, 250 112, 380 64 S 610 14, 760 66 S 920 96, 980 40';
const PIN_STOPS = [0, 0.2, 0.4, 0.6, 0.8];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DiscoveryCounter: React.FC<{ count: number; latest: LatestFind[] }> = ({ count, latest }) => {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  // Pin positions along the route, measured from the SVG path itself
  const pathRef = useRef<SVGPathElement>(null);
  const [pins, setPins] = useState<{ x: number; y: number }[]>([]);
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPins(
      [...PIN_STOPS, 1].map((t) => {
        const pt = path.getPointAtLength(total * t);
        return { x: pt.x, y: pt.y };
      })
    );
  }, []);

  // "Just mapped" ticker: cycles through the newest places
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  useEffect(() => {
    if (latest.length < 2) return;
    const reduced = prefersReducedMotion();
    let swap: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      if (reduced) {
        setTickerIndex((i) => (i + 1) % latest.length);
        return;
      }
      setIsLeaving(true);
      swap = setTimeout(() => {
        setTickerIndex((i) => (i + 1) % latest.length);
        setIsLeaving(false);
      }, 400);
    }, 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(swap);
    };
  }, [latest.length]);

  const current = latest[tickerIndex];
  const nextPin = pins[pins.length - 1];

  return (
    <section ref={ref} className="relative pt-28 pb-8 px-6 overflow-hidden bg-sand">
      <div className="max-w-5xl mx-auto text-center">
        <div className={`reveal ${visible ? 'visible' : ''}`}>
          <p className="section-label">The map keeps growing</p>
        </div>

        <div className={`text-display text-ink mt-6 reveal ${visible ? 'visible' : ''}`} style={{ fontSize: 'clamp(5rem, 12vw, 9.5rem)', transitionDelay: '80ms' }}>
          <Counter value={count} />
        </div>
        <p className={`text-label text-muted mt-2 reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '140ms' }}>
          places uncovered so far
        </p>

        <p className={`text-body text-lg leading-relaxed max-w-xl mx-auto mt-8 reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '220ms' }}>
          …and we're still looking. Every week, explorers uncover more corners of Bengaluru nobody told you about.
        </p>

        <div className="relative mt-12 mx-auto max-w-4xl" aria-hidden>
          <svg viewBox="0 0 1000 120" className="w-full h-auto overflow-visible">
            <defs>
              <mask id="sn-route-mask">
                <path
                  d={ROUTE_PATH}
                  pathLength={1}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="sn-route-draw"
                  style={{ strokeDasharray: 1, strokeDashoffset: visible ? 0 : 1 }}
                />
              </mask>
            </defs>

            <path ref={pathRef} d={ROUTE_PATH} fill="none" stroke="#E0561F" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="6 10" strokeLinecap="round" mask="url(#sn-route-mask)" />

            {pins.slice(0, -1).map((p, i) => (
              <g
                key={i}
                className="sn-pin"
                style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.4)', transitionDelay: `${300 + i * 320}ms` }}
              >
                <circle cx={p.x} cy={p.y} r={11} fill="#E0561F" fillOpacity={0.15} />
                <circle cx={p.x} cy={p.y} r={5} fill="#E0561F" />
              </g>
            ))}

            {nextPin && (
              <g
                className="sn-pin"
                style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.4)', transitionDelay: `${300 + PIN_STOPS.length * 320}ms` }}
              >
                <circle cx={nextPin.x} cy={nextPin.y} r={14} fill="#F2ECE3" stroke="#102A2E" strokeWidth={1.5} strokeDasharray="3 3" className="sn-pin-pulse" />
                <text x={nextPin.x} y={nextPin.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#102A2E" fontFamily="JetBrains Mono, monospace">
                  ?
                </text>
              </g>
            )}
          </svg>
        </div>

        {current && (
          <div className={`mt-10 inline-flex items-center gap-3 bg-paper border border-line rounded-full pl-4 pr-5 py-2.5 max-w-full card-shadow reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '360ms' }}>
            <span className="live-dot shrink-0" />
            <span className="text-label text-muted shrink-0">Just mapped</span>
            <span className="w-px h-4 bg-line-strong shrink-0" />
            <Link
              key={current.id}
              to={`/places/${current.id}`}
              className={`min-w-0 truncate text-sm font-semibold text-ink hover:text-accent-text transition-all duration-400 ${isLeaving ? 'opacity-0 -translate-y-2' : 'animate-fade-up'}`}
            >
              {current.name}
              <span className="text-muted font-normal"> · {current.category}</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   FEATURED PLACES
   ════════════════════════════════════════ */
const FeaturedPlaces: React.FC<{ places: Place[]; total: number }> = ({ places, total }) => {
  const displayPlaces: PlaceCardData[] = places.length > 0 ? places.slice(0, 4) : SEED_PLACES;

  return (
    <section className="py-24 px-page max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
        <div>
          <Reveal>
            <p className="section-label mb-5">Handpicked this weekend</p>
          </Reveal>
          <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }} parts={[{ text: 'Places Google' }, { text: "doesn't know yet.", accent: true }]} />
        </div>
        <Reveal delay={0.2}>
          <Link to="/explore" className="btn-ghost shrink-0">
            {total ? `Explore all ${total} places` : 'Explore all places'} <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>

      <Reveal stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPlaces.map((place) => (
          <RevealItem key={place.id} className="h-full">
            <PlaceCard place={place} />
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
};

/* ════════════════════════════════════════
   COMMUNITY — one photo, one idea
   ════════════════════════════════════════ */
const CommunitySection: React.FC = () => (
  // Bottom gap keeps the rounded card off the full-bleed Ghats photo that follows
  <section className="px-3 sm:px-5 pb-20 lg:pb-24">
    <div className="relative rounded-[36px] overflow-hidden min-h-[78vh] flex items-end bg-night grain">
      <ParallaxImage {...photoProps('friends')} strength={18} frameClassName="!absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-night/95 via-night/55 to-night/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent" />

      <div className="on-photo relative z-10 max-w-7xl mx-auto w-full px-page py-16 sm:py-20">
        <div className="max-w-xl">
          <Reveal>
            <p className="section-label mb-5">Travel groups</p>
          </Reveal>
          <SplitHeading
            className="text-display text-sand mb-6"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.75rem)' }}
            accentClassName="italic font-medium text-[#F4B08A]"
            parts={[{ text: "Don't go alone." }, { text: 'Find your people.', accent: true }]}
          />
          <Reveal delay={0.2}>
            <p className="text-[#D8DEDA] text-lg leading-relaxed mb-9">
              Join weekend trips organised by students and explorers from your city. Split fuel, share the playlist, come back with friends.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/groups" className="btn-primary">
                <Users className="w-4 h-4" /> Browse trips
              </Link>
              <Link to="/groups?host=1" className="btn-ghost">
                Start your own
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  </section>
);

/* ════════════════════════════════════════
   ACTIVE GROUPS
   ════════════════════════════════════════ */
const ActiveGroups: React.FC<{ groups: Group[]; places: Place[]; loaded: boolean }> = ({ groups, places, loaded }) => (
  <section className="py-20 lg:py-24 px-page max-w-7xl mx-auto w-full">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
      <div>
        <Reveal>
          <p className="section-label mb-5">Trips coming up</p>
        </Reveal>
        <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }} parts={[{ text: 'Real trips.' }, { text: 'Real people.', accent: true }]} />
      </div>
      <Reveal delay={0.2}>
        <Link to="/groups" className="btn-ghost shrink-0">
          See all trips <ArrowRight className="w-4 h-4" />
        </Link>
      </Reveal>
    </div>

    <Reveal>
      <DepartureBoard groups={groups} places={places} loaded={loaded} />
    </Reveal>
  </section>
);

/* ════════════════════════════════════════
   GHATS INTERLUDE — one image, one line
   ════════════════════════════════════════ */
const GhatsInterlude: React.FC = () => (
  <section className="relative w-full h-[62vh] sm:h-[78vh] overflow-hidden bg-night">
    <ParallaxImage {...photoProps('ghatsRoad')} strength={22} frameClassName="!absolute inset-0" className="opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/20 to-night/70" />
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <SplitHeading
        as="h2"
        className="text-display text-center text-sand max-w-4xl"
        style={{ fontSize: 'clamp(2rem, 5vw, 4.25rem)' }}
        accentClassName="italic font-medium text-[#F4B08A]"
        parts={[{ text: 'Every great story starts with a' }, { text: "road you've never taken.", accent: true }]}
      />
    </div>
  </section>
);

/* ════════════════════════════════════════
   HOW IT WORKS — a real sequence, so it's numbered
   ════════════════════════════════════════ */
const HowItWorks: React.FC = () => {
  const steps = [
    { icon: Compass, title: 'Discover', desc: 'Browse admin-verified spots and weekend getaways within a day of the city.' },
    { icon: UserPlus, title: 'Connect', desc: 'Join a trip or start your own. Hosts approve who joins, so chats stay private.' },
    { icon: RouteIcon, title: 'Go', desc: 'Head out together, then add the places you loved for the next traveller.' },
  ];

  return (
    <section className="py-28 px-page bg-sand">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Reveal>
            <p className="section-label mb-5">How it works</p>
          </Reveal>
          <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }} parts={[{ text: 'Simple. Safe.' }, { text: 'Unforgettable.', accent: true }]} />
        </div>

        <Reveal stagger={0.14} className="grid sm:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealItem key={step.title} className="card p-8 h-full">
                <div className="flex items-center justify-between mb-10">
                  <span className="w-12 h-12 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-display text-5xl text-stone-deep leading-none">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="font-display text-2xl text-ink mb-3">{step.title}</h3>
                <p className="text-muted leading-relaxed">{step.desc}</p>
              </RevealItem>
            );
          })}
        </Reveal>

        <Reveal delay={0.3} className="mt-14 flex justify-center">
          <Link to="/explore" className="btn-primary !px-8 !py-4">
            Start exploring <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
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
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  // Last known count, so the hero card has a number before the places request returns
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
    groupsApi
      .getGroups()
      .then((v) => setActiveGroups(v || []))
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
      .catch(onError);
  }, []);

  const latestFinds = useMemo(
    () =>
      [...allPlaces]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5)
        .map(({ id, name, category }) => ({ id, name, category })),
    [allPlaces]
  );

  const marqueeNames = useMemo(() => allPlaces.slice(0, 14).map((p) => p.name), [allPlaces]);

  return (
    <div className="flex flex-col w-full bg-sand min-h-screen">
      <Hero placeCount={allPlaces.length || cachedCount} />
      {/* Trips are the USP, so the board sits right under the hero */}
      <ActiveGroups groups={activeGroups} places={allPlaces} loaded={groupsLoaded} />
      <NameMarquee names={marqueeNames} />
      {allPlaces.length > 0 && <DiscoveryCounter count={allPlaces.length} latest={latestFinds} />}
      <FeaturedPlaces places={featuredPlaces} total={allPlaces.length} />
      <CommunitySection />
      <GhatsInterlude />
      <HowItWorks />
    </div>
  );
};
