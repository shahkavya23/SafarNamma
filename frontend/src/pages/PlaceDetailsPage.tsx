import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  CheckCircle,
  Navigation,
  Bookmark,
  ExternalLink,
  AlertTriangle,
  Star,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Pencil,
  Trash2,
  Leaf,
} from 'lucide-react';
import type { Place, Review } from '../types';
import { placesApi, reviewApi } from '../api/client';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { PLACE_FALLBACK_IMAGE } from '../components/places/PlaceCard';
import { StickyPhotoStage, MobilePhotoCarousel, PhotoLightbox } from '../components/places/PlaceGallery';
import { BoardingPass } from '../components/places/BoardingPass';


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

/* ─── Section wrapper with scroll-reveal ─── */
const RevealSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useScrollReveal<HTMLElement>();
  return (
    <section ref={ref} className={`reveal ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </section>
  );
};

const StarRow: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${size} ${star <= Math.round(rating) ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#334155] fill-[#334155]'}`}
      />
    ))}
  </div>
);

export const PlaceDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);

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
      list.push(PLACE_FALLBACK_IMAGE);
    }
    return list;
  }, [place]);

  // Desktop: the sticky photo follows your scroll through the story column
  useEffect(() => {
    if (allPhotos.length < 2) return;
    let frame = 0;
    let lastIndex = -1;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = storyRef.current;
        if (!el || window.innerWidth < 1024) return;
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        const next = Math.min(allPhotos.length - 1, Math.floor(progress * allPhotos.length));
        if (next !== lastIndex) {
          lastIndex = next;
          setSelectedImageIndex(next);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [allPhotos.length]);

  if (isLoading) {
    return (
      <div className="w-full bg-[#0C0E10] min-h-screen pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-6 skeleton aspect-[4/3] lg:aspect-auto lg:h-[calc(100vh-9rem)] rounded-[24px]" />
          <div className="lg:col-span-6 space-y-5">
            <div className="skeleton h-3 w-40" />
            <div className="skeleton h-12 w-4/5" />
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton h-56 w-full rounded-[20px] mt-8" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="w-full bg-[#0C0E10] min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <div className="section-label justify-center">404 · Off the map</div>
        <h1 className="text-display text-white mt-4 mb-4" style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}>
          Place Not Found
        </h1>
        <p className="text-[#64748B] mb-10 max-w-md">
          We couldn't find the destination you're looking for. It may have been removed or renamed.
        </p>
        <Link to="/explore" className="btn-primary">
          Back to Explore <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const metaItems = [
    place.state || 'Karnataka',
    place.duration || null,
  ].filter(Boolean) as string[];

  const passFields = [
    { label: 'Distance', value: place.distance_km != null ? `${place.distance_km} KM` : 'In city' },
    { label: 'Time', value: place.duration || 'Flexible' },
    { label: 'Budget', value: place.budget_tier && place.budget_tier !== '0' ? `~₹${place.budget_tier}` : 'Free' },
    { label: 'Season', value: place.best_season || 'All year' },
  ];

  const passFooter = [
    { label: 'Open', value: formatVisitingHours(place.opening_hours, place.closing_hours) },
    { label: 'Category', value: place.category },
  ];

  const nearby = place.nearby_facilities
    ? place.nearby_facilities.split(',').map((f) => f.trim()).filter(Boolean)
    : ['Basic eateries', 'Restrooms'];

  const knowBefore = [
    { icon: Navigation, label: 'Getting there', content: place.transport_options || 'Local cabs and buses available' },
    { icon: MapPin, label: 'Nearby', content: nearby.join(' · ') },
    { icon: AlertTriangle, label: 'Stay safe', content: 'Check the weather before you leave and follow local guidelines.' },
    { icon: Leaf, label: 'Leave no trace', content: 'Respect the local environment. Carry your waste back with you.' },
  ];

  const galleryProps = {
    photos: allPhotos,
    index: selectedImageIndex,
    onIndexChange: setSelectedImageIndex,
    onOpen: () => setIsLightboxOpen(true),
    name: place.name,
  };

  return (
    <div className="w-full bg-[#0C0E10] text-white min-h-screen pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* ── Photos: sticky stage on desktop, swipe carousel on mobile ── */}
        <div className="lg:col-span-6">
          <div className="hidden lg:block sticky top-28 h-[calc(100vh-9rem)] animate-fade-in">
            <StickyPhotoStage {...galleryProps} />
          </div>
          <div className="lg:hidden animate-fade-in">
            <MobilePhotoCarousel {...galleryProps} />
          </div>
        </div>

        {/* ── Story column ── */}
        <div ref={storyRef} className="lg:col-span-6 min-w-0 space-y-16">
          {/* Title block */}
          <header>
            <nav className="text-label text-[#64748B] mb-6 animate-fade-up delay-0">
              <Link to="/explore" className="hover:text-[#F59E0B] transition-colors">Explore</Link>
              <span className="mx-2 text-[#334155]">/</span>
              <Link
                to={`/explore?category=${encodeURIComponent(place.category)}`}
                className="text-[#CBD5E1] hover:text-[#F59E0B] transition-colors"
              >
                {place.category}
              </Link>
            </nav>

            {place.is_hidden_gem && (
              <div className="mb-4 animate-fade-up delay-60">
                <span className="badge badge-amber">
                  <Sparkles className="w-2.5 h-2.5" /> Hidden Gem
                </span>
              </div>
            )}

            <h1
              className="text-display text-white mb-5 animate-fade-up delay-120"
              style={{ fontSize: 'clamp(36px, 4.5vw, 60px)' }}
            >
              {place.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-label text-[#CBD5E1] animate-fade-up delay-180">
              <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
              {metaItems.map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && <span className="w-px h-3 bg-[#334155]" />}
                  <span>{item}</span>
                </React.Fragment>
              ))}
              {place.rating > 0 && (
                <>
                  <span className="w-px h-3 bg-[#334155]" />
                  <span className="flex items-center gap-1 text-[#F59E0B]">
                    <Star className="w-3.5 h-3.5 fill-[#F59E0B]" /> {place.rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-7 animate-fade-up delay-240">
              <button
                onClick={handleSaveToggle}
                className="btn-ghost py-2.5"
                style={isSaved ? { color: '#F59E0B', borderColor: 'rgba(245,158,11,0.40)' } : undefined}
                aria-pressed={isSaved}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              {place.map_link && (
                <a href={place.map_link} target="_blank" rel="noopener noreferrer" className="btn-ghost py-2.5">
                  <Navigation className="w-4 h-4" /> Directions
                </a>
              )}
            </div>
          </header>

          {/* Boarding pass */}
          <RevealSection>
            <BoardingPass
              placeId={place.id}
              placeName={place.name}
              fields={passFields}
              footerFields={passFooter}
              onFindConvoy={() => navigate(`/groups?destinationId=${place.id}`)}
            />
          </RevealSection>

          {/* About */}
          <RevealSection>
            <div className="section-label">The Story</div>
            <p className="text-[#CBD5E1] text-lg leading-relaxed whitespace-pre-line max-w-[62ch] mt-5">
              {place.description}
            </p>
          </RevealSection>

          {/* Know before you go */}
          <RevealSection>
            <div className="section-label">Know Before You Go</div>
            <dl className="mt-5 divide-y divide-[rgba(255,255,255,0.06)] border-y border-[rgba(255,255,255,0.06)]">
              {knowBefore.map(({ icon: Icon, label, content }) => (
                <div key={label} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-4 gap-y-1.5 py-4">
                  <dt className="flex items-center gap-2 text-label text-[#64748B]">
                    <Icon className="w-3.5 h-3.5 text-[#F59E0B]" /> {label}
                  </dt>
                  <dd className="text-sm text-[#CBD5E1] leading-relaxed">{content}</dd>
                </div>
              ))}
            </dl>
          </RevealSection>

          {/* Community reviews */}
          <RevealSection>
            <div className="section-label">Community Reviews</div>
            <div className="flex flex-wrap items-end justify-between gap-4 mt-4 mb-8">
              <h2 className="text-display text-white" style={{ fontSize: 'clamp(28px, 3.5vw, 40px)' }}>
                What Explorers Say
              </h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-3">
                  <StarRow rating={place.rating || 0} />
                  <span className="text-label text-[#64748B]">
                    {(place.rating || 0).toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              )}
            </div>

            {/* Write a review */}
            <div className="glass rounded-[20px] p-6 mb-8">
              <h4 className="text-heading text-white text-base mb-1">Leave a review</h4>
              <p className="text-sm text-[#64748B] mb-5">
                Share tips on timing, parking, or the best viewpoints for fellow explorers.
              </p>

              {reviewSuccess && (
                <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/25 text-[#34D399]">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              {reviewError && (
                <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#F87171]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-5">
                <div>
                  <label className="text-label text-[#64748B] block mb-2">Your rating</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          className="p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded"
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              star <= (hoverRating || newRating)
                                ? 'text-[#F59E0B] fill-[#F59E0B]'
                                : 'text-[#334155] fill-[#334155]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="font-mono text-sm text-[#CBD5E1]">{hoverRating || newRating} / 5</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="review-comment" className="text-label text-[#64748B] block mb-2">Your experience</label>
                  <textarea
                    id="review-comment"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What did you love? Any tips on parking, timing, or scenic viewpoints?"
                    className="input-field text-sm resize-y"
                  />
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmittingReview} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmittingReview ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/60 border-t-transparent rounded-full animate-spin" />
                        Posting…
                      </>
                    ) : (
                      'Post Review'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Reviews list */}
            {isLoadingReviews ? (
              <div className="space-y-4">
                <div className="skeleton h-28 w-full" />
                <div className="skeleton h-28 w-full" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-[#141820] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-10 text-center">
                <MessageSquare className="w-8 h-8 text-[#334155] mx-auto mb-3" />
                <p className="text-heading text-white text-base">Be the first to share your experience</p>
                <p className="text-sm text-[#64748B] mt-1">
                  Help fellow explorers know what to expect at {place.name}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <article
                    key={rev.id}
                    className="bg-[#141820] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-5"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 text-[#14B8A6] font-mono text-xs flex items-center justify-center">
                          T{rev.user_id}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Traveler #{rev.user_id}</p>
                          <StarRow rating={rev.rating} size="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-label text-[#64748B]">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-[#CBD5E1] text-sm leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </RevealSection>

          {/* Footer: source + admin */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[rgba(255,255,255,0.06)] text-xs text-[#64748B]">
            <div className="flex items-center gap-4">
              <span>Source: Community submitted</span>
              <button className="hover:text-[#F59E0B] flex items-center gap-1 transition-colors">
                <ExternalLink className="w-3 h-3" /> Report info
              </button>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-label mr-1">Admin</span>
                <Link
                  to={`/edit/${place.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.10)] text-[#CBD5E1] hover:text-white hover:border-[rgba(255,255,255,0.24)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#EF4444]/30 text-[#F87171] hover:bg-[#EF4444]/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <PhotoLightbox
          photos={allPhotos}
          index={selectedImageIndex}
          onIndexChange={setSelectedImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          name={place.name}
        />
      )}
    </div>
  );
};
