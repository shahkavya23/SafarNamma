import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Mountain,
  Droplets,
  Coffee,
  Eye,
  Tent,
} from 'lucide-react';
import { placesApi, groupsApi } from '../api/client';
import type { Place, Group } from '../types';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { PlaceCard } from '../components/places/PlaceCard';
import { useLiveCount } from '../context/PresenceContext';

/* ─── Real Karnataka location images ─── */
const HERO_IMAGE = '/cinematic/nandi_hills_hero.jpg';
const GHATS_IMAGE = '/cinematic/western_ghats_road.jpg';
const FRIENDS_IMAGE = '/cinematic/friends_convoy.jpg';

/* ─── Seeded place cards (fallback when API empty) ─── */
const SEED_PLACES = [
  {
    id: 'skandagiri',
    name: 'Skandagiri Sunrise Trek',
    category: 'Trek',
    distance_km: 62,
    duration: '4 hrs',
    image_url: '/cinematic/skandagiri_sunrise.jpg',
    is_hidden_gem: true,
    description: 'A moonlit trek to the granite peak above Chikkaballapur, rewarded by a sea of clouds at sunrise.',
    best_season: 'Oct – Feb',
    budget_tier: '500',
  },
  {
    id: 'coorg-falls',
    name: 'Abbey Falls, Coorg',
    category: 'Waterfall',
    distance_km: 248,
    duration: '5.5 hrs',
    image_url: '/cinematic/coorg_waterfall.jpg',
    is_hidden_gem: false,
    description: 'Coffee and spice plantations frame a 70-ft cascade into emerald pools. Best after monsoon rains.',
    best_season: 'Jul – Oct',
    budget_tier: '1200',
  },
  {
    id: 'nandi',
    name: 'Nandi Hills at Dawn',
    category: 'Viewpoint',
    distance_km: 58,
    duration: '1.5 hrs',
    image_url: '/cinematic/nandi_hills_hero.jpg',
    is_hidden_gem: true,
    description: 'The winding hill road to Nandi crests above a golden fog-sea every morning between October and March.',
    best_season: 'Oct – Mar',
    budget_tier: '300',
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats Monsoon Drive',
    category: 'Road Trip',
    distance_km: 120,
    duration: '3 hrs',
    image_url: '/cinematic/western_ghats_road.jpg',
    is_hidden_gem: true,
    description: 'A serpentine highway through rain-drenched emerald forest. Waterfalls appear around every bend.',
    best_season: 'Jun – Sep',
    budget_tier: '800',
  },
];

/* ─── Category quick filters ─── */
const CATEGORIES = [
  { label: 'Treks', icon: Mountain, value: 'Treks' },
  { label: 'Cafe', icon: Coffee, value: 'Cafe' },
  { label: 'Lakes', icon: Droplets, value: 'Lakes' },
  { label: 'Adventure', icon: Tent, value: 'Adventure' },
  { label: 'Monuments', icon: Eye, value: 'Monuments' },
];

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ════════════════════════════════════════
   HERO OPENING SECTION
   Apple-style: One word at a time, then the world opens up
   ════════════════════════════════════════ */
const HeroOpening: React.FC<{ onSearch: (q: string) => void }> = ({ onSearch }) => {
  const [phase, setPhase] = useState(0);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const liveCount = useLiveCount();

  useEffect(() => {
    // Apple rhythm: word 1 → word 2 → word 3 → full hero reveals
    const timings = [300, 900, 1500, 2400];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setPhase(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    else navigate('/explore');
  };

  return (
    <section className="relative w-full min-h-screen overflow-hidden">
      {/* ── Background image (reveals with phase) ── */}
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms] ease-out"
        style={{ opacity: phase >= 4 ? 1 : 0 }}
      >
        <img
          src={HERO_IMAGE}
          alt="Nandi Hills at dawn"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E10] via-[#0C0E10]/50 to-[#0C0E10]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0E10]/80 via-transparent to-transparent" />
      </div>

      {/* ── Dark canvas (always present) ── */}
      <div className="absolute inset-0 bg-[#0C0E10]" style={{ opacity: phase >= 4 ? 0 : 1, transition: 'opacity 2s ease-out', pointerEvents: 'none' }} />

      {/* ── The opening word sequence (Apple "hello" equivalent) ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-24">

        {/* Phase 1: First word */}
        {phase === 1 && (
          <span
            className="text-display text-white animate-scale-in"
            style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}
          >
            Escape.
          </span>
        )}

        {/* Phase 2: Second word */}
        {phase === 2 && (
          <div className="flex flex-col items-center gap-2 animate-scale-in">
            <span className="text-display text-white" style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}>Escape.</span>
            <span className="text-display text-[#F59E0B]" style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}>Discover.</span>
          </div>
        )}

        {/* Phase 3: Third word */}
        {phase === 3 && (
          <div className="flex flex-col items-center gap-2 animate-scale-in">
            <span className="text-display text-white" style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}>Escape.</span>
            <span className="text-display text-[#F59E0B]" style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}>Discover.</span>
            <span className="text-display text-[#14B8A6]" style={{ fontSize: 'clamp(80px, 14vw, 160px)' }}>Together.</span>
          </div>
        )}

        {/* Phase 4+: Full hero content */}
        {phase >= 4 && (
          <div className="w-full max-w-4xl mx-auto">
            {/* Live presence pill (real open tabs + baseline, from /api/presence) */}
            {liveCount !== null && (
              <div className="flex justify-center mb-8 animate-fade-in delay-0">
                <div className="glass inline-flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-full">
                  <span className="live-dot" />
                  <span className="text-label text-[11px] text-[#CBD5E1]">
                    <span className="font-mono text-white">{liveCount}</span> explorers online now
                  </span>
                </div>
              </div>
            )}

            {/* Eyebrow */}
            <div className="section-label mb-6 animate-fade-up delay-0 justify-center">
              SafarNamma · Bengaluru's Adventure Directory
            </div>

            {/* Headline */}
            <h1
              className="text-display text-center text-white mb-6 animate-scale-in delay-60"
              style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}
            >
              Your City Has{' '}
              <span className="text-gradient-amber">Secrets.</span>
              <br />
              We Have the Map.
            </h1>

            {/* Subheading */}
            <p className="text-center text-[#CBD5E1] text-lg max-w-xl mx-auto mb-10 animate-fade-up delay-120 leading-relaxed">
              Discover hidden trails, cafes, and viewpoints near Bengaluru.
              <br />
              Form a convoy. Don't go alone.
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="search-bar flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto mb-6 animate-fade-up delay-180"
            >
              <Search className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <input
                type="text"
                placeholder="Search trails, waterfalls, cafes near Bengaluru…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-[#64748B] text-sm focus:outline-none"
              />
              <button type="submit" className="btn-primary py-2 px-5 text-xs shrink-0">
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick filter pills */}
            <div className="flex flex-wrap gap-2 justify-center animate-fade-up delay-240">
              {CATEGORIES.map(({ label, icon: Icon, value }) => (
                <button
                  key={value}
                  onClick={() => navigate(`/explore?category=${encodeURIComponent(value)}`)}
                  className="btn-ghost py-2 px-4 text-xs flex items-center gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5 text-[#F59E0B]" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {phase >= 4 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-fade-in delay-500">
          <span className="text-label text-[#475569] text-[10px]">Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border border-[#334155] flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-[#F59E0B] rounded-full animate-bounce" />
          </div>
        </div>
      )}
    </section>
  );
};

/* ════════════════════════════════════════
   STAT STRIP
   ════════════════════════════════════════ */
const StatStrip: React.FC = () => {
  const { ref, visible } = useScrollReveal();
  const places = useCountUp(200, 1600, visible);
  const explorers = useCountUp(1400, 1800, visible);
  const convoys = useCountUp(85, 1400, visible);

  return (
    <div ref={ref} className="w-full border-y border-[rgba(255,255,255,0.06)] py-12">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {[
          { value: places, suffix: '+', label: 'Verified Places' },
          { value: explorers, suffix: '+', label: 'Weekend Explorers' },
          { value: convoys, suffix: '', label: 'Active Convoys' },
        ].map(({ value, suffix, label }, i) => (
          <div
            key={label}
            className={`reveal ${visible ? 'visible' : ''}`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div className="text-display text-white mb-1" style={{ fontSize: '3rem' }}>
              {value}{suffix}
            </div>
            <div className="text-label text-[#475569]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   FEATURED PLACES SECTION
   ════════════════════════════════════════ */
const FeaturedPlaces: React.FC<{ places: any[] }> = ({ places }) => {
  const { ref, visible } = useScrollReveal();
  const displayPlaces = places.length > 0 ? places.slice(0, 4) : SEED_PLACES;

  return (
    <section ref={ref} className="py-24 px-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className={`reveal ${visible ? 'visible' : ''} mb-14`}>
        <div className="section-label">✦ Handpicked This Weekend</div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h2 className="text-display text-white" style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}>
            Places Google<br />
            <span className="text-gradient-amber">Doesn't Know Yet.</span>
          </h2>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F59E0B] hover:gap-3 transition-all duration-200 shrink-0"
          >
            Explore All 200+ Places <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {displayPlaces.map((place, i) => (
          <PlaceCard key={place.id} place={place} index={i} visible={visible} />
        ))}
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   COMMUNITY SECTION (full-bleed photo)
   Apple-style: One powerful image + one idea
   ════════════════════════════════════════ */
const CommunitySection: React.FC = () => {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="relative w-full min-h-[70vh] overflow-hidden flex items-center">
      {/* Background */}
      <img
        src={FRIENDS_IMAGE}
        alt="Friends on a convoy trip in Karnataka"
        className="absolute inset-0 w-full h-full object-cover object-center brightness-50"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0C0E10]/95 via-[#0C0E10]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E10] via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-20">
        <div className="max-w-xl">
          <div className={`reveal ${visible ? 'visible' : ''}`}>
            <div className="section-label">🏕️ The Basecamp · Community Convoys</div>
          </div>

          <h2
            className={`text-display text-white mt-4 mb-6 reveal ${visible ? 'visible' : ''}`}
            style={{ fontSize: 'clamp(36px, 5vw, 60px)', transitionDelay: '80ms' }}
          >
            Don't Go Alone.
            <br />
            <span className="text-[#14B8A6]">Find Your Convoy.</span>
          </h2>

          <p className={`text-[#CBD5E1] text-lg leading-relaxed mb-8 reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '160ms' }}>
            Join weekend trips organized by students and explorers from your city.
            Split fuel, share memories, make friends you didn't know you needed.
          </p>

          <div className={`flex flex-wrap gap-4 reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '240ms' }}>
            <Link to="/groups" className="btn-teal">
              <Users className="w-4 h-4" />
              Browse Active Convoys
            </Link>
            <Link to="/groups" className="btn-ghost">
              Create Your Own
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   GROUP CARD
   ════════════════════════════════════════ */
const GroupCard: React.FC<{ group: Group; index: number; visible: boolean }> = ({ group, index, visible }) => {
  const spotsLeft = group.max_members - group.current_members;
  const isFull = spotsLeft === 0;
  const isLow = spotsLeft > 0 && spotsLeft <= 3;

  return (
    <Link
      to={`/groups/${group.id}`}
      className={`group-card block bg-[#141820] border border-[rgba(255,255,255,0.08)] rounded-[20px] overflow-hidden card-shadow teal-accent reveal ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Date strip */}
      <div className="bg-[#0D9488]/20 border-b border-[rgba(13,148,136,0.20)] px-5 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-label text-[#14B8A6]">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(group.trip_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        {/* Spot status */}
        {isFull ? (
          <span className="badge badge-danger">Full</span>
        ) : isLow ? (
          <span className="badge badge-amber">🔥 {spotsLeft} left</span>
        ) : (
          <span className="badge badge-success">{spotsLeft} open</span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Destination chip */}
        {group.custom_destination && (
          <div className="badge badge-teal mb-3">{group.custom_destination}</div>
        )}

        <h4 className="text-heading text-white text-base mb-4 line-clamp-2 group-hover:text-[#14B8A6] transition-colors duration-200">
          {group.title}
        </h4>

        <div className="space-y-2 text-xs text-[#64748B] mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="line-clamp-1">Meet: {group.meeting_area}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{group.current_members}/{group.max_members} members</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <span className="font-mono text-sm font-semibold text-white">₹{group.estimated_cost}<span className="text-[#64748B] font-normal text-xs">/person</span></span>
          <span className="text-xs font-semibold text-[#14B8A6] flex items-center gap-1">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

/* ════════════════════════════════════════
   ACTIVE GROUPS SECTION
   ════════════════════════════════════════ */
const ActiveGroups: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="py-24 px-6 max-w-7xl mx-auto w-full">
      <div className={`reveal ${visible ? 'visible' : ''} mb-14`}>
        <div className="section-label">🚗 Active This Weekend</div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h2 className="text-display text-white" style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}>
            Real Trips.<br />
            <span className="text-[#14B8A6]">Real People.</span>
          </h2>
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#14B8A6] hover:gap-3 transition-all duration-200 shrink-0"
          >
            See All Convoys <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group, i) => (
            <GroupCard key={group.id} group={group} index={i} visible={visible} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-20 reveal ${visible ? 'visible' : ''}`}>
          <div className="w-16 h-16 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#0D9488]" />
          </div>
          <p className="text-[#64748B] mb-4">No convoys planned yet.</p>
          <Link to="/groups" className="btn-teal">
            Be the First to Organize One
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
};

/* ════════════════════════════════════════
   HOW IT WORKS
   ════════════════════════════════════════ */
const HowItWorks: React.FC = () => {
  const { ref, visible } = useScrollReveal();

  const steps = [
    { icon: '🔍', title: 'Discover', desc: 'Browse 200+ admin-verified hidden spots and weekend getaways near you.' },
    { icon: '👥', title: 'Connect', desc: 'Find a convoy or create your own. Private, safe, and student-verified.' },
    { icon: '🗺️', title: 'Explore', desc: 'Go together, share your story, and add to the community.' },
  ];

  return (
    <section ref={ref} className="py-24 border-y border-[rgba(255,255,255,0.06)]">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className={`reveal ${visible ? 'visible' : ''}`}>
          <div className="section-label justify-center">The Process</div>
          <h2 className="text-display text-white mt-4 mb-16" style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}>
            Simple. Safe. <span className="text-gradient-amber">Unforgettable.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
          {/* Connector line */}
          <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.20)] to-transparent" />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`reveal ${visible ? 'visible' : ''} flex flex-col items-center`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="w-20 h-20 rounded-2xl bg-[#141820] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mb-6 text-4xl card-shadow">
                {step.icon}
              </div>
              <h3 className="text-heading text-white text-xl mb-3">{step.title}</h3>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className={`mt-16 reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: '360ms' }}>
          <Link to="/explore" className="btn-primary px-10 py-4">
            Start Exploring Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   WESTERN GHATS INTERLUDE
   A full-width photo moment — one image, one feeling
   ════════════════════════════════════════ */
const GhatsInterlude: React.FC = () => {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="relative w-full h-[50vh] sm:h-[60vh] overflow-hidden">
      <img
        src={GHATS_IMAGE}
        alt="Monsoon road through the Western Ghats"
        className={`w-full h-full object-cover object-center transition-all duration-[1200ms] ${visible ? 'scale-100 brightness-75' : 'scale-105 brightness-50'}`}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E10] via-transparent to-[#0C0E10]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className={`text-display text-center text-white px-6 transition-all duration-[1000ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ fontSize: 'clamp(24px, 4vw, 48px)', transitionDelay: '300ms' }}
        >
          Every great story starts with a<br />
          <span className="text-gradient-amber">road you've never taken.</span>
        </p>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   FOOTER CTA
   ════════════════════════════════════════ */
const FooterCta: React.FC = () => {
  const { ref, visible } = useScrollReveal();
  return (
    <section ref={ref} className="py-28 text-center px-6">
      <div className={`reveal ${visible ? 'visible' : ''}`}>
        <h2 className="text-display text-white mb-6" style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}>
          Your Next Weekend<br />
          <span className="text-gradient-amber">Starts Here.</span>
        </h2>
        <p className="text-[#64748B] text-lg mb-10 max-w-lg mx-auto">
          Join 1,400+ explorers discovering the best of Karnataka, one weekend at a time.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/explore" className="btn-primary px-8 py-4 text-sm">
            Explore Hidden Gems
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/groups" className="btn-ghost px-8 py-4 text-sm">
            Find a Convoy
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════
   HOME PAGE
   ════════════════════════════════════════ */
export const HomePage: React.FC = () => {
  const [featuredPlaces, setFeaturedPlaces] = useState<Place[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [placesData, groupsData] = await Promise.all([
          placesApi.getPopularWeekend(),
          groupsApi.getGroups(),
        ]);
        setFeaturedPlaces(placesData || []);
        setActiveGroups((groupsData || []).slice(0, 3));
      } catch (err) {
        console.error('Failed to load home data:', err);
      }
    };
    load();
  }, []);

  const handleSearch = (q: string) => {
    if (q.trim()) navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <main className="flex flex-col w-full bg-[#0C0E10] text-white min-h-screen">
      {/* 1. The Opening (Apple-style word reveal) */}
      <HeroOpening onSearch={handleSearch} />

      {/* 2. Trust strip */}
      <StatStrip />

      {/* 3. Featured places */}
      <FeaturedPlaces places={featuredPlaces} />

      {/* 4. Community photo moment */}
      <CommunitySection />

      {/* 5. Active groups */}
      <ActiveGroups groups={activeGroups} />

      {/* 6. Western Ghats interlude photo */}
      <GhatsInterlude />

      {/* 7. How it works */}
      <HowItWorks />

      {/* 8. Footer CTA */}
      <FooterCta />
    </main>
  );
};
