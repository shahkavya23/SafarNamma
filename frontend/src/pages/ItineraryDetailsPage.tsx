import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  MapPin,
  Route as RouteIcon,
  Trash2,
  Plus,
  ArrowLeft,
  Navigation,
  Share2,
  Users,
  Car,
  Footprints,
  Bus,
  Star,
  ChevronDown,
  ArrowUpRight,
  MapPinOff,
  Lock,
} from 'lucide-react';
import type { Itinerary, ItineraryStop } from '../types';
import { itinerariesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ItineraryMap, getStopCoords } from '../components/itineraries/ItineraryMap';
import { AddStopModal } from '../components/itineraries/AddStopModal';
import { ItineraryHero } from '../components/itineraries/ItineraryHero';
import { StopFacts } from '../components/itineraries/StopFacts';
import { startGroupUrl, UNLOCK_RULE } from '../components/itineraries/unlock';

// Same choices as the Add Stop modal
const TRANSPORT_OPTIONS = ['Walking', 'Cab / Auto', 'Metro / Bus', 'Drive / Bike'];

export const ItineraryDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const reduced = useReducedMotion();

  // Silent refreshes keep the page mounted, so the hero stays open and the scroll position holds
  const fetchItinerary = async ({ silent = false } = {}) => {
    if (!id) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await itinerariesApi.getById(id);
      setItinerary(data);
    } catch (err) {
      console.error('Failed to fetch itinerary details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, [id]);

  const handleAddStop = async (stopData: {
    destination_id: number;
    order_index: number;
    transport_mode?: string;
    note?: string;
    conflict_mode?: 'shift' | 'replace';
  }) => {
    if (!itinerary) return;
    await itinerariesApi.addStop(itinerary.id, stopData);
    await fetchItinerary({ silent: true });
  };

  // Map pin click: highlight the stop and bring its card into view
  const handleMapSelectStop = (stop: ItineraryStop) => {
    setActiveStopId(stop.id);
    document
      .getElementById(`stop-card-${stop.id}`)
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!window.confirm('Remove this waypoint from the itinerary?')) return;
    try {
      await itinerariesApi.deleteStop(stopId);
      await fetchItinerary({ silent: true });
    } catch (err) {
      console.error('Failed to delete stop:', err);
      alert('Could not delete stop.');
    }
  };

  const handleChangeTransport = async (stopId: number, mode: string) => {
    const previous = itinerary;
    // Optimistic update so the picker doesn't flicker back while saving
    setItinerary((it) =>
      it ? { ...it, stops: it.stops?.map((s) => (s.id === stopId ? { ...s, transport_mode: mode } : s)) } : it
    );
    try {
      await itinerariesApi.updateStop(stopId, { transport_mode: mode });
    } catch (err) {
      console.error('Failed to update transit mode:', err);
      setItinerary(previous);
      alert('Could not update the next leg.');
    }
  };

  const handleDeleteItinerary = async () => {
    if (!itinerary) return;
    if (!window.confirm('Are you sure you want to permanently delete this itinerary blueprint?')) return;
    try {
      await itinerariesApi.delete(itinerary.id);
      navigate('/itineraries');
    } catch (err) {
      console.error('Failed to delete itinerary:', err);
      alert('Could not delete itinerary.');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback('Link copied to clipboard!');
    setTimeout(() => setCopyFeedback(''), 2500);
  };

  // Navigates to Groups page with pre-filled route destination so host can start a group (which also unlocks a locked route)
  const handleStartGroup = () => {
    if (!itinerary) return;
    navigate(startGroupUrl(itinerary));
  };

  const getTransportIcon = (mode?: string | null) => {
    const lower = (mode || '').toLowerCase();
    if (lower.includes('walk')) return <Footprints className="w-3.5 h-3.5" />;
    if (lower.includes('bus') || lower.includes('metro')) return <Bus className="w-3.5 h-3.5" />;
    return <Car className="w-3.5 h-3.5" />;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-night min-h-screen py-24 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-sand">Loading itinerary blueprint…</p>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="w-full bg-night min-h-screen py-32 text-center">
        <h2 className="font-display text-2xl text-white mb-3">Itinerary not found</h2>
        <Link to="/itineraries" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Itineraries
        </Link>
      </div>
    );
  }

  const sortedStops = [...(itinerary.stops || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return (
    <div className="w-full bg-sand min-h-screen pb-20">
      {/* ── Top Bar / Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-6 flex items-center justify-between">
        <Link
          to="/itineraries"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Itineraries
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="btn-ghost text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copyFeedback || 'Share Route'}
          </button>

          {isAdmin && (
            <button
              onClick={handleDeleteItinerary}
              className="btn-ghost !text-[#B42318] !border-[#B42318]/30 hover:!bg-[#F8DEDA]/50 text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Itinerary
            </button>
          )}
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <ItineraryHero
          itinerary={itinerary}
          stops={sortedStops}
          onStartGroup={handleStartGroup}
          isLocked={itinerary.is_locked}
        />
      </div>

      {itinerary.is_locked ? (
        /* ── Locked: the map and stops stay hidden until the user hosts a group on this route ── */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-paper min-h-[420px]">
            <div aria-hidden className="absolute inset-0 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 blur-md opacity-60 pointer-events-none select-none">
              <div className="lg:col-span-6 rounded-2xl bg-[linear-gradient(135deg,#dfe7e2,#f3ede4)] min-h-[200px]" />
              <div className="lg:col-span-6 space-y-4">
                {Array.from({ length: Math.min(Math.max(itinerary.stop_count, 3), 5) }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-line p-4">
                    <span className="w-16 h-16 rounded-xl bg-stone shrink-0" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-2.5 w-24 rounded-full bg-stone" />
                      <span className="block h-4 w-2/3 rounded-full bg-line" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center text-center px-6 py-16 min-h-[420px]">
              <span className="w-14 h-14 rounded-2xl bg-night text-diya flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-6 h-6" />
              </span>
              <h2 className="font-display text-3xl text-ink mb-2">
                {itinerary.stop_count} {itinerary.stop_count === 1 ? 'stop' : 'stops'} waiting to be unlocked
              </h2>
              <p className="text-base text-ink/80 max-w-md leading-relaxed">{UNLOCK_RULE}</p>
              <p className="text-xs text-muted max-w-md mt-2">
                3 routes are free for everyone. Hosting a group needs an SST student account, and the route opens as soon as your group is created.
              </p>
              <button onClick={handleStartGroup} className="btn-primary mt-6 flex items-center gap-2 py-3 px-6">
                <Users className="w-4 h-4" /> Create group to unlock
              </button>
            </div>
          </div>
        </div>
      ) : (
      /* ── Main Layout: Map & Interactive Stop Timeline ── */
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Map (Sticky on Desktop) */}
        <div className="lg:col-span-6 lg:sticky lg:top-28">
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <div className="flex items-center justify-between mb-3 px-2 pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-ink">Route map</span>
              </div>
              <span className="text-xs text-muted">Select a pin for details</span>
            </div>

            <ItineraryMap
              stops={sortedStops}
              activeStopId={activeStopId}
              onSelectStop={handleMapSelectStop}
              className="h-[460px]"
            />
          </div>
        </div>

        {/* Right Column: Step-by-Step Waypoint Stops */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-ink">
              Stops <span className="text-muted font-normal text-lg">({sortedStops.length})</span>
            </h2>

            {isAdmin && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stop
              </button>
            )}
          </div>

          {sortedStops.length === 0 ? (
            <div className="bg-paper rounded-3xl p-8 border border-line text-center">
              <RouteIcon className="w-10 h-10 text-muted/50 mx-auto mb-3" />
              <p className="font-display text-lg text-ink mb-1">No stops added to this route yet</p>
              <p className="text-xs text-muted mb-4">
                Add places from Explore to chart the sequence from start to finish.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setIsAddStopOpen(true)}
                  className="btn-primary mx-auto text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Stop
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Connecting line behind timeline cards */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-line hidden sm:block" />

              {sortedStops.map((stop, index) => {
                const dest = stop.destination;
                const isActive = activeStopId === stop.id;
                const isLast = index === sortedStops.length - 1;

                return (
                  <div key={stop.id} id={`stop-card-${stop.id}`} className="relative sm:pl-14 scroll-mt-28">
                    {/* Number Badge */}
                    <div
                      className={`hidden sm:flex absolute left-3 top-5 -ml-3.5 w-7 h-7 rounded-full font-bold text-xs items-center justify-center border-2 border-paper transition-colors z-10 ${
                        isActive ? 'bg-accent text-white' : 'bg-ink text-sand'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Stop Card */}
                    <div
                      onClick={() => setActiveStopId(isActive ? null : stop.id)}
                      className={`group/stop bg-paper rounded-2xl p-4 sm:p-5 border transition-colors duration-200 cursor-pointer ${
                        isActive ? 'border-accent' : 'border-line hover:border-ink/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Thumbnail */}
                        {dest?.image_url && (
                          <div className="relative w-full sm:w-28 h-40 sm:h-28 rounded-2xl overflow-hidden shrink-0">
                            <img
                              src={dest.image_url}
                              alt={dest.name}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/stop:scale-110"
                            />
                            <span className="absolute top-2 left-2 sm:hidden bg-ink/80 text-sand text-[10px] font-bold rounded-full px-2 py-0.5 backdrop-blur-sm">
                              Stop {index + 1}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider font-bold text-accent-text bg-accent-soft ring-1 ring-accent/30 rounded-full px-2 py-0.5 align-middle">
                                Stop #{index + 1} · {dest?.category || 'Destination'}
                              </span>
                              {!!dest?.rating && dest.rating > 0 && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold text-ink bg-stone rounded-full px-1.5 py-px align-middle">
                                  <Star className="w-2.5 h-2.5 fill-[#F5A524] text-[#F5A524]" />
                                  {dest.rating.toFixed(1)}
                                </span>
                              )}
                              {!getStopCoords(stop) &&
                                (isAdmin && dest ? (
                                  <Link
                                    to={`/edit/${dest.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Add a location for this place"
                                    className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-stone hover:text-accent-text rounded-full px-1.5 py-px align-middle transition-colors"
                                  >
                                    <MapPinOff className="w-2.5 h-2.5" /> Not on map
                                  </Link>
                                ) : (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-stone rounded-full px-1.5 py-px align-middle">
                                    <MapPinOff className="w-2.5 h-2.5" /> Not on map
                                  </span>
                                ))}
                              <h3 className="font-display text-lg sm:text-xl leading-snug text-ink hover:text-accent transition-colors break-words">
                                {dest ? (
                                  <Link
                                    to={`/places/${dest.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {dest.name}
                                  </Link>
                                ) : (
                                  `Stop ${index + 1}`
                                )}
                              </h3>
                            </div>

                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStop(stop.id);
                                }}
                                className="shrink-0 -mr-1.5 -mt-1 p-1.5 rounded-full hover:bg-[#FDF3F1] text-muted hover:text-[#B42318] transition-colors"
                                title="Remove stop"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Extra info only once the card is opened */}
                          <AnimatePresence initial={false}>
                            {isActive && (
                              <motion.div
                                key="details"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3">
                                  {dest && <StopFacts place={dest} />}

                                  {/* Stop Note (e.g. Dinner place / Special tip) */}
                                  {stop.note && (
                                    <div className="bg-[#F5ECE0] text-[#733E2B] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 mb-2">
                                      <span>💡</span>
                                      <span>{stop.note}</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex flex-wrap items-center gap-2 pt-3 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStopId(isActive ? null : stop.id);
                              }}
                              className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-ink text-sand hover:bg-ink/85 transition-colors"
                              aria-expanded={isActive}
                            >
                              {isActive ? 'Less info' : 'More info'}
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {dest && (
                              <Link
                                to={`/places/${dest.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border border-line bg-paper text-ink hover:border-accent hover:text-accent transition-colors"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" /> Place details
                              </Link>
                            )}
                            {dest?.map_link && (
                              <a
                                href={dest.map_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border border-line bg-paper text-ink hover:border-accent hover:text-accent transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Directions
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transit Leg Indicator to Next Stop */}
                      {!isLast && (stop.transport_mode || isAdmin) && (
                        <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-xs text-muted min-w-0">
                          <span className="shrink-0 p-1 rounded-md bg-stone text-accent transition-transform duration-500 group-hover/stop:translate-x-1">
                            {getTransportIcon(stop.transport_mode)}
                          </span>
                          {isAdmin ? (
                            <label className="flex flex-1 min-w-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span className="shrink-0 whitespace-nowrap">Next leg:</span>
                              <select
                                value={stop.transport_mode || ''}
                                onChange={(e) => handleChangeTransport(stop.id, e.target.value)}
                                className="min-w-0 flex-1 sm:flex-none sm:max-w-md truncate bg-sand/40 border border-line rounded-full px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
                                aria-label="Transit to next stop"
                              >
                                {!stop.transport_mode && <option value="" disabled>Choose…</option>}
                                {TRANSPORT_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                                {stop.transport_mode && !TRANSPORT_OPTIONS.includes(stop.transport_mode) && (
                                  <option value={stop.transport_mode}>{stop.transport_mode}</option>
                                )}
                              </select>
                            </label>
                          ) : (
                            <span className="min-w-0 leading-relaxed">
                              Next leg:{' '}
                              <strong className="text-ink font-semibold">{stop.transport_mode}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Card: Ready to travel */}
          <div className="bg-paper rounded-2xl p-5 border border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="font-display text-xl text-ink">Want to do this trip?</h4>
              <p className="text-xs text-muted mt-1">
                Create a travel group with this exact route attached and invite friends.
              </p>
            </div>
            <button
              onClick={handleStartGroup}
              className="btn-primary shrink-0 flex items-center gap-2 py-2.5 px-5"
            >
              <Users className="w-4 h-4" /> Start Trip Group
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Admin Add Stop Modal */}
      <AddStopModal
        isOpen={isAddStopOpen}
        onClose={() => setIsAddStopOpen(false)}
        nextOrderIndex={sortedStops.length + 1}
        existingStops={sortedStops}
        onAddStop={handleAddStop}
      />
    </div>
  );
};

export default ItineraryDetailsPage;

