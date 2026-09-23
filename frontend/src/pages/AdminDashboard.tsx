import React, { useEffect, useState } from 'react';
import { placesApi, submissionsApi } from '../api/client';
import type { Place } from '../types';
import { PLACE_CATEGORIES } from '../types';
import { 
  List,
  CheckCircle, 
  XCircle, 
  MapPin, 
  IndianRupee, 
  ExternalLink, 
  Clock, 
  Calendar, 
  X, 
  Sparkles, 
  FileText, 
  Navigation, 
  AlertTriangle, 
  Image as ImageIcon,
  Star,
  Search,
  Filter,
  ShieldCheck,
  Check,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  // Navigation Tab: 'submissions' | 'weekend'
  const [activeTab, setActiveTab] = useState<'submissions' | 'weekend'>('submissions');

  // State to hold pending submissions from FastAPI
  const [submissions, setSubmissions] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // State for "Popular this weekend" curation
  const [approvedPlaces, setApprovedPlaces] = useState<Place[]>([]);
  const [selectedWeekendIds, setSelectedWeekendIds] = useState<number[]>([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [isSavingWeekend, setIsSavingWeekend] = useState(false);
  const [weekendSearch, setWeekendSearch] = useState('');
  const [weekendCategoryFilter, setWeekendCategoryFilter] = useState('All');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [weekendFeedback, setWeekendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Curating Mandatory Metadata Before Approval
  const [selectedForApproval, setSelectedForApproval] = useState<Place | null>(null);
  const [curationForm, setCurationForm] = useState({
    category: 'Park',
    duration: '2-3 Hours',
    best_season: 'October - March (Winter)',
    description: '',
    opening_hours: '09:00',
    closing_hours: '21:00',
    transport_options: 'Local cabs and buses available',
    nearby_facilities: 'Basic eateries, Restrooms',
    image_url: '',
    gallery_images: [] as string[]
  });
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch pending submissions
  const fetchSubmissions = async () => {
    try {
      const data = await submissionsApi.getPendingSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error("Failed to fetch pending submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch approved places for the weekend showcase curation
  const fetchApprovedPlaces = async () => {
    setIsLoadingApproved(true);
    try {
      const data = await placesApi.getPlaces();
      setApprovedPlaces(data);
      // Initialize selectedWeekendIds from places where is_popular_weekend is true
      const currentFeatured = data.filter(p => p.is_popular_weekend).map(p => p.id);
      setSelectedWeekendIds(currentFeatured);
    } catch (error) {
      console.error("Failed to fetch approved places:", error);
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Fetch on initial mount
  useEffect(() => {
    fetchSubmissions();
    fetchApprovedPlaces();
  }, []);

  // Open modal for curation
  const openApprovalModal = (place: Place) => {
    setSelectedForApproval(place);
    setCurationForm({
      category: place.category || 'Park',
      duration: place.duration || '2-3 Hours',
      best_season: place.best_season || 'October - March (Winter)',
      description: place.description || '',
      opening_hours: place.opening_hours || '09:00',
      closing_hours: place.closing_hours || '21:00',
      transport_options: place.transport_options || 'Local cabs and buses available',
      nearby_facilities: place.nearby_facilities || 'Basic eateries, Restrooms',
      image_url: place.image_url || '',
      gallery_images: place.gallery_images || []
    });
  };

  // Submit enriched metadata and approve
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForApproval) return;

    if (!curationForm.image_url || !curationForm.image_url.trim()) {
      alert("A cover image is mandatory before approving this place! The user did not upload an image, so you must upload or insert one.");
      return;
    }

    if (!curationForm.duration.trim() || !curationForm.best_season.trim()) {
      alert("Duration and Best Season are mandatory!");
      return;
    }

    if (!curationForm.opening_hours.trim() || !curationForm.closing_hours.trim() || !curationForm.transport_options.trim() || !curationForm.nearby_facilities.trim()) {
      alert("Opening Time, Closing Time, Transport Options, and Nearby Facilities are compulsory for Admin curation!");
      return;
    }

    if (!curationForm.description.trim() || curationForm.description.trim().length < 10) {
      alert("Description is mandatory! Please review and enter at least 10 characters describing this destination.");
      return;
    }

    setIsPublishing(true);
    try {
      const success = await submissionsApi.approveSubmission(selectedForApproval.id, curationForm);
      if (success) {
        setSubmissions(prev => prev.filter(sub => sub.id !== selectedForApproval.id));
        setActionMessage(`"${selectedForApproval.name}" successfully curated, approved, and published to Explore!`);
        setSelectedForApproval(null);
        // Refresh approved places so new destination appears in the weekend showcase list
        fetchApprovedPlaces();
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        alert("Failed to approve submission.");
      }
    } catch (error) {
      console.error("Error publishing submission:", error);
      alert("Failed to approve submission.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Admin rejects a place
  const handleReject = async (id: number) => {
    if (window.confirm("Are you sure you want to reject and permanently remove this submission?")) {
      const success = await submissionsApi.rejectSubmission(id);
      if (success) {
        setSubmissions(prev => prev.filter(sub => sub.id !== id));
        setActionMessage("Submission rejected and removed.");
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert("Failed to reject submission.");
      }
    }
  };

  // Toggle destination in "Popular This Weekend" selection (max 5)
  const toggleWeekendPlace = (id: number) => {
    if (selectedWeekendIds.includes(id)) {
      setSelectedWeekendIds(prev => prev.filter(item => item !== id));
      setWeekendFeedback(null);
    } else {
      if (selectedWeekendIds.length >= 5) {
        alert("Maximum limit reached: You can feature at most 5 places for 'Popular This Weekend'. Unselect one first to add another.");
        return;
      }
      setSelectedWeekendIds(prev => [...prev, id]);
      setWeekendFeedback(null);
    }
  };

  // Save selected 3 to 5 places for the weekend showcase
  const handleSaveWeekend = async () => {
    if (selectedWeekendIds.length < 3) {
      alert(`Please select at least 3 places to showcase on the homepage. You currently have ${selectedWeekendIds.length} selected.`);
      return;
    }
    if (selectedWeekendIds.length > 5) {
      alert(`You can select at most 5 places. You currently have ${selectedWeekendIds.length} selected.`);
      return;
    }

    setIsSavingWeekend(true);
    setWeekendFeedback(null);
    try {
      await submissionsApi.setPopularWeekend(selectedWeekendIds);
      setWeekendFeedback({
        type: 'success',
        text: `🎉 Success! ${selectedWeekendIds.length} destinations are now prominently featured on the homepage as "Popular this weekend".`
      });
      // Refresh approved list
      await fetchApprovedPlaces();
      setTimeout(() => setWeekendFeedback(null), 6000);
    } catch (error: any) {
      setWeekendFeedback({
        type: 'error',
        text: error?.message || 'Failed to update popular weekend destinations.'
      });
    } finally {
      setIsSavingWeekend(false);
    }
  };

  // Filter approved places
  const categories = ['All', ...PLACE_CATEGORIES];
  
  const filteredApprovedPlaces = approvedPlaces.filter((place) => {
    const matchesSearch = 
      place.name.toLowerCase().includes(weekendSearch.toLowerCase()) ||
      (place.state && place.state.toLowerCase().includes(weekendSearch.toLowerCase())) ||
      (place.category && place.category.toLowerCase().includes(weekendSearch.toLowerCase()));
    const matchesCategory = weekendCategoryFilter === 'All' || place.category.toLowerCase() === weekendCategoryFilter.toLowerCase();
    const matchesSelectedOnly = !showOnlySelected || selectedWeekendIds.includes(place.id);
    return matchesSearch && matchesCategory && matchesSelectedOnly;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a4731]">Admin Portal & Moderation</h1>
          <p className="text-gray-500 mt-1">Review submissions, enrich place facts, and curate the homepage weekend showcase.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            {approvedPlaces.length} Approved Destinations
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {submissions.length} Pending
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'submissions'
              ? 'border-[#1a4731] text-[#1a4731]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Pending Submissions</span>
          {submissions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
              {submissions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('weekend')}
          className={`pb-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'weekend'
              ? 'border-[#1a4731] text-[#1a4731]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Popular This Weekend</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            selectedWeekendIds.length >= 3 && selectedWeekendIds.length <= 5
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {selectedWeekendIds.length} / 5 Selected
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <>
          {actionMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium text-sm">{actionMessage}</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-36 bg-gray-100 rounded-3xl w-full"></div>
              <div className="h-36 bg-gray-100 rounded-3xl w-full"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-[#f5f0e6] p-12 rounded-3xl text-center border border-[#e8ded1]">
              <CheckCircle className="w-16 h-16 text-[#1a4731] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                There are no pending submissions waiting for review right now. Community submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {submissions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition-all"
                >
                  {/* Image thumbnail or Missing Image Alert Badge */}
                  {sub.image_url ? (
                    <div className="relative w-full md:w-48 h-36 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                      <img 
                        src={sub.image_url} 
                        alt={sub.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506461883276-594543d04e12';
                        }}
                      />
                      {sub.gallery_images && sub.gallery_images.length > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                          📸 +{sub.gallery_images.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full md:w-48 h-36 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center text-center p-3 shrink-0">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                      <span className="text-xs font-bold text-amber-800">No Photo Uploaded</span>
                      <span className="text-[10px] text-amber-600 font-medium">Admin image required</span>
                    </div>
                  )}

                  {/* Destination details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-2xl font-bold text-gray-900">{sub.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1a4731]/10 text-[#1a4731]">
                        {sub.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mb-3 flex-wrap">
                      {sub.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" /> {sub.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-400" /> Tier: {sub.budget_tier}
                      </span>
                      {sub.map_link && (
                        <a 
                          href={sub.map_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Google Maps
                        </a>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {sub.description || 'No description provided by user yet.'}
                    </p>

                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <span>Submitted by:</span>
                      <span className="font-semibold text-gray-700">{sub.submitted_by_email || 'Community traveler'}</span>
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex md:flex-col gap-3 shrink-0">
                    <button 
                      onClick={() => openApprovalModal(sub)}
                      className="flex-1 md:flex-initial bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Sparkles className="w-5 h-5" /> Curate & Approve
                    </button>
                    <button 
                      onClick={() => handleReject(sub.id)}
                      className="flex-1 md:flex-initial bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 border border-rose-200"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: POPULAR THIS WEEKEND SHOWCASE */}
      {activeTab === 'weekend' && (
        <div className="space-y-6">
          {/* Curation Control Banner */}
          <div className="bg-gradient-to-r from-[#1a4731] to-[#2d5f43] rounded-3xl p-6 sm:p-8 text-white shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5 fill-amber-300" /> Homepage Curation
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Popular This Weekend Showcase</h2>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Empower your homepage! Handpick between <span className="font-bold text-amber-300">3 and 5 destinations</span> to highlight for thousands of weekend travelers.
                </p>
                
                {/* Live Count Validation Status */}
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    selectedWeekendIds.length >= 3 && selectedWeekendIds.length <= 5
                      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30'
                      : 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                  }`}>
                    {selectedWeekendIds.length >= 3 && selectedWeekendIds.length <= 5 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Ready to Publish ({selectedWeekendIds.length} / 5 Selected)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                        <span>Select {3 - selectedWeekendIds.length > 0 ? `${3 - selectedWeekendIds.length} more` : ''} ({selectedWeekendIds.length} / 5 Selected)</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-emerald-200">
                    Min: 3 &bull; Max: 5 places
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                <button
                  onClick={handleSaveWeekend}
                  disabled={selectedWeekendIds.length < 3 || selectedWeekendIds.length > 5 || isSavingWeekend}
                  className="px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingWeekend ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Showcase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-gray-900" />
                      <span>Publish Weekend Spotlight ({selectedWeekendIds.length})</span>
                    </>
                  )}
                </button>

                <Link
                  to="/"
                  target="_blank"
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Live Homepage ↗</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {weekendFeedback && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              weekendFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {weekendFeedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-medium text-sm">{weekendFeedback.text}</span>
            </div>
          )}

          {/* Search, Category, and Toggle Filter Controls */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search destinations by name, state, or category..."
                  value={weekendSearch}
                  onChange={(e) => setWeekendSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a4731] focus:bg-white"
                />
                {weekendSearch && (
                  <button 
                    onClick={() => setWeekendSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Show only selected toggle button */}
              <button
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                  showOnlySelected 
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${showOnlySelected ? 'fill-amber-600 text-amber-600' : 'text-gray-400'}`} />
                <span>Show Selected Only ({selectedWeekendIds.length})</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setWeekendCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    weekendCategoryFilter === cat
                      ? 'bg-[#1a4731] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Destinations Selection Grid */}
          {isLoadingApproved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 bg-gray-100 rounded-3xl"></div>
              ))}
            </div>
          ) : filteredApprovedPlaces.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center">
              <SlidersHorizontal className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No destinations found</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                No approved places match your current search or filter criteria. Try clearing filters or searching for another location.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApprovedPlaces.map((place) => {
                const isSelected = selectedWeekendIds.includes(place.id);
                return (
                  <div
                    key={place.id}
                    className={`rounded-3xl border overflow-hidden transition-all flex flex-col bg-white ${
                      isSelected
                        ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {/* Destination Image & Badges */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={place.image_url || 'https://images.unsplash.com/photo-1506461883276-594543d04e12'}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506461883276-594543d04e12';
                        }}
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-xs">
                          {place.category}
                        </span>
                        {place.is_hidden_gem && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                            💎 Hidden Gem
                          </span>
                        )}
                      </div>

                      {/* Selected Status Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md animate-fadeIn">
                          <Check className="w-3.5 h-3.5" /> Featured
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-lg font-bold text-gray-900 line-clamp-1">{place.name}</h4>
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                            ★ {place.rating ? place.rating.toFixed(1) : '4.5'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mb-2.5 flex-wrap">
                          {place.state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" /> {place.state}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" /> {place.duration || 'Half-day'}
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3 h-3 text-gray-400" /> Tier: {place.budget_tier}
                          </span>
                        </div>

                        <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mb-4">
                          {place.description || 'Explore this captivating destination curated for travelers.'}
                        </p>
                      </div>

                      {/* Toggle Button & Link */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <Link
                          to={`/places/${place.id}`}
                          target="_blank"
                          className="text-xs text-gray-500 hover:text-[#1a4731] flex items-center gap-1 font-medium transition-colors"
                        >
                          Preview ↗
                        </Link>

                        <button
                          onClick={() => toggleWeekendPlace(place.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : selectedWeekendIds.length >= 5
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-[#1a4731] hover:bg-[#123523] text-white shadow-xs'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <X className="w-3.5 h-3.5" /> Remove
                            </>
                          ) : (
                            <>
                              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> Select for Weekend
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editorial Curation Modal */}
      {selectedForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[92vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedForApproval(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">Curate & Approve Destination</h2>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Complete the missing Quick Facts and verify description for <span className="font-semibold text-gray-800">{selectedForApproval.name}</span> before publishing to Explore.
            </p>

            <form onSubmit={handleConfirmApproval} className="space-y-5">
              {/* Mandatory Image Curation & Verification Section */}
              <div className="p-4 rounded-2xl border bg-gray-50/70 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#1a4731]" />
                    Cover Photo & Gallery <span className="text-rose-500">*</span>
                  </label>
                  {curationForm.image_url ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-500" /> Photo Attached
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-amber-500" /> Required by Admin
                    </span>
                  )}
                </div>

                {!curationForm.image_url && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">No photo was uploaded by the traveler!</p>
                      <p className="text-amber-700">Before approving this destination, you must upload a photo from your device or paste a valid image link below.</p>
                    </div>
                  </div>
                )}

                {/* Reusable Image Uploader for Admin */}
                <ImageUploader
                  coverUrl={curationForm.image_url}
                  onCoverChange={(url) => setCurationForm((prev) => ({ ...prev, image_url: url }))}
                  galleryUrls={curationForm.gallery_images}
                  onGalleryChange={(urls) => setCurationForm((prev) => ({ ...prev, gallery_images: urls }))}
                  maxGalleryPhotos={5}
                />

                {/* Direct URL Alternative Input */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Or paste a direct image URL (Alternative):
                  </label>
                  <input
                    type="url"
                    value={curationForm.image_url}
                    onChange={(e) => setCurationForm({ ...curationForm, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-[#1a4731] outline-none"
                  />
                </div>
              </div>

              {/* Category Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <List className="w-3.5 h-3.5 text-[#1a4731]" />
                  Category <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={curationForm.category}
                  onChange={(e) => setCurationForm({ ...curationForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                  required
                >
                  {PLACE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1a4731]" />
                  Duration <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={curationForm.duration}
                  onChange={(e) => setCurationForm({ ...curationForm, duration: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                  required
                >
                  <option value="1-2 Hours">1-2 Hours (Quick Stop)</option>
                  <option value="2-3 Hours">2-3 Hours (Standard Visit)</option>
                  <option value="Half Day (4-5 Hours)">Half Day (4-5 Hours)</option>
                  <option value="Full Day (6-8 Hours)">Full Day (6-8 Hours)</option>
                  <option value="Weekend (2 Days)">Weekend (2 Days)</option>
                </select>
              </div>

              {/* Best Season Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1a4731]" />
                  Best Season <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={curationForm.best_season}
                  onChange={(e) => setCurationForm({ ...curationForm, best_season: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                  required
                >
                  <option value="October - March (Winter)">October - March (Winter / Pleasant)</option>
                  <option value="July - September (Monsoon)">July - September (Monsoon / Lush Green)</option>
                  <option value="March - May (Summer)">March - May (Summer / Clear Skies)</option>
                  <option value="All Year Round">All Year Round</option>
                  <option value="Post-Monsoon (Sept - Nov)">Post-Monsoon (Sept - Nov)</option>
                </select>
              </div>

              {/* Practical Info Section Header */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-[#1a4731] uppercase tracking-wider mb-3">Practical Details (Compulsory for Admin)</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1a4731]" />
                        Opening Time <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="time"
                        value={curationForm.opening_hours}
                        onChange={(e) => setCurationForm({ ...curationForm, opening_hours: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1a4731]" />
                        Closing Time <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="time"
                        value={curationForm.closing_hours}
                        onChange={(e) => setCurationForm({ ...curationForm, closing_hours: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-[#1a4731]" />
                      Transport Options <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      value={curationForm.transport_options}
                      onChange={(e) => setCurationForm({ ...curationForm, transport_options: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                      placeholder="e.g. Local cabs and buses available, Metro station 2km away"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1a4731]" />
                      Nearby Facilities <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      value={curationForm.nearby_facilities}
                      onChange={(e) => setCurationForm({ ...curationForm, nearby_facilities: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none"
                      placeholder="Comma-separated: Basic eateries, Restrooms, Parking"
                      required
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">Separate with commas (e.g. Parking, Restrooms, Food stalls)</p>
                  </div>
                </div>
              </div>

              {/* Mandatory Description Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1a4731]" />
                    Editorial Description <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Mandatory for Admin
                  </span>
                </div>
                <textarea 
                  rows={4}
                  value={curationForm.description}
                  onChange={(e) => setCurationForm({ ...curationForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#1a4731] focus:bg-white outline-none leading-relaxed"
                  placeholder="Review or write the description for this destination. What makes it special? Any essential travel tips?"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Check for clarity and accuracy. If the user left it blank, write an informative description.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedForApproval(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};