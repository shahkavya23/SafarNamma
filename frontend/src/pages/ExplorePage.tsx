import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import type { Place } from '../types';
import { PLACE_CATEGORIES } from '../types';
import { placesApi } from '../api/client';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { PlaceCard } from '../components/places/PlaceCard';

const HERO_IMAGE = '/cinematic/skandagiri_sunrise.jpg';

const BUDGETS = [
  { label: 'Free', val: '0' },
  { label: 'Under ₹500', val: '500' },
  { label: 'Under ₹1500', val: '1500' },
];

const pillClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors duration-200 ${
    active
      ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
      : 'bg-transparent text-[#CBD5E1] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.24)] hover:text-white'
  }`;

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { ref: gridRef, visible: gridVisible } = useScrollReveal();

  // Read filters from URL
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const budgetFilter = searchParams.get('budget') || '';

  // Local search text, written to the URL after a short pause
  const [searchText, setSearchText] = useState(query);
  const lastWrittenQuery = useRef(query);

  // Only the category hits the network; text and budget filter locally
  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      try {
        const results = await placesApi.getPlaces(categoryFilter ? { category: categoryFilter } : {});
        setPlaces(results);
      } catch (error) {
        console.error('Failed to fetch places', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [categoryFilter]);

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

  const visiblePlaces = useMemo(() => {
    let results = places;

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (budgetFilter) {
      const max = Number(budgetFilter);
      results = results.filter((p) => {
        const cost = Number(p.budget_tier || 0);
        return !Number.isNaN(cost) && cost <= max;
      });
    }

    return results;
  }, [places, query, budgetFilter]);

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

  return (
    <div className="flex flex-col w-full bg-[#0C0E10] text-white min-h-screen">
      {/* ── Hero ── */}
      <section className="relative w-full min-h-[480px] h-[58vh] overflow-hidden flex items-end">
        <img
          src={HERO_IMAGE}
          alt="Trekkers at the Skandagiri summit above the clouds"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E10] via-[#0C0E10]/55 to-[#0C0E10]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0E10]/80 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 pb-14">
          <div className="section-label animate-fade-up delay-0">Explore · Around Bengaluru</div>

          <h1
            className="text-display text-white mt-4 mb-4 animate-fade-up delay-60"
            style={{ fontSize: 'clamp(40px, 6vw, 76px)' }}
          >
            Find Your Next <span className="text-gradient-amber">Weekend.</span>
          </h1>

          <p className="text-[#CBD5E1] text-lg max-w-xl mb-8 leading-relaxed animate-fade-up delay-120">
            Admin-verified treks, lakes, cafes and viewpoints, most of them a day trip from the city.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="search-bar flex items-center gap-3 px-4 py-3 max-w-2xl animate-fade-up delay-180"
          >
            <Search className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <input
              type="text"
              placeholder="Search trails, waterfalls, cafes…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-[#64748B] text-sm focus:outline-none"
              aria-label="Search places"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="text-[#64748B] hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </section>

      {/* ── Sticky category bar ── */}
      <div className="navbar-glass sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button onClick={() => updateParam('category', '')} className={pillClass(categoryFilter === '')}>
              All
            </button>
            {PLACE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => updateParam('category', cat === categoryFilter ? '' : cat)}
                className={pillClass(categoryFilter === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <section ref={gridRef} className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-12 flex-grow">
        {/* Heading + filter row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="section-label">{categoryFilter || 'All Places'}</div>
            <p className="text-label text-[#64748B] mt-2">
              {isLoading ? 'Loading…' : `${visiblePlaces.length} ${visiblePlaces.length === 1 ? 'place' : 'places'}`}
              {query && <span className="text-[#CBD5E1]"> · “{query}”</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label text-[#64748B] mr-1">Budget</span>
            {BUDGETS.map((b) => (
              <button
                key={b.val}
                onClick={() => updateParam('budget', budgetFilter === b.val ? '' : b.val)}
                className={pillClass(budgetFilter === b.val)}
              >
                {b.label}
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={clearAll}
                className="ml-2 text-xs font-semibold text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[20px] overflow-hidden bg-[#141820] border border-[rgba(255,255,255,0.08)]">
                <div className="skeleton h-56" style={{ borderRadius: 0 }} />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : visiblePlaces.length === 0 ? (
          <div className="glass rounded-[20px] flex flex-col items-center text-center py-20 px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mb-5">
              <Search className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-heading text-white text-xl mb-2">Nothing matches that yet</h3>
            <p className="text-[#64748B] text-sm max-w-sm mb-8">
              Try a broader search or clear your filters. New places are added by the community every week.
            </p>
            <button onClick={clearAll} className="btn-primary">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visiblePlaces.map((place, i) => (
              <PlaceCard key={place.id} place={place} index={Math.min(i, 8)} visible={gridVisible} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
