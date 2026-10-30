import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  MapPin,
  ArrowRight,
  Wallet,
  Route as RouteIcon,
  Trash2,
  Plus,
  ArrowLeft,
  Navigation,
  Sparkles,
  Share2,
  Users,
  CheckCircle2,
  Car,
  Footprints,
  Bus,
  Star,
  ChevronDown,
  ArrowUpRight,
  MapPinOff,
} from 'lucide-react';
import type { Itinerary, ItineraryStop } from '../types';
import { itinerariesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ItineraryMap, getStopCoords } from '../components/itineraries/ItineraryMap';
import { AddStopModal } from '../components/itineraries/AddStopModal';
import { ItineraryHero, readableDuration } from '../components/itineraries/ItineraryHero';
import { StopFacts } from '../components/itineraries/StopFacts';
import ScrollExpandMedia from '../components/ui/scroll-expansion-hero';
import { fallbackPhoto, optimizeImageUrl, photoSrc } from '../utils/images';

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

  // Navigates to Groups page with pre-filled route destination so host can start a group
  const handleStartGroup = () => {
    if (!itinerary) return;
    const stopNames = itinerary.stops?.map((s) => s.destination?.name).filter(Boolean) as string[];
    const routeString = stopNames.length > 0 ? stopNames.join(' ➔ ') : itinerary.title;
    navigate(`/groups?itineraryId=${itinerary.id}&customDestination=${encodeURIComponent(routeString)}`);
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
  const heroMeta = [
    `${sortedStops.length} ${sortedStops.length === 1 ? 'stop' : 'stops'}`,
    readableDuration(itinerary.estimated_duration),
  ].filter(Boolean).join(' · ');

  return (
    <ScrollExpandMedia
      mediaType="image"
      mediaSrc={optimizeImageUrl(itinerary.image_url || undefined, 1920) || fallbackPhoto(itinerary.id)}
      bgImageSrc={photoSrc('ubCityNight')}
      title={itinerary.title}
      date={heroMeta}
      scrollToExpand="Scroll to see the route"
    >
    <div className="w-full bg-sand min-h-screen pb-20">
      {/* ── Top Bar / Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between">
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
          isAdmin={isAdmin}
          onStartGroup={handleStartGroup}
          onAddStop={() => setIsAddStopOpen(true)}
          onSelectStop={handleMapSelectStop}
        />
      </div>

      {/* ── Main Layout: Map & Interactive Stop Timeline ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Map (Sticky on Desktop) */}
        <motion.div
          className="lg:col-span-6 lg:sticky lg:top-24 space-y-4"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="bg-paper rounded-[28px] p-4 border border-line card-shadow">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="relative flex w-4 h-4 items-center justify-center">
                  {!reduced && <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />}
                  <MapPin className="relative w-4 h-4 text-accent" />
                </span>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Interactive Route Map
                </span>
              </div>
              <span className="text-xs text-muted">Click markers for details</span>
            </div>

            <ItineraryMap
              stops={sortedStops}
              activeStopId={activeStopId}
              onSelectStop={handleMapSelectStop}
              className="h-[460px]"
            />
          </div>

          <div className="bg-paper/70 rounded-2xl p-4 border border-line text-xs text-muted leading-relaxed">
            <span className="font-semibold text-ink">💡 Traveler Pro-Tip:</span> Click any waypoint pin to inspect photos, dinner recommendations, and one-tap directions via Google Maps.
          </div>
        </motion.div>

        {/* Right Column: Step-by-Step Waypoint Stops */}
        <div className="lg:col-span-6 space-y-6">
          <motion.div
            className="flex items-center justify-between"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-semibold mb-1">
                Stop by stop
              </span>
              <h2 className="font-display text-2xl sm:text-3xl text-ink">
                The Journey <span className="text-muted font-normal text-xl">({sortedStops.length} stops)</span>
              </h2>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stop
              </button>
            )}
          </motion.div>

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
              {/* Accent line that draws down the timeline as it scrolls into view */}
              <motion.div
                aria-hidden
                className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-accent via-accent/60 to-transparent origin-top hidden sm:block"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: reduced ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }}
              />

              {sortedStops.map((stop, index) => {
                const dest = stop.destination;
                const isActive = activeStopId === stop.id;
                const isLast = index === sortedStops.length - 1;

                return (
                  <div key={stop.id} id={`stop-card-${stop.id}`} className="relative sm:pl-14 scroll-mt-28">
                    {/* Number Badge */}
                    <motion.div
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                      whileInView={{ opacity: 1, scale: isActive ? 1.15 : 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                      className={`hidden sm:flex absolute left-3 top-5 -ml-3.5 w-7 h-7 rounded-full font-bold text-xs items-center justify-center border-2 border-paper transition-colors z-10 ${
                        isActive
                          ? 'bg-accent text-white ring-4 ring-accent/20'
                          : 'bg-ink text-sand'
                      }`}
                    >
                      {index + 1}
                    </motion.div>

                    {/* Stop Card */}
                    <motion.div
                      onClick={() => setActiveStopId(isActive ? null : stop.id)}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`group/stop bg-paper rounded-3xl p-5 border transition-[border-color,box-shadow] duration-300 cursor-pointer ${
                        isActive
                          ? 'border-accent shadow-md ring-2 ring-accent/20'
                          : 'border-line hover:border-ink/30 hover:shadow-md'
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
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
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
                              <h3 className="font-display text-xl text-ink hover:text-accent transition-colors">
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
                                className="p-1.5 rounded-full hover:bg-[#FDF3F1] text-muted hover:text-[#B42318] transition-colors"
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
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink text-sand hover:bg-ink/85 transition-colors"
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
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-paper text-ink hover:border-accent hover:text-accent transition-colors"
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
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-paper text-ink hover:border-accent hover:text-accent transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Directions
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transit Leg Indicator to Next Stop */}
                      {!isLast && (stop.transport_mode || isAdmin) && (
                        <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-xs text-muted">
                          <span className="p-1 rounded-md bg-stone text-accent transition-transform duration-500 group-hover/stop:translate-x-1">
                            {getTransportIcon(stop.transport_mode)}
                          </span>
                          {isAdmin ? (
                            <label className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              Next Leg:
                              <select
                                value={stop.transport_mode || ''}
                                onChange={(e) => handleChangeTransport(stop.id, e.target.value)}
                                className="bg-sand/40 border border-line rounded-full px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
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
                            <span>
                              Next Leg:{' '}
                              <strong className="text-ink font-semibold">{stop.transport_mode}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Card: Ready to travel */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden bg-night text-sand rounded-3xl p-6 sm:p-7 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 card-shadow isolate"
          >
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-accent/30 blur-3xl -z-10 motion-safe:animate-[sn-breathe_6s_ease-in-out_infinite]" />
            <div className="text-center sm:text-left">
              <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#F4B08A] font-semibold mb-1">
                Ready when you are
              </span>
              <h4 className="font-display text-2xl text-white">Want to do this trip?</h4>
              <p className="text-xs text-sand/70 mt-1">
                Create a travel group with this exact route attached and invite friends.
              </p>
            </div>
            <motion.button
              onClick={handleStartGroup}
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className="cta-sheen group relative overflow-hidden btn-primary !bg-[#E05A47] hover:!bg-[#D04936] shrink-0 flex items-center gap-2 py-2.5 px-5 shadow-[0_12px_30px_-10px_rgba(224,90,71,0.9)]"
            >
              <Users className="w-4 h-4" /> Start Trip Group
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Admin Add Stop Modal */}
      <AddStopModal
        isOpen={isAddStopOpen}
        onClose={() => setIsAddStopOpen(false)}
        nextOrderIndex={sortedStops.length + 1}
        existingStops={sortedStops}
        onAddStop={handleAddStop}
      />
    </div>
    </ScrollExpandMedia>
  );
};

export default ItineraryDetailsPage;

