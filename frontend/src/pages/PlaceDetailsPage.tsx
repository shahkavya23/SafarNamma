import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, IndianRupee, CheckCircle, Navigation, Bookmark, ExternalLink, AlertTriangle, Calendar, Users, Star, MessageSquare, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import type { Place , Review} from '../types';
import { placesApi , reviewApi } from '../api/client';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';


const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  if (!timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

const formatVisitingHours = (open?: string, close?: string) => {
  if (!open && !close) return "Typically Open 24/7";
  if (open && close) {
    return `${formatTime(open)} – ${formatTime(close)}`;
  }
  if (open) {
    if (open.toLowerCase().includes('to') || open.includes('-') || open.toLowerCase().includes('24')) {
      return open;
    }
    return `Opens at ${formatTime(open)}`;
  }
  return `Closes at ${formatTime(close)}`;
};

export const PlaceDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  // Layer 4A: Reviews & Ratings state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Layer 4B: Review Submission state
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  
  // Use our new global favorites context
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isAdmin } = useAuth();
  const isSaved = place ? isFavorite(place.id) : false;

  const handleSaveToggle = () => {
    if (!place) return;
    if (isSaved) {
      removeFavorite(place.id);
    } else {
      addFavorite(place);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return;
    if (!newComment.trim()) {
      setReviewError("Please write a few words about your experience.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const createdReview = await reviewApi.createReview({
        destination_id: place.id,
        rating: newRating,
        comment: newComment.trim(),
      });

      // 1. Instantly show new review at top of list
      setReviews((prev) => [createdReview, ...prev]);

      // 2. Reset form inputs
      setNewComment('');
      setNewRating(5);
      setReviewSuccess("Your review has been posted successfully!");

      // 3. Refresh destination rating from backend so header star updates
      if (slug) {
        const refreshedPlace = await placesApi.getPlaceById(slug);
        if (refreshedPlace) {
          setPlace(refreshedPlace);
        }
      }
    } catch (err: any) {
      console.error("Failed to post review:", err);
      setReviewError(err.message || "Failed to submit your review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!place) return;
    
    // Show a browser confirmation popup before deleting!
    if (window.confirm("Are you sure you want to delete this destination?")) {
      const success = await placesApi.deletePlace(place.id);
      if (success) {
        navigate('/explore'); // Go back to the explore page!
      } else {
        alert("Failed to delete the destination.");
      }
    }
  };


  useEffect(() => {
    const fetchPlaceAndReviews = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const data = await placesApi.getPlaceById(slug);
        if (data) {
          setPlace(data);
          // Fetch real reviews from FastAPI for this destination
          setIsLoadingReviews(true);
          const destinationReviews = await reviewApi.getReviews(data.id);
          setReviews(destinationReviews);
        }
      } catch (error) {
        console.error("Error fetching place details or reviews", error);
      } finally {
        setIsLoading(false);
        setIsLoadingReviews(false);
      }
    };
    fetchPlaceAndReviews();
  }, [slug]);

  // Compile all photos: cover photo first, followed by gallery showcase images
  const allPhotos = React.useMemo(() => {
    if (!place) return [];
    const list: string[] = [];
    if (place.image_url) list.push(place.image_url);
    if (place.gallery_images && Array.isArray(place.gallery_images)) {
      place.gallery_images.forEach((img) => {
        if (img && typeof img === 'string' && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1506461883276-594543d04e12');
    }
    return list;
  }, [place]);

  const currentPhoto = allPhotos[selectedImageIndex] || allPhotos[0] || 'https://images.unsplash.com/photo-1506461883276-594543d04e12';

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev === 0 ? allPhotos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev === allPhotos.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-pulse">
        <div className="h-96 bg-gray-200 rounded-2xl mb-8 w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-12"></div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Place Not Found</h1>
        <p className="text-gray-500 mb-8">We couldn't find the destination you're looking for.</p>
        <Link to="/explore" className="bg-[#0D5C63] text-white px-6 py-3 rounded-full font-medium hover:bg-[#0A3F47] transition-colors">
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/explore" className="hover:text-[#F59E0B]">Explore</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{place.name}</span>
      </div>

      {/* Hero Image & Gallery Showcase */}
      <div className="relative h-72 md:h-[420px] w-full rounded-3xl overflow-hidden mb-4 shadow-md group">
        <img 
          key={currentPhoto}
          src={currentPhoto} 
          alt={place.name} 
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506461883276-594543d04e12';
          }}
          className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none"></div>

        {/* Multi-photo Navigation Controls */}
        {allPhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 shadow-lg"
              title="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all z-20 shadow-lg"
              title="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Photo Counter Pill */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 z-20 shadow-sm">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedImageIndex + 1} / {allPhotos.length}</span>
            </div>
          </>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-10 pointer-events-auto">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#F59E0B] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                {place.category}
              </span>
              {place.is_hidden_gem && (
                <span className="bg-white/20 backdrop-blur-md text-white border border-white/40 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                  <CheckCircle className="w-3 h-3 text-yellow-400" /> Hidden Gem
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2 drop-shadow-sm">{place.name}</h1>
            <p className="text-white/90 flex items-center gap-2 text-sm md:text-base">
              <MapPin className="w-4 h-4 text-[#F59E0B]" /> {place.state || 'India'}
            </p>
          </div>
          <div className="hidden sm:flex gap-3">
            <button 
              onClick={handleSaveToggle}
              className={`backdrop-blur-md p-3 rounded-full border transition-colors ${isSaved ? 'bg-white text-[#F59E0B] border-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-white border-white/40'}`}
              title={isSaved ? "Remove from favorites" : "Save to favorites"}
            >
              <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
            </button>
            {place.map_link && (
              <a href = {place.map_link}  target = "_blank" rel = "noopener noreferrer" className="bg-white text-[#0D5C63] px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg">
                <Navigation className="w-4 h-4" /> Get Directions
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Thumbnail Gallery Rail (When multiple photos exist) */}
      {allPhotos.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {allPhotos.map((photoUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedImageIndex(idx)}
              className={`relative shrink-0 w-24 h-16 md:w-28 md:h-18 rounded-2xl overflow-hidden border-2 transition-all duration-200 shadow-sm ${
                selectedImageIndex === idx
                  ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30 scale-105 shadow-md'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <img
                src={photoUrl}
                alt={`${place.name} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {selectedImageIndex === idx && (
                <div className="absolute inset-0 bg-[#F59E0B]/10" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-serif font-bold text-[#0D5C63] mb-4">About this place</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
              {place.description}
            </p>
          </section>

          {/* Quick Facts Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
              <Clock className="w-6 h-6 text-[#0D5C63] mb-2" />
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Duration</p>
              <p className="font-medium text-gray-900">{place.duration}</p>
            </div>
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
              <IndianRupee className="w-6 h-6 text-[#0D5C63] mb-2" />
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Budget Tier</p>
              <p className="font-medium text-gray-900">{place.budget_tier ? `₹${place.budget_tier}` : 'Free'}</p>
            </div>
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
              <Calendar className="w-6 h-6 text-[#0D5C63] mb-2" />
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Best Season</p>
              <p className="font-medium text-gray-900">{place.best_season || 'All Year'}</p>
            </div>
          </section>

          <section className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Important Safety Information
            </h3>
            <p className="text-red-800 mb-4">Please exercise caution and follow all local guidelines. Check weather conditions before traveling.</p>
            <div className="bg-white/60 p-4 rounded-xl border border-red-100">
              <h4 className="font-semibold text-gray-900 mb-2">Rules & Regulations</h4>
              <p className="text-gray-700 text-sm">Respect the local environment and leave no trace.</p>
            </div>
          </section>

          {/* Community Reviews & Ratings Section */}
          <section className="border-t border-gray-100 pt-8 mt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#0D5C63] flex items-center gap-2">
                  <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                  Community Reviews
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {reviews.length === 0
                    ? 'No reviews yet for this destination.'
                    : `${reviews.length} ${reviews.length === 1 ? 'traveler review' : 'traveler reviews'} with an average rating of ${place.rating || 0}★`}
                </p>
              </div>
            </div>

            {/* Write a Review Form Box */}
            <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-gray-100 mb-8">
              <h4 className="font-bold text-gray-900 mb-1">Leave a Review</h4>
              <p className="text-xs text-gray-500 mb-4">
                Share your tips, experiences, or recommendations for fellow travelers.
              </p>

              {reviewSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              {reviewError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 -m-1 focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              star <= (hoverRating || newRating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-700 ml-2">
                      {hoverRating || newRating} / 5
                    </span>
                  </div>
                </div>

                {/* Comment Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Experience
                  </label>
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What did you love? Any tips on parking, timing, or scenic viewpoints?"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D5C63] focus:border-transparent transition-all"
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="bg-[#0D5C63] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0A3F47] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post Review</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Reviews List */}
            {isLoadingReviews ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-gray-100 rounded-2xl w-full"></div>
                <div className="h-24 bg-gray-100 rounded-2xl w-full"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-[#FAF9F6] p-8 rounded-2xl border border-gray-100 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">Be the first to share your experience!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Help fellow travelers know what to expect at {place.name}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0D5C63]/10 text-[#0D5C63] font-bold text-xs flex items-center justify-center">
                          T{rev.user_id}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          Traveler #{rev.user_id}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(rev.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {/* Star Badge */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(rev.rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-gray-700 ml-1">
                        {rev.rating.toFixed(1)}
                      </span>
                    </div>
                    {/* Comment text */}
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Practical Info</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Visiting Hours</p>
                  <p className="text-sm text-gray-600">
                    {formatVisitingHours(place.opening_hours, place.closing_hours)}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Navigation className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Transport Options</p>
                  <p className="text-sm text-gray-600">{place.transport_options || "Local cabs and buses available"}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nearby Facilities</p>
                  {place.nearby_facilities ? (
                    <ul className="text-sm text-gray-600 list-disc pl-4 mt-1">
                      {place.nearby_facilities.split(',').map((facility, idx) => (
                        <li key={idx}>{facility.trim()}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="text-sm text-gray-600 list-disc pl-4 mt-1">
                      <li>Basic eateries</li>
                      <li>Restrooms</li>
                    </ul>
                  )}
                </div>
              </li>
            </ul>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => navigate(`/groups?destinationId=${place.id}`)}
                className="w-full bg-[#F59E0B] text-white py-3.5 rounded-xl font-bold hover:bg-[#D97706] transition-all shadow-md hover:shadow-amber-200 flex items-center justify-center gap-2 group"
              >
                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>I want to go (Find Travel Groups)</span>
              </button>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={handleSaveToggle}
                  className={`flex-1 border py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isSaved ? 'bg-[#FFFBEB] border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} /> 
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={handleDelete}
                      className="flex-1 border py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                    >
                      Delete
                    </button>
                    <Link 
                      to={`/edit/${place.id}`}
                      className="flex-1 border py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#FAF9F6] p-5 rounded-2xl text-sm border border-gray-100">
            <p className="text-gray-600 mb-2">
              Source: <span className="font-medium">Community Submitted</span>
            </p>
            <button className="text-xs text-[#0D5C63] font-medium mt-3 flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3 h-3" /> Report incorrect info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
