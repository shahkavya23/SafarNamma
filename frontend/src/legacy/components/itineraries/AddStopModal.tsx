import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  AlertCircle,
  Loader2,
  Search,
  Check,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
import type { Place, ItineraryStop } from '../../types';
import { placesApi } from '../../api/client';
import { setScrollLocked } from '../../hooks/useLenis';
import { CoordinateFields, MapLinkNotice } from '../places/LocationFields';
import { coordNumber, coordsError, coordsFromMapLink } from '../../utils/mapLink';

type ConflictMode = 'shift' | 'replace';

interface AddStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextOrderIndex: number;
  existingStops: ItineraryStop[];
  onAddStop: (stopData: {
    destination_id: number;
    order_index: number;
    transport_mode?: string;
    note?: string;
    conflict_mode?: ConflictMode;
  }) => Promise<void>;
}

// Checks if a place can really get a pin: GPS coordinates, or a Google Maps link with a position in it.
// Short share links (maps.app.goo.gl/…) carry no position, so they don't count.
export const placeHasMap = (p: Place): boolean => {
  const hasCoords =
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    !isNaN(p.latitude) &&
    !isNaN(p.longitude) &&
    (p.latitude !== 0 || p.longitude !== 0);
  return hasCoords || coordsFromMapLink(p.map_link) !== null;
};

export const AddStopModal: React.FC<AddStopModalProps> = ({
  isOpen,
  onClose,
  nextOrderIndex,
  existingStops,
  onAddStop,
}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [orderIndex, setOrderIndex] = useState(nextOrderIndex);
  const [transportMode, setTransportMode] = useState('Cab / Auto');
  const [note, setNote] = useState('');
  const [customMapLink, setCustomMapLink] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflictMode, setConflictMode] = useState<ConflictMode | null>(null);

  // Lock background scroll (and Lenis smooth-scroll) so the wheel scrolls inside the modal only
  useEffect(() => {
    if (!isOpen) return;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setOrderIndex(nextOrderIndex);
      setSelectedPlaceId(null);
      setSearchTerm('');
      setCustomMapLink('');
      setLatitude('');
      setLongitude('');
      setError('');
      setConflictMode(null);
      fetchPlaces();
    }
  }, [isOpen, nextOrderIndex]);

  const fetchPlaces = async () => {
    setIsLoadingPlaces(true);
    try {
      const data = await placesApi.getPlaces();
      setPlaces(data || []);
    } catch (err) {
      console.error('Failed to fetch destinations', err);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  if (!isOpen) return null;

  const query = searchTerm.trim().toLowerCase();
  const selectedPlace = places.find((p) => p.id === selectedPlaceId);
  const selectedHasMap = selectedPlace ? placeHasMap(selectedPlace) : false;
  const takenStop = existingStops.find((s) => s.order_index === orderIndex);
  const takenName = takenStop?.destination?.name || `Stop #${orderIndex}`;

  const filteredPlaces = places.filter((p) => {
    if (!query) return true;
    const nameMatch = p.name?.toLowerCase().includes(query);
    const catMatch = p.category?.toLowerCase().includes(query);
    const stateMatch = p.state?.toLowerCase().includes(query);
    const descMatch = p.description?.toLowerCase().includes(query);
    return nameMatch || catMatch || stateMatch || descMatch;
  });

  const handleSelectPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    setSearchTerm(place.name);
    setCustomMapLink(place.map_link || '');
    setLatitude('');
    setLongitude('');
    setError('');
  };

  const handleMapLinkChange = (link: string) => {
    setCustomMapLink(link);
    const coords = coordsFromMapLink(link);
    if (coords) {
      setLatitude(String(coords[0]));
      setLongitude(String(coords[1]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaceId) {
      setError('Please choose a destination to add as a stop.');
      return;
    }

    if (!orderIndex || Number(orderIndex) < 1) {
      setError('Please enter a valid stop sequence order (e.g. 1, 2, 3...).');
      return;
    }

    if (!transportMode.trim()) {
      setError('Please select the transit mode to the next leg.');
      return;
    }

    if (takenStop && !conflictMode) {
      setError(`Stop #${orderIndex} is already ${takenName}. Choose to shift it down or replace it.`);
      return;
    }

    const coordinateProblem = selectedHasMap ? null : coordsError(latitude, longitude);
    if (coordinateProblem) {
      setError(coordinateProblem);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // If admin gave a location for a place that can't get a pin yet, save it to the place first.
      // A failed save stops here, so nobody is told the place was fixed when it wasn't.
      const link = customMapLink.trim();
      const lat = coordNumber(latitude);
      const lng = coordNumber(longitude);
      if (selectedPlace && !selectedHasMap && (lat !== null || link !== (selectedPlace.map_link ?? '').trim())) {
        const updated = await placesApi.updatePlaceLocation(selectedPlace.id, {
          map_link: link || null,
          latitude: lat,
          longitude: lng,
        });
        setPlaces((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      }

      await onAddStop({
        destination_id: selectedPlaceId,
        order_index: Number(orderIndex) || 1,
        transport_mode: transportMode.trim() || undefined,
        note: note.trim() || undefined,
        conflict_mode: takenStop ? conflictMode ?? undefined : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add stop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-sm overscroll-contain"
    >
      <div
        data-lenis-prevent
        className="bg-paper border border-line rounded-3xl max-w-lg w-full p-6 sm:p-8 card-shadow relative max-h-[85vh] overflow-y-auto overscroll-contain"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone text-muted hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-accent mb-2">
          <MapPin className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">Route Waypoint</span>
        </div>
        <h2 className="font-display text-2xl text-ink mb-1">Add Route Stop</h2>
        <p className="text-sm text-muted mb-5">
          Select an existing destination from Explore to chart as Stop #{orderIndex}.
        </p>

        {error && (
          <div className="mb-4 p-3.5 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-xs text-[#8A1C12] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Destination picker */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              1. Choose Destination *
            </label>

            {/* Selected confirmation card */}
            {selectedPlace && (
              <div className="mb-3 p-3 bg-accent-soft/70 border border-accent/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedPlace.image_url ? (
                      <img
                        src={selectedPlace.image_url}
                        alt={selectedPlace.name}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center font-bold shrink-0">
                        ✓
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold">
                        ✓ Destination Selected
                      </span>
                      <p className="text-sm font-bold text-ink truncate">{selectedPlace.name}</p>
                      <p className="text-[11px] text-muted truncate">{selectedPlace.category}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(null);
                      setSearchTerm('');
                      setCustomMapLink('');
                      setLatitude('');
                      setLongitude('');
                    }}
                    className="text-xs text-muted hover:text-ink font-semibold px-2 py-1 rounded-lg hover:bg-paper transition-colors shrink-0"
                  >
                    Change
                  </button>
                </div>

                {/* ── MAP LINK STATUS ALERT ── */}
                {selectedHasMap ? (
                  <div className="p-2.5 bg-[#EBF7EE] border border-[#BCE8C5] rounded-xl text-xs text-[#1E6838] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-semibold">Google Maps Location Verified</p>
                      <p className="text-[11px] text-[#1E6838]/80 mt-0.5">
                        ✓ This place will be plotted as a pin on the interactive route map.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#FFF9E6] border border-[#F3DE97] rounded-xl text-xs text-[#8A6D1C] space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#C4841D]" />
                      <div className="min-w-0">
                        <p className="font-bold text-[#8A6D1C]">
                          {selectedPlace.map_link?.trim() ? 'No Location in This Link' : 'No Google Maps Link Found'}
                        </p>
                        <p className="text-[11px] leading-relaxed mt-0.5 text-[#735A15]">
                          {selectedPlace.map_link?.trim()
                            ? `"${selectedPlace.name}" only has a short Google Maps link, with no coordinates saved. `
                            : `"${selectedPlace.name}" does not have a Google Maps link or GPS coordinates in the database. `}
                          It will appear in the stop list, but <strong>will NOT display a pin on the route map</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Inline Quick Map Link Input */}
                    <div className="pt-2 border-t border-[#F3DE97]/70">
                      <label className="block text-[11px] font-semibold text-[#8A6D1C] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Paste Google Maps Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.google.com/maps/place/..."
                        value={customMapLink}
                        onChange={(e) => handleMapLinkChange(e.target.value)}
                        className="w-full bg-white border border-[#E3CD7A] rounded-xl px-3 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
                      />
                      <MapLinkNotice mapLink={customMapLink} latitude={latitude} longitude={longitude} />
                      <CoordinateFields
                        latitude={latitude}
                        longitude={longitude}
                        onChange={(lat, lng) => {
                          setLatitude(lat);
                          setLongitude(lng);
                        }}
                        labelClassName="block text-[11px] font-semibold text-[#8A6D1C] uppercase tracking-wider"
                        inputClassName="w-full bg-white border border-[#E3CD7A] rounded-xl px-3 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
                      />
                      <p className="text-[10px] text-[#735A15] mt-1">
                        A full link or coordinates will be saved to this place when you add the stop, so it gets a pin.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search place by name or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedPlaceId && e.target.value !== selectedPlace?.name) {
                    setSelectedPlaceId(null);
                  }
                }}
                className="w-full bg-sand/40 border border-line rounded-2xl pl-10 pr-4 py-2 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            </div>

            {/* List of places */}
            <div className="max-h-48 overflow-y-auto border border-line rounded-2xl divide-y divide-line/60 bg-sand/20">
              {isLoadingPlaces ? (
                <div className="p-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  Loading destinations from database…
                </div>
              ) : filteredPlaces.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">No places found matching search.</div>
              ) : (
                filteredPlaces.map((p) => {
                  const isSelected = selectedPlaceId === p.id;
                  const hasMap = placeHasMap(p);

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlace(p)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-accent/15 border-l-4 border-accent'
                          : 'hover:bg-sand/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-stone flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-muted" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${isSelected ? 'font-bold text-accent' : 'font-semibold text-ink'}`}>
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted truncate">{p.category}</span>
                            {/* Map status indicator badge */}
                            {hasMap ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md font-medium shrink-0 flex items-center gap-0.5">
                                📍 Mapped
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md font-medium shrink-0 flex items-center gap-0.5">
                                ⚠️ No Map Pin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/20 px-2.5 py-1 rounded-full shrink-0">
                          <Check className="w-3.5 h-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs text-muted hover:text-ink font-medium shrink-0 flex items-center gap-0.5">
                          Select <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Stop Sequence Order *
              </label>
              <input
                type="number"
                min="1"
                required
                value={orderIndex}
                onChange={(e) => {
                  setOrderIndex(parseInt(e.target.value) || 1);
                  setConflictMode(null);
                  setError('');
                }}
                className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Transit to Next Leg *
              </label>
              <select
                required
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
              >
                <option value="Walking">🚶 Walking</option>
                <option value="Cab / Auto">🛺 Cab / Auto</option>
                <option value="Metro / Bus">🚌 Metro / Bus</option>
                <option value="Drive / Bike">🚗 Drive / Bike</option>
                <option value="Destination End">🏁 Final Destination</option>
              </select>
            </div>
          </div>

          {/* ── ORDER CONFLICT: stop number already used ── */}
          {takenStop && (
            <div className="p-3 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-xs text-[#8A1C12] space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Stop #{orderIndex} is already taken</p>
                  <p className="text-[11px] leading-relaxed mt-0.5 text-[#8A1C12]/80">
                    <strong>{takenName}</strong> is at this position. What should happen to it?
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  {
                    mode: 'shift' as const,
                    title: 'Shift it down',
                    desc: `Insert here; ${takenName} and later stops move +1.`,
                  },
                  {
                    mode: 'replace' as const,
                    title: 'Replace it',
                    desc: `Remove ${takenName} and put the new place here.`,
                  },
                ]).map((opt) => {
                  const active = conflictMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => {
                        setConflictMode(opt.mode);
                        setError('');
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-accent/15 border-accent text-ink'
                          : 'bg-white border-[#F2C9C2] text-ink hover:border-accent/60'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-xs">
                        {active && <Check className="w-3.5 h-3.5 text-accent" />}
                        {opt.title}
                      </span>
                      <span className="block text-[11px] text-muted mt-0.5 leading-snug">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Waypoint Tip / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Have dinner here, try the ghee roast!"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-line mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-ghost text-sm py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPlaceId}
              className={`btn-primary text-sm py-2.5 px-6 flex items-center gap-2 ${
                !selectedPlaceId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Stop…
                </>
              ) : selectedPlace && takenStop && conflictMode === 'replace' ? (
                `Replace Stop #${orderIndex}`
              ) : selectedPlace && takenStop && conflictMode === 'shift' ? (
                `Insert as Stop #${orderIndex}`
              ) : selectedPlace ? (
                `Add ${selectedPlace.name.slice(0, 15)} as Stop`
              ) : (
                'Choose Place Above'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
