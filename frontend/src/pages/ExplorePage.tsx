import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Filter, Sparkles, Compass, X, ArrowRight } from 'lucide-react';
import type { Place } from '../types';
import { PLACE_CATEGORIES } from '../types';
import { placesApi } from '../api/client';
import { cn } from '../utils/cn';

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Read filters from URL
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const budgetFilter = searchParams.get('budget') || '';

  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      try {
        const filters: Record<string, string | number> = {};
        if (categoryFilter) filters.category = categoryFilter;
        if (budgetFilter) filters.maxPrice = parseInt(budgetFilter);

        let results = await placesApi.getPlaces(filters);

        if (query) {
          const q = query.toLowerCase();
          results = results.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q)
          );
        }

        setPlaces(results);
      } catch (error) {
        console.error('Failed to fetch places', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [query, categoryFilter, budgetFilter]);

  const updateSearch = (newQuery: string) => {
    const params = new URLSearchParams(searchParams);
    if (newQuery) params.set('q', newQuery);
    else params.delete('q');
    setSearchParams(params);
  };

  const updateCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    if (cat) params.set('category', cat);
    else params.delete('category');
    setSearchParams(params);
  };

  const categories = PLACE_CATEGORIES;

  return (
    <div className="flex flex-col w-full bg-[#070A0D] text-white min-h-screen">
      {/* ═══════════════════════════════════════════════════════
          CINEMATIC PANORAMIC HEADER: "The Ridge Overlook"
          Real-life cinematic photography, dark gradient masks,
          and integrated search bar.
          ═══════════════════════════════════════════════════════ */}
      <div className="relative w-full h-80 sm:h-96 overflow-hidden flex items-end">
        {/* Real-life visual */}
        <img
          src="/cinematic/ghats_summit.jpg"
          alt="Western Ghats Trailhead"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.05]"
        />

        {/* Dark Vignettes & Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A0D] via-[#070A0D]/50 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A0D]/90 via-transparent to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-[2px] bg-[#F59E0B]" />
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#F59E0B]">
              OVERLAND WAYPOINTS • KARNATAKA & GHATS
            </span>
          </div>

          <h1 className="font-sans text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-2">
            Explore Curated Trails
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm max-w-xl mb-6 drop-shadow-md">
            Secret waterfalls, dawn summits, heritage stone forts, and artisan road-trip stops.
          </p>

          {/* In-header Search Input */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F59E0B]" />
            <input
              type="text"
              placeholder="Search trails, peaks, categories or vibes..."
              value={query}
              onChange={(e) => updateSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#F59E0B] shadow-2xl transition-all"
            />
            {query && (
              <button
                onClick={() => updateSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CATEGORY PILLS BAR
          ═══════════════════════════════════════════════════════ */}
      <div className="border-y border-white/10 bg-[#0A1118]/80 backdrop-blur-md sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => updateCategory('')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                categoryFilter === ''
                  ? 'bg-[#F59E0B] text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              All Trails
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => updateCategory(cat === categoryFilter ? '' : cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#F59E0B] text-black shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT (Sidebar + Luxury Cards Grid)
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12 py-10 flex flex-col md:flex-row gap-8 flex-grow">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden flex justify-between items-center w-full">
          <div className="text-xs text-gray-400">
            Showing <span className="font-bold text-white">{places.length}</span> destinations
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 border border-white/20 px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white"
          >
            <Filter className="w-3.5 h-3.5 text-[#F59E0B]" /> Filters
          </button>
        </div>

        {/* Filter Sidebar */}
        <aside
          className={cn(
            'w-full md:w-64 flex-shrink-0 flex flex-col gap-6',
            isFilterOpen ? 'block' : 'hidden md:flex'
          )}
        >
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-3xl p-6 sticky top-36 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#F59E0B]" /> Filter Trails
              </h2>
              {(query || categoryFilter || budgetFilter) && (
                <button
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="text-xs font-bold text-[#F59E0B] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Category Radio Group */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                  Category
                </label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <input
                      type="radio"
                      name="category"
                      checked={categoryFilter === ''}
                      onChange={() => updateCategory('')}
                      className="w-4 h-4 text-[#F59E0B] focus:ring-[#F59E0B] border-white/20 bg-transparent"
                    />
                    <span className="text-xs text-gray-300 font-medium">All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={categoryFilter === cat}
                        onChange={() => updateCategory(cat)}
                        className="w-4 h-4 text-[#F59E0B] focus:ring-[#F59E0B] border-white/20 bg-transparent"
                      />
                      <span className="text-xs text-gray-300 font-medium">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Budget Filter */}
              <div className="pt-4 border-t border-white/10">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                  Max Budget
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Free', val: '0' },
                    { label: '₹500', val: '500' },
                    { label: '₹1500', val: '1500' },
                  ].map((b) => (
                    <button
                      key={b.val}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        if (budgetFilter === b.val) params.delete('budget');
                        else params.set('budget', b.val);
                        setSearchParams(params);
                      }}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        budgetFilter === b.val
                          ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:border-[#F59E0B]/50 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content: Place Cards */}
        <main className="flex-grow flex flex-col min-w-0">
          <div className="hidden md:flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {categoryFilter ? `${categoryFilter}` : 'All Destinations'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Authentic trail notes, GPS pins, and visiting hours
              </p>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Showing <span className="font-bold text-[#F59E0B]">{places.length}</span> spots
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-96 rounded-3xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/5 border border-white/10 rounded-3xl text-center px-4">
              <div className="w-16 h-16 bg-white/10 text-[#F59E0B] rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No trails found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6 text-xs">
                No spots matched your current search filters. Try clearing criteria to explore more road trips.
              </p>
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {places.map((place) => (
                <Link
                  key={place.id}
                  to={`/places/${place.id}`}
                  className="group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden flex flex-col hover:border-[#F59E0B]/50 transition-all duration-500 hover:-translate-y-1.5 shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={place.image_url || 'https://images.unsplash.com/photo-1506461883276-594543d04e12'}
                      alt={place.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1506461883276-594543d04e12';
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-black/30" />

                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#F59E0B] border border-white/10">
                      {place.category}
                    </div>

                    {place.is_hidden_gem && (
                      <div className="absolute top-4 left-4 bg-[#F59E0B] text-black font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1 shadow-md">
                        <Sparkles className="w-3 h-3" /> Hidden Gem
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1 mb-1.5">
                        {place.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>{place.distance_km} KM from Bengaluru</span>
                        <span>•</span>
                        <span>{place.duration}</span>
                      </p>
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-4">
                        {place.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        {place.budget_tier ? `~₹${place.budget_tier}` : 'Free Entry'}
                      </span>
                      <span className="text-gray-400">{place.best_season || 'All Seasons'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
