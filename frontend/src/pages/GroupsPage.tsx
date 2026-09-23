import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Calendar,
  MapPin,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Plus,
  X,
  MessageCircle,
  Sparkles,
  Route,
  Flame,
} from 'lucide-react';
import type { Group, Place } from '../types';
import { groupsApi, placesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const GroupsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationIdParam = searchParams.get('destinationId');

  const [groups, setGroups] = useState<(Group & { place?: Place })[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form inputs
  const [formData, setFormData] = useState({
    destination_id: '',
    title: '',
    description: '',
    trip_date: '',
    meeting_area: '',
    estimated_cost: 500,
    max_members: 6,
    chat_link: '',
    safety_notes: 'Carry water, helmet, and ID card. Respect everyone in the group.',
  });

  // Multi-stop custom curation state
  const [customStopCount, setCustomStopCount] = useState<number>(2);
  const [customStops, setCustomStops] = useState<string[]>(['', '']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMousePos({ x, y });
  };

  const handleStopCountChange = (count: number) => {
    const validCount = Math.max(2, Math.min(6, count));
    setCustomStopCount(validCount);
    setCustomStops((prev) => {
      const next = [...prev];
      if (next.length < validCount) {
        while (next.length < validCount) next.push('');
      } else {
        return next.slice(0, validCount);
      }
      return next;
    });
  };

  const handleStopChange = (index: number, val: string) => {
    setCustomStops((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const fetchGroupsAndPlaces = async () => {
    setIsLoading(true);
    try {
      const [groupsData, allPlaces] = await Promise.all([
        groupsApi.getGroups(),
        placesApi.getPlaces(),
      ]);
      setPlaces(allPlaces);

      const placesMap = new Map(allPlaces.map((p) => [p.id, p]));
      const groupsWithPlaces = groupsData.map((g) => {
        const destId = g.destination_id || Number((g as any).place_id);
        return {
          ...g,
          place: placesMap.get(destId),
        };
      });

      setGroups(groupsWithPlaces);
    } catch (error) {
      console.error('Failed to fetch groups or places', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupsAndPlaces();
  }, []);

  const handleOpenModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const initialDest = destinationIdParam || (places[0]?.id ? places[0].id.toString() : '');
    setFormData((prev) => ({
      ...prev,
      destination_id: initialDest,
    }));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      let finalDestId: number | null = null;
      let finalCustomDest: string | null = null;

      if (formData.destination_id === 'custom') {
        const validStops = customStops.map((s) => s.trim()).filter(Boolean);
        if (validStops.length < 2) {
          throw new Error('Please enter at least 2 destinations for your custom curation route.');
        }
        finalCustomDest = validStops.join(' ➔ ');
      } else {
        finalDestId = Number(formData.destination_id);
      }

      const created = await groupsApi.createGroup({
        destination_id: finalDestId,
        custom_destination: finalCustomDest,
        title: formData.title,
        description: formData.description,
        trip_date: new Date(formData.trip_date).toISOString(),
        meeting_area: formData.meeting_area,
        estimated_cost: Number(formData.estimated_cost),
        max_members: Number(formData.max_members),
        chat_link: formData.chat_link.trim() || null,
        safety_notes: formData.safety_notes.trim() || null,
      });

      if (created) {
        setIsModalOpen(false);
        setFormData({
          destination_id: places[0]?.id.toString() || '',
          title: '',
          description: '',
          trip_date: '',
          meeting_area: '',
          estimated_cost: 500,
          max_members: 6,
          chat_link: '',
          safety_notes: 'Carry water, helmet, and ID card. Respect everyone in the group.',
        });
        setCustomStopCount(2);
        setCustomStops(['', '']);
        await fetchGroupsAndPlaces();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create group plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetPlace = destinationIdParam
    ? places.find((p) => p.id === Number(destinationIdParam))
    : null;

  const filteredGroups = groups.filter((group) => {
    if (!destinationIdParam) return true;
    const matchesOfficial = group.destination_id === Number(destinationIdParam);
    const matchesCustom =
      targetPlace && group.custom_destination
        ? group.custom_destination.toLowerCase().includes(targetPlace.name.toLowerCase())
        : false;
    return matchesOfficial || matchesCustom;
  });

  return (
    <div className="flex flex-col w-full bg-[#070A0D] text-white min-h-screen">
      {/* ═══════════════════════════════════════════════════════
          CINEMATIC BASECAMP EXPEDITION HEADER
          Real-life night basecamp photography, rooftop tent,
          Milky Way, and cozy campfire.
          ═══════════════════════════════════════════════════════ */}
      <div className="relative w-full h-80 sm:h-96 overflow-hidden flex items-end">
        {/* Real-life visual */}
        <img
          src="/cinematic/basecamp_stars.jpg"
          alt="SafarNamma Wilderness Basecamp"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.8] contrast-[1.05]"
        />

        {/* Cinematic Vignettes & Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A0D] via-[#070A0D]/50 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A0D]/90 via-transparent to-black/40" />

        {/* Floating Glassmorphic Overlay */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12 pb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#F59E0B] font-bold mb-3">
              <Flame className="w-4 h-4" /> THE SAFAR BASECAMP • COMMUNITY CONVOYS
            </div>
            <h1 className="font-sans text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-2">
              Travel <span className="text-[#F59E0B]">Together</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 drop-shadow-md">
              Gather around the campfire. Pool 4x4 rides, split fuel costs, discover uncharted trails, and make lifelong friends.
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-7 py-3.5 rounded-full font-bold hover:brightness-110 transition-all flex items-center gap-2.5 shrink-0 shadow-lg text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Start an Expedition
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TRUST & SAFETY BANNER
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 -mt-4 z-10 w-full">
        <div className="bg-[#0F172A]/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3.5 text-xs text-gray-300">
          <ShieldCheck className="w-5 h-5 text-[#F59E0B] shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-white">SafarNamma Expedition Shield:</strong> Group invite links are kept private until the convoy host reviews and approves your join request.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MAIN GROUPS CONTENT & GRID
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-10 w-full flex-grow">
        {/* Active Filter Banner */}
        {destinationIdParam && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <p className="text-sm font-medium text-amber-200">
                Filtering trips visiting:{' '}
                <strong className="font-bold text-white">
                  {targetPlace?.name || 'Selected Destination'}
                </strong>
              </p>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs font-bold text-[#F59E0B] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 rounded-3xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 p-8 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white/10 text-[#F59E0B] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {targetPlace
                ? `No expedition groups for ${targetPlace.name}`
                : 'No active expeditions yet'}
            </h2>
            <p className="text-gray-400 mb-6 text-xs">
              {targetPlace
                ? `There are no official trips to ${targetPlace.name} yet. Be the trail leader and create one!`
                : 'Be the first to rally fellow travelers and embark on an unforgettable road trip!'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleOpenModal}
                className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-7 py-3 rounded-full font-bold hover:brightness-110 transition-all text-xs uppercase tracking-wider"
              >
                Create a Trip to {targetPlace?.name || 'this spot'}
              </button>
              {destinationIdParam && (
                <button
                  onClick={() => setSearchParams({})}
                  className="bg-white/10 text-white hover:bg-white/20 px-6 py-3 rounded-full font-medium transition-colors text-xs"
                >
                  Show All Trips
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-[#0F172A]/80 border border-white/10 rounded-3xl p-6 shadow-xl hover:border-[#F59E0B]/50 transition-all flex flex-col h-full relative overflow-hidden group hover:-translate-y-1"
              >
                {group.status === 'full' ? (
                  <div className="absolute top-4 right-4 bg-white/10 text-gray-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Full
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {group.max_members - group.current_members} spots left
                  </div>
                )}

                <div className="mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/15 px-2.5 py-1 rounded-lg">
                    {group.custom_destination || group.place?.name || 'Local Destination'}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight mt-2.5 line-clamp-2 group-hover:text-[#F59E0B] transition-colors">
                    {group.title}
                  </h3>
                </div>

                <div className="space-y-2.5 mb-6 flex-grow text-xs text-gray-400">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      {new Date(group.trip_date).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span className="line-clamp-1">Meet: {group.meeting_area}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IndianRupee className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span className="font-semibold text-white">
                      ₹{group.estimated_cost} per head
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      By {group.organizer_name} ({group.current_members}/{group.max_members} joined)
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                  <span className="text-gray-400">
                    {group.chat_link ? '🔒 Chat Protected' : 'Community Trip'}
                  </span>
                  <Link
                    to={`/groups/${group.id}`}
                    className="bg-white/10 hover:bg-[#F59E0B] hover:text-black text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          CREATE A PLAN MODAL POPUP
          ═══════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-[#F59E0B] px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <Flame className="w-3.5 h-3.5" /> Safar Campfire Rally
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#071E22]">
                Create a Travel Expedition
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Organize a road trip, set your team capacity, and approve who gets access to the secret group chat.
              </p>
            </div>

            {formError && (
              <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Destination Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Destination *</span>
                  <span className="text-xs text-[#F59E0B] font-medium lowercase">
                    Single spot or custom multi-stop
                  </span>
                </label>
                <select
                  required
                  value={formData.destination_id}
                  onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] bg-white text-gray-800 text-sm font-medium"
                >
                  <option value="custom" className="font-bold text-[#F59E0B]">
                    ✨ Customize Multi-Stop Route (Combine 2+ Places)
                  </option>
                  <optgroup label="── Or Choose An Existing Curated Place ──">
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Customized Multi-Stop Route Builder Panel */}
              {formData.destination_id === 'custom' && (
                <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-emerald-50/20 border-2 border-amber-300/60 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-[#F59E0B]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Custom Multi-Stop Route</h4>
                        <p className="text-xs text-gray-500">How many waypoints along the route?</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200 shadow-sm self-start sm:self-auto">
                      {[2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleStopCountChange(num)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            customStopCount === num
                              ? 'bg-[#F59E0B] text-white shadow-sm'
                              : 'text-gray-600 hover:bg-amber-50 hover:text-[#F59E0B]'
                          }`}
                        >
                          {num} Stops
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {customStops.map((stop, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#0D5C63] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder={
                            idx === 0
                              ? '1st Stop (e.g. Nandi Hills Sunrise Point)'
                              : idx === 1
                              ? '2nd Stop (e.g. Indian Paratha Company for Chai)'
                              : idx === 2
                              ? '3rd Stop (e.g. Devanahalli Heritage Fort)'
                              : `Stop ${idx + 1} Name`
                          }
                          value={stop}
                          onChange={(e) => handleStopChange(idx, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm text-gray-800 placeholder-gray-400"
                        />
                      </div>
                    ))}
                  </div>

                  {customStops.some((s) => s.trim()) && (
                    <div className="bg-white/95 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-gray-700 shadow-sm">
                      <Route className="w-4 h-4 text-[#F59E0B] shrink-0" />
                      <span className="font-bold text-[#0D5C63]">Route Preview:</span>
                      <span className="truncate text-gray-700 font-medium">
                        {customStops.filter((s) => s.trim()).join(' ➔ ') || 'Type place names above...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Trip Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunrise Jeep Ride & Chai at Nandi Hills"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description & Plan *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="What is the plan? Timings, vehicle arrangements, who should join..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                />
              </div>

              {/* Date & Meeting Area */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.trip_date}
                    onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Meeting Point *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silk Board Metro Gate 2"
                    value={formData.meeting_area}
                    onChange={(e) => setFormData({ ...formData, meeting_area: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                  />
                </div>
              </div>

              {/* Cost & Group Size */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Estimated Cost (₹ per head)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.estimated_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_cost: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Max Group Capacity
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={formData.max_members}
                    onChange={(e) =>
                      setFormData({ ...formData, max_members: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                  />
                </div>
              </div>

              {/* Chat Link */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/60">
                <label className="block text-xs font-bold text-[#0D5C63] mb-1 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp or Telegram Group Invite Link
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  🔒 Protected: Revealed only to members approved by you in your dashboard.
                </p>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/... or https://t.me/..."
                  value={formData.chat_link}
                  onChange={(e) => setFormData({ ...formData, chat_link: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-xs"
                />
              </div>

              {/* Safety Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Safety & Gear Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring water bottles, trekking shoes, rain jacket"
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63] text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#0D5C63] to-[#0A3F47] text-white font-bold hover:shadow-lg transition-all text-sm disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Expedition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
