import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import {
  Mail,
  Shield,
  Calendar,
  MapPin,
  Heart,
  Users,
  Trash2,
  X,
  Compass,
  PlusCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Award,
  Sparkles,
  Gauge,
  ShieldAlert,
} from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { submissionsApi } from '../api/client';
import type { Place } from '../types';

export const UserProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { favorites, removeFavorite } = useFavorites();

  const [userSubmissions, setUserSubmissions] = useState<Place[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(true);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
  });

  // Fetch places submitted by this user
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user?.email) return;
      setIsLoadingSubmissions(true);
      try {
        const subs = await submissionsApi.getUserSubmissions(user.email);
        setUserSubmissions(subs);
      } catch (err) {
        console.error('Failed to load user submissions', err);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };
    fetchSubmissions();
  }, [user?.email]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const joinDate = user.created_at
    ? (() => {
        try {
          const d = new Date(user.created_at);
          return isNaN(d.getTime())
            ? 'Recently'
            : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch {
          return 'Recently';
        }
      })()
    : 'Recently';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: formData.name.trim() || user.name,
      bio: formData.bio.trim(),
      avatar_url: formData.avatar_url.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-[#070A0D] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 space-y-8">
        {/* ═══════════════════════════════════════════════════════
            TOP PROFILE HEADER CARD
            ═══════════════════════════════════════════════════════ */}
        <div className="bg-[#0F172A]/80 rounded-3xl p-8 border border-white/10 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none" />

          <div className="relative shrink-0">
            <div className="h-28 w-28 md:h-32 md:w-32 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-3xl flex items-center justify-center text-black text-4xl font-extrabold shadow-lg border-2 border-white/20 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black text-[#F59E0B] p-2 rounded-full border border-white/10 shadow-md">
              <Compass className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#F59E0B]/15 text-[#F59E0B] px-3 py-1 rounded-full text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Safar Pioneer Explorer
                </div>
                <h1 className="text-3xl font-extrabold text-white">{user.name}</h1>
                <p className="mt-2 text-gray-400 text-sm italic max-w-xl">
                  {user.bio ? `"${user.bio}"` : 'No bio added yet. Tell fellow travelers about your travel style!'}
                </p>
              </div>

              <button
                onClick={() => {
                  setFormData({
                    name: user.name || '',
                    bio: user.bio || '',
                    avatar_url: user.avatar_url || '',
                  });
                  setIsEditing(true);
                }}
                className="px-6 py-2.5 bg-white/10 hover:bg-[#F59E0B] hover:text-black text-white rounded-full font-bold transition-all self-center md:self-start text-xs uppercase tracking-wider border border-white/10"
              >
                Edit Profile
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-gray-300 justify-center md:justify-start text-xs">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Mail className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="capitalize font-medium">{user.role}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Explorer Since {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            THE SAFAR EXPEDITION SHOWCASE & VEHICLE LOGBOOK
            Real-life cinematic photography, digital odometer, and badges
            ═══════════════════════════════════════════════════════ */}
        <div className="bg-[#0F172A]/80 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl overflow-hidden relative backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Real-Life Cinematic Vehicle Showcase Visual */}
            <div className="w-full lg:w-3/5 h-72 sm:h-80 md:h-96 rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
              <img
                src="/cinematic/hero_expedition.jpg"
                alt="SafarNamma Trailmaster 4x4"
                className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#F59E0B] border border-white/10">
                Vehicle: SafarNamma Trailmaster 4x4
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-xs text-gray-300">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400">Spec Profile</div>
                  <div className="font-bold text-white text-sm">Dual-Range 4WD • 290mm Ridge Clearance</div>
                </div>
                <div className="bg-[#F59E0B] text-black font-bold px-3 py-1 rounded-full text-[11px] uppercase tracking-wider">
                  Convoy Ready
                </div>
              </div>
            </div>

            {/* Expedition Stats & Badges Sidebar */}
            <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#F59E0B] font-bold mb-1">
                  <Award className="w-4 h-4" /> Expedition Logbook
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  The Safar Logbook
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Your journey odometer, saved waypoints, and verified community expedition records.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[#F59E0B] mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Odometer</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">842 KM</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Recorded on Trail</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Saved</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {favorites.length} Spots
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">In Expedition Journal</div>
                </div>
              </div>

              {/* Earned Adventure Badges */}
              <div>
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">
                  Earned Trail Badges
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-amber-300 text-xs px-3 py-1.5 rounded-xl font-medium">
                    🌄 Ghats Ridge Explorer
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs px-3 py-1.5 rounded-xl font-medium">
                    ☕ Malleshwaram Heritage Scout
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs px-3 py-1.5 rounded-xl font-medium">
                    ⛺ Bortle-3 Wilderness Pioneer
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SAVED PLACES, CONTRIBUTIONS & TRAVEL GROUPS
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Saved Places (Bucket List) */}
          <div className="bg-[#0F172A]/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Saved Waypoints</h3>
                  <p className="text-xs text-gray-400">{favorites.length} places saved</p>
                </div>
              </div>
              <Link to="/explore" className="text-xs text-[#F59E0B] font-semibold hover:underline">
                Explore
              </Link>
            </div>

            {favorites.length === 0 ? (
              <div className="my-auto py-8 text-center">
                <p className="text-gray-400 text-xs mb-3">No saved waypoints yet.</p>
                <Link
                  to="/explore"
                  className="text-xs font-bold text-black bg-[#F59E0B] px-4 py-2 rounded-full hover:brightness-110 transition-colors inline-block uppercase tracking-wider"
                >
                  Browse trails &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-72">
                {favorites.map((place) => {
                  const placeImg =
                    place.image_url ||
                    (place as any).image_urls?.[0] ||
                    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
                  return (
                    <div
                      key={place.id}
                      className="flex gap-3 items-center bg-white/5 p-2.5 rounded-2xl border border-white/10 group hover:border-[#F59E0B]/40 transition-colors"
                    >
                      <img
                        src={placeImg}
                        alt={place.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/places/${place.id}`}
                          className="font-semibold text-xs text-white hover:text-[#F59E0B] truncate block"
                        >
                          {place.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#F59E0B] shrink-0" />
                          {place.state || place.category || 'Karnataka'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFavorite(place.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                        title="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. My Submissions (Community Contributions) */}
          <div className="bg-[#0F172A]/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500/20 text-[#F59E0B] rounded-2xl flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">My Submissions</h3>
                  <p className="text-xs text-gray-400">{userSubmissions.length} spots contributed</p>
                </div>
              </div>
              <Link
                to="/submit"
                className="text-xs text-[#F59E0B] font-semibold hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Submit
              </Link>
            </div>

            {isLoadingSubmissions ? (
              <p className="text-xs text-gray-400 text-center my-auto py-8">Loading submissions...</p>
            ) : userSubmissions.length === 0 ? (
              <div className="my-auto py-8 text-center">
                <p className="text-gray-400 text-xs mb-3">You haven't submitted any places yet.</p>
                <Link
                  to="/submit"
                  className="text-xs font-bold text-black bg-[#F59E0B] px-4 py-2 rounded-full hover:brightness-110 transition-colors inline-block uppercase tracking-wider"
                >
                  Submit a hidden gem &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-72">
                {userSubmissions.map((place) => {
                  const placeImg =
                    place.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
                  const isApproved =
                    place.is_approved || (place as any).submission_status === 'approved';
                  return (
                    <div
                      key={place.id}
                      className="flex gap-3 items-center bg-white/5 p-2.5 rounded-2xl border border-white/10"
                    >
                      <img
                        src={placeImg}
                        alt={place.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {isApproved ? (
                          <Link
                            to={`/places/${place.id}`}
                            className="font-semibold text-xs text-white hover:text-[#F59E0B] truncate block"
                          >
                            {place.name}
                          </Link>
                        ) : (
                          <p className="font-semibold text-xs text-white truncate">{place.name}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Review
                            </span>
                          )}
                        </div>
                      </div>

                      {isApproved && (
                        <Link
                          to={`/places/${place.id}`}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="View live page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. My Travel Groups */}
          <div className="bg-[#0F172A]/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-teal-500/20 text-teal-300 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">My Convoys</h3>
                  <p className="text-xs text-gray-400">Active group rides</p>
                </div>
              </div>
              <Link to="/groups" className="text-xs text-[#F59E0B] font-semibold hover:underline">
                Find Groups
              </Link>
            </div>

            <div className="my-auto py-8 text-center">
              <p className="text-gray-400 text-xs mb-3">Connect and travel with fellow explorers.</p>
              <Link
                to="/groups"
                className="text-xs font-bold text-black bg-[#F59E0B] px-4 py-2 rounded-full hover:brightness-110 transition-colors inline-block uppercase tracking-wider"
              >
                Browse active trips &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          EDIT PROFILE MODAL POPUP
          ═══════════════════════════════════════════════════════ */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0F172A] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-white/20 relative text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                <p className="text-xs text-gray-400 mt-1">Update your public traveler details</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 focus:border-[#F59E0B] outline-none text-sm transition-all text-white"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 focus:border-[#F59E0B] outline-none text-sm transition-all text-white"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Travel Bio & Motto
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 focus:border-[#F59E0B] outline-none text-sm transition-all text-white"
                  placeholder="Weekend trekker, photographer, exploring hidden trails around Bengaluru..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2.5 border border-white/20 text-gray-300 rounded-xl font-semibold hover:bg-white/10 transition-colors text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black rounded-xl font-bold hover:brightness-110 transition-colors text-xs uppercase tracking-wider shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
