import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import {
  ArrowDown,
  ArrowUpRight,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import type { Place } from '../types';
import { PLACE_CATEGORIES } from '../types';
import { placesApi } from '../api/client';
import { fuzzySearch } from '../utils/fuzzySearch';
import { PlaceCard } from '../components/places/PlaceCard';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal } from '../components/motion/Reveal';
import { Counter } from '../components/motion/Counter';
import { HorizontalScroller } from '../components/motion/HorizontalScroller';
import { fallbackPhoto, optimizeImageUrl, photoProps } from '../utils/images';
import { formatBudget, shortLocation } from '../utils/format';
import { categoryIcon } from '../utils/categories';
import { Chip } from '../components/ui/Chip';
import { useIsStuck } from '../hooks/useIsStuck';

const EASE = [0.22, 1, 0.36, 1] as const;

const BUDGETS = [
  { label: 'Free', val: '0' },
  { label: 'Under ₹500', val: '500' },
  { label: 'Under ₹1,500', val: '1500' },
];

/* ── Large editorial card for the hidden-gems strip ── */
const GemCard = ({ place, index }: { place: Place; index: number }) => {
  const fallback = fallbackPhoto(place.id);
  const location = shortLocation(place.state);
  return (
    <Link
      to={`/places/${place.id}`}
      className="group relative shrink-0 snap-start w-[78vw] sm:w-[380px] lg:w-auto lg:h-[min(48vh,460px)] aspect-[4/5] rounded-[28px] overflow-hidden bg-stone"
    >
      <img
        src={optimizeImageUrl(place.image_url, 900) || fallback}
        alt={place.name}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (!img.src.endsWith(fallback)) img.src = fallback;
        }}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent" />

      <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
        <span className="font-mono text-xs tracking-[0.2em] text-sand/80">{String(index + 1).padStart(2, '0')}</span>
        <span className="badge glass-dark">{place.category}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6">
        {location && (
          <p className="flex items-center gap-1.5 text-label text-sand/75 mb-2">
            <MapPin className="w-3 h-3" /> {location}
          </p>
        )}
        <h3 className="font-display text-sand text-[2rem] leading-[1.05] mb-3 line-clamp-2">{place.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#F4B08A]">{formatBudget(place.budget_tier)}</span>
          <span className="w-11 h-11 rounded-full bg-sand text-ink flex items-center justify-center transition-transform duration-500 group-hover:rotate-45">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const reduced = useReducedMotion();

  // Read filters from URL
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const budgetFilter = searchParams.get('budget') || '';

  // Local search text, written to the URL after a short pause
  const [searchText, setSearchText] = useState(query);
  const lastWrittenQuery = useRef(query);
  const resultsRef = useRef<HTMLElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterBarStuck = useIsStuck(filterBarRef, 108); // top-[6.75rem]

  // Load every place once; search, category and budget all filter locally so we can
  // tell the user when a match exists outside the current filters
  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      try {
        const results = await placesApi.getPlaces();
        setPlaces(results);
      } catch (error) {
        console.error('Failed to fetch places', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  // Debounce search text → URL
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === lastWrittenQuery.current) return;
    const timer = setTimeout(() => {
      lastWrittenQuery.current = trimmed;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (trimmed) params.set('q', trimmed);
          else params.delete('q');
          return params;
        },
        { replace: true }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, setSearchParams]);

  // URL changed from outside (navbar link, back button) → sync the input
  useEffect(() => {
    if (query !== lastWrittenQuery.current) {
      lastWrittenQuery.current = query;
      setSearchText(query);
    }
  }, [query]);

  const { visiblePlaces, isApproximate, hiddenByFilters } = useMemo(() => {
    // Typo-tolerant, ranked by relevance ("chruchstreet" still finds Church Street)
    const search = query ? fuzzySearch(places, query) : { items: places, isApproximate: false };

    const max = budgetFilter ? Number(budgetFilter) : null;
    const inFilters = (p: Place) => {
      if (categoryFilter && p.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (max !== null) {
        const cost = Number(p.budget_tier || 0);
        if (Number.isNaN(cost) || cost > max) return false;
      }
      return true;
    };

    const filtered = search.items.filter(inFilters);
    return {
      visiblePlaces: filtered,
      isApproximate: search.isApproximate,
      // Matches for the search that the category/budget filters are hiding
      hiddenByFilters: query ? search.items.length - filtered.length : 0,
    };
  }, [places, query, categoryFilter, budgetFilter]);

  const hiddenGems = useMemo(() => places.filter((p) => p.is_hidden_gem), [places]);
  // The pinned strip shows hidden gems; until the community has flagged enough, it shows the best-rated places
  const strip = useMemo(() => {
    if (hiddenGems.length >= 3) return { kind: 'gems' as const, items: hiddenGems.slice(0, 8) };
    const rated = places.filter((p) => p.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return { kind: 'rated' as const, items: rated.slice(0, 8) };
  }, [places, hiddenGems]);
  const categoryCount = useMemo(() => new Set(places.map((p) => p.category)).size, [places]);
  const freeCount = useMemo(() => places.filter((p) => !Number(p.budget_tier)).length, [places]);

  const showOutsideFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    params.delete('budget');
    setSearchParams(params);
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => {
    lastWrittenQuery.current = '';
    setSearchText('');
    setSearchParams(new URLSearchParams());
  };

  const hasFilters = Boolean(query || categoryFilter || budgetFilter);
  const showStrip = !hasFilters && !isLoading && strip.items.length >= 3;

  /* ── Hero: the photo shrinks into a rounded frame as you scroll away ── */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const inset = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const clipPath = useMotionTemplate`inset(calc(${inset} * 6%) calc(${inset} * 4%) calc(${inset} * 6%) calc(${inset} * 4%) round calc(${inset} * 40px))`;
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-40%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const scrollToResults = () => resultsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

  return (
    <div className="flex flex-col w-full bg-sand min-h-screen">
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[640px] max-h-[980px] bg-sand">
        <motion.div className="absolute inset-0 overflow-hidden bg-night grain" style={reduced ? undefined : { clipPath }}>
          <motion.img
            {...photoProps('hampi')}
            fetchPriority="high"
            decoding="async"
            style={reduced ? undefined : { y: imageY, scale: imageScale }}
            className="absolute inset-0 w-full h-full object-cover object-[center_60%]"
          />
          <div className="absolute inset-0 hero-scrim" />
        </motion.div>

        <motion.div
          style={reduced ? undefined : { y: textY, opacity: textOpacity }}
          className="on-photo relative z-10 h-full max-w-7xl mx-auto px-page flex flex-col justify-end pb-16 sm:pb-20"
        >
          <SplitHeading
            as="h1"
            onMount
            delay={0.1}
            className="text-display text-sand max-w-4xl"
            style={{ fontSize: 'clamp(3rem, 8vw, 7.25rem)' }}
            accentClassName="italic font-medium text-[#F4B08A]"
            parts={[{ text: 'Find your next' }, { text: 'weekend.', accent: true }]}
          />

          <p className="text-[#E4E8E5] text-lg sm:text-xl max-w-xl mt-6 leading-relaxed animate-fade-up delay-400">
            Admin-verified treks, temples, cafés and viewpoints. Most of them are a single morning's drive away.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              scrollToResults();
            }}
            className="search-bar flex items-center gap-3 pl-5 pr-2 py-2 mt-9 max-w-2xl animate-fade-up delay-500"
            role="search"
          >
            <Search className="w-5 h-5 text-ink/60 shrink-0" />
            <input
              id="explore-search"
              type="text"
              placeholder="Search trails, temples, waterfalls, cafés…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-muted text-[15px] font-medium py-2 focus:outline-none"
              aria-label="Search places"
            />
            {searchText && (
              <button type="button" onClick={() => setSearchText('')} className="p-2 text-muted hover:text-ink transition-colors" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
            <button type="submit" className="btn-primary !py-3 !px-5 max-sm:!hidden">
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-end justify-between gap-6 mt-10 animate-fade-up delay-600">
            <dl className="flex gap-8 sm:gap-12 text-sand">
              {[
                { n: places.length, l: 'Verified places' },
                hiddenGems.length ? { n: hiddenGems.length, l: 'Hidden gems' } : { n: freeCount, l: 'Free to visit' },
                { n: categoryCount, l: 'Categories' },
              ].map((s) => (
                <div key={s.l}>
                  <dd className="font-display text-3xl sm:text-4xl leading-none">{isLoading ? '—' : <Counter value={s.n} />}</dd>
                  <dt className="text-label text-sand/65 mt-2">{s.l}</dt>
                </div>
              ))}
            </dl>
            <button onClick={scrollToResults} className="hidden sm:flex items-center gap-3 text-sand/80 hover:text-white text-sm font-semibold group">
              <span className="relative w-px h-10 bg-white/25 overflow-hidden">
                <span className="absolute inset-x-0 top-0 h-1/2 bg-white animate-scroll-cue" />
              </span>
              Scroll to browse
              <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Sticky filter bar ── */}
      <div ref={filterBarRef} className="sticky z-30 top-[6.75rem] mt-2">
        <div className="sticky-shelf" data-on={filterBarStuck} aria-hidden />
        <div className="max-w-7xl mx-auto px-3 sm:px-page">
          <div className="glass rounded-full card-shadow flex items-center gap-2 pl-2 pr-2 py-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0" data-lenis-prevent-horizontal>
              <Chip group="cat" active={categoryFilter === ''} onClick={() => updateParam('category', '')}>
                All
              </Chip>
              {PLACE_CATEGORIES.map((cat) => {
                const Icon = categoryIcon(cat);
                return (
                  <Chip
                    key={cat}
                    group="cat"
                    active={categoryFilter === cat}
                    onClick={() => updateParam('category', cat === categoryFilter ? '' : cat)}
                  >
                    <Icon className="w-3.5 h-3.5" /> {cat}
                  </Chip>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hidden gems: pinned horizontal story ── */}
      {showStrip && (
        <HorizontalScroller
          className="bg-sand"
          trackClassName="px-page lg:pl-[max(var(--page-gutter),calc((100vw-80rem)/2+var(--page-gutter)))]"
          header={
            <div className="max-w-7xl w-full mx-auto px-page pt-20 lg:pt-0 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="section-label mb-4">{strip.kind === 'gems' ? 'Hidden gems' : 'Top rated'}</p>
                <SplitHeading
                  className="text-display text-ink max-w-2xl"
                  style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4rem)' }}
                  parts={
                    strip.kind === 'gems'
                      ? [{ text: 'Places most people' }, { text: 'drive past.', accent: true }]
                      : [{ text: 'Where travellers keep' }, { text: 'going back.', accent: true }]
                  }
                />
              </div>
              <p className="text-muted max-w-sm leading-relaxed">
                {strip.kind === 'gems'
                  ? 'Quiet corners our community flagged as worth the detour. Keep scrolling to travel the strip.'
                  : 'The highest-rated places on SafarNamma right now. Keep scrolling to travel the strip.'}
              </p>
            </div>
          }
        >
          {strip.items.map((place, i) => (
            <GemCard key={place.id} place={place} index={i} />
          ))}
        </HorizontalScroller>
      )}

      {/* ── Results ── */}
      <section ref={resultsRef} className="max-w-7xl mx-auto w-full px-page pt-20 pb-28 flex-grow scroll-mt-40">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <p className="section-label mb-4">{categoryFilter || (query ? 'Search results' : 'All places')}</p>
            <h2 className="text-display text-ink" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}>
              {isLoading ? (
                'Loading places…'
              ) : (
                <>
                  {visiblePlaces.length} {visiblePlaces.length === 1 ? 'place' : 'places'}
                  {query && <span className="accent-word"> for “{query}”</span>}
                </>
              )}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label text-muted mr-1">Budget</span>
            {BUDGETS.map((b) => (
              <Chip key={b.val} group="budget" active={budgetFilter === b.val} onClick={() => updateParam('budget', budgetFilter === b.val ? '' : b.val)}>
                {b.label}
              </Chip>
            ))}
            {hasFilters && (
              <button onClick={clearAll} className="ml-2 text-sm font-bold text-accent-text hover:underline underline-offset-4">
                Clear all
              </button>
            )}
          </div>
        </Reveal>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[22px] overflow-hidden bg-paper border border-line">
                <div className="skeleton aspect-[4/3]" style={{ borderRadius: 0 }} />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : visiblePlaces.length === 0 ? (
          <Reveal className="card grid md:grid-cols-2 overflow-hidden">
            <div className="relative min-h-[260px] md:min-h-[420px]">
              <img {...photoProps('omBeach', '(min-width: 768px) 50vw, 100vw')} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              {hiddenByFilters > 0 ? (
                <>
                  <p className="section-label mb-4">Almost</p>
                  <h3 className="font-display text-3xl text-ink mb-3">Not in {categoryFilter || 'this budget'}</h3>
                  <p className="text-muted mb-8 max-w-sm">
                    We found {hiddenByFilters} {hiddenByFilters === 1 ? 'place' : 'places'} for “{query}” outside your current filters.
                  </p>
                  <button onClick={showOutsideFilters} className="btn-primary self-start">
                    Show {hiddenByFilters === 1 ? 'it' : 'them'}
                  </button>
                </>
              ) : query ? (
                <>
                  <p className="section-label mb-4">No match</p>
                  <h3 className="font-display text-3xl text-ink mb-3">Nothing matches “{query}”</h3>
                  <p className="text-muted mb-8 max-w-sm">
                    Check the spelling, try fewer words, or search by area or category, like “lake” or “Jayanagar”.
                  </p>
                  <button onClick={clearAll} className="btn-primary self-start">
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="section-label mb-4">Nothing here yet</p>
                  <h3 className="font-display text-3xl text-ink mb-3">No places fit these filters</h3>
                  <p className="text-muted mb-8 max-w-sm">New places are added by the community every week. Know one? Add it.</p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={clearAll} className="btn-primary">
                      Reset filters
                    </button>
                    <Link to="/submit" className="btn-ghost">
                      Submit a place
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        ) : (
          <>
            {isApproximate && (
              <p className="mb-6 text-sm text-body">
                No exact match for <span className="text-ink font-semibold">“{query}”</span>. Showing the closest places.
              </p>
            )}
            {hiddenByFilters > 0 && (
              <p className="mb-6 text-sm text-muted">
                {hiddenByFilters} more {hiddenByFilters === 1 ? 'match' : 'matches'} outside your filters.{' '}
                <button onClick={showOutsideFilters} className="font-bold text-accent-text hover:underline underline-offset-4">
                  Show all
                </button>
              </p>
            )}
            <motion.div layout={!reduced} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout" initial={false}>
                {visiblePlaces.map((place, i) => (
                  <motion.div
                    key={place.id}
                    layout={!reduced}
                    initial={reduced ? false : { opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.8, ease: EASE, delay: (i % 4) * 0.07 }}
                    className="h-full"
                  >
                    <PlaceCard place={place} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </section>

      {/* ── Closing call to contribute ── */}
      <section className="max-w-7xl mx-auto w-full px-page pb-28">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-night min-h-[360px] flex items-end grain">
          <img {...photoProps('coorgFalls', '(min-width: 1024px) 80vw, 100vw')} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent" />
          <div className="on-photo relative z-10 p-8 sm:p-14 max-w-2xl">
            <p className="section-label mb-4">Know a spot?</p>
            <h2 className="font-display text-sand text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] mb-4">
              The best places on this map were sent in by <span className="italic text-[#F4B08A]">people like you.</span>
            </h2>
            <p className="text-[#D8DEDA] mb-8 max-w-md">Share a waterfall, a temple or a café you love. We check it, then it goes live for everyone.</p>
            <Link to="/submit" className="btn-primary">
              Share a hidden gem <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
