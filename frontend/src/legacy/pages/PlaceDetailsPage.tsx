import React, { useEffect, useMemo, useState } from 'react';
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
  IndianRupee,
  CalendarDays,
  Hourglass,
  Clock,
  Users,
  Share2,
  UtensilsCrossed,
  Compass,
} from 'lucide-react';
import type { Place, Review } from '../types';
import { placesApi, reviewApi } from '../api/client';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { PhotoStrip, PhotoLightbox } from '../components/places/PlaceGallery';
import { MenuFlipbook } from '../components/places/MenuFlipbook';
import { BoardingPass } from '../components/places/BoardingPass';
import { PlaceCard } from '../components/places/PlaceCard';
import { DetailHero, FactsCard } from '../components/detail/DetailHero';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal, RevealItem } from '../components/motion/Reveal';
import { fallbackPhoto } from '../utils/images';
import { formatBudget, shortLocation, formatSubmitterName } from '../utils/format';
import { categoryIcon } from '../utils/categories';
import { isHoursInDescription, isOpen247 } from '../utils/hours';

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
  if (!open && !close) return 'Hours not listed';
  if (isOpen247(open, close)) return 'Open 24/7';
  if (isHoursInDescription(open, close)) return 'Check description';
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

const StarRow: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={`${size} ${star <= Math.round(rating) ? 'text-gold fill-gold' : 'text-stone-deep fill-stone-deep'}`} />
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [related, setRelated] = useState<Place[]>([]);
  const [shareNote, setShareNote] = useState('');

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

  const handleShare = async () => {
    if (!place) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote('Link copied');
        setTimeout(() => setShareNote(''), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return;
    if (!newComment.trim()) {
      setReviewError('Please write a few words about your experience.');
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
      setReviewSuccess('Your review has been posted. Thank you!');

      // 3. Refresh destination rating from backend so header star updates
      if (slug) {
        const refreshedPlace = await placesApi.getPlaceById(slug);
        if (refreshedPlace) {
          setPlace(refreshedPlace);
        }
      }
    } catch (err: any) {
      console.error('Failed to post review:', err);
      setReviewError(err.message || 'Failed to submit your review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!place) return;

    // Show a browser confirmation popup before deleting!
    if (window.confirm('Are you sure you want to delete this destination?')) {
      const success = await placesApi.deletePlace(place.id);
      if (success) {
        navigate('/explore'); // Go back to the explore page!
      } else {
        alert('Failed to delete the destination.');
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
        console.error('Error fetching place details or reviews', error);
      } finally {
        setIsLoading(false);
        setIsLoadingReviews(false);
      }
    };
    fetchPlaceAndReviews();
  }, [slug]);

  // More places to explore: same category first, then anything else
  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    placesApi
      .getPlaces()
      .then((all) => {
        if (cancelled) return;
        const others = all.filter((p) => p.id !== place.id);
        const same = others.filter((p) => p.category === place.category);
        const rest = others.filter((p) => p.category !== place.category);
        setRelated([...same, ...rest].slice(0, 4));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [place?.id, place?.category]);

  const fallback = useMemo(() => fallbackPhoto(place?.id ?? 0), [place?.id]);

  // Compile all photos: cover photo first, followed by gallery showcase images
  const allPhotos = useMemo(() => {
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
      list.push(fallback);
    }
    return list;
  }, [place, fallback]);

  const menuPages = useMemo(() => {
    if (!place?.menu_images) return [];
    return place.menu_images.filter((img): img is string => Boolean(img) && typeof img === 'string');
  }, [place]);

  const openPhoto = (i: number) => {
    setSelectedImageIndex(i);
    setIsLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="w-full bg-sand min-h-screen">
        <div className="bg-night h-[640px]" />
        <div className="max-w-7xl mx-auto px-page -mt-24 space-y-8">
          <div className="skeleton h-28 w-full rounded-[28px]" />
          <div className="grid lg:grid-cols-[1fr_380px] gap-14">
            <div className="space-y-4">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-3/4" />
            </div>
            <div className="skeleton h-96 rounded-[26px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="w-full bg-sand min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24">
        <p className="section-label">404 · Off the map</p>
        <h1 className="text-display text-ink mt-5 mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
          We couldn't find this <span className="accent-word">place.</span>
        </h1>
        <p className="text-muted mb-10 max-w-md">It may have been removed or renamed. There are plenty more waiting on Explore.</p>
        <Link to="/explore" className="btn-primary">
          Back to Explore <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const location = shortLocation(place.state, 40) || 'Karnataka';
  const CategoryIcon = categoryIcon(place.category);
  const hours = formatVisitingHours(place.opening_hours, place.closing_hours);
  const submitterName = formatSubmitterName(place.submitted_by_name, place.submitted_by_email);
  const submitterInitial = (submitterName[0] || 'c').toUpperCase();

  const facts = [
    { icon: IndianRupee, label: 'Budget', value: formatBudget(place.budget_tier) },
    { icon: CalendarDays, label: 'Best time', value: place.best_season || 'All year' },
    { icon: Hourglass, label: 'Time needed', value: place.duration || 'Flexible' },
    {
      icon: Clock,
      label: 'Hours',
      value: isHoursInDescription(place.opening_hours, place.closing_hours) ? (
        <button
          type="button"
          onClick={() => document.getElementById('place-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="text-left underline decoration-accent/50 underline-offset-4 hover:text-accent-text transition-colors"
        >
          Check description
        </button>
      ) : (
        hours
      ),
    },
    { icon: CategoryIcon, label: 'Category', value: place.category },
  ];

  const passFields = [
    { label: 'Distance', value: place.distance_km != null ? `${place.distance_km} km` : 'In the city' },
    { label: 'Time', value: place.duration || 'Flexible' },
    { label: 'Budget', value: formatBudget(place.budget_tier).replace(' / person', '') },
    { label: 'Season', value: place.best_season || 'All year' },
  ];

  const passFooter = [
    { label: 'Open', value: hours },
    { label: 'Category', value: place.category },
    { label: 'Submitted by', value: submitterName },
  ];

  const nearby = place.nearby_facilities
    ? place.nearby_facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  const knowBefore = [
    { icon: Navigation, label: 'Getting there', content: place.transport_options || 'Not listed yet. Cabs and buses reach most places in and around the city.' },
    { icon: MapPin, label: 'Nearby', content: nearby.length ? nearby.join(' · ') : 'Not listed yet.' },
    { icon: AlertTriangle, label: 'Stay safe', content: 'Check the weather before you leave and follow local guidelines.' },
    { icon: Leaf, label: 'Leave no trace', content: 'Respect the local environment. Carry your waste back with you.' },
  ];

  const paragraphs = (place.description || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="w-full bg-sand min-h-screen">
      {/* ── Hero ── */}
      <DetailHero
        photos={allPhotos}
        fallback={fallback}
        onOpenPhotos={() => openPhoto(0)}
        photoLabel={`${allPhotos.length} ${allPhotos.length === 1 ? 'photo' : 'photos'}`}
        eyebrow={
          <div className="flex flex-wrap items-center gap-3">
            <nav className="text-label text-sand/70" aria-label="Breadcrumb">
              <Link to="/explore" className="hover:text-white transition-colors">
                Explore
              </Link>
              <span className="mx-2 text-sand/35">/</span>
              <Link to={`/explore?category=${encodeURIComponent(place.category)}`} className="text-sand hover:text-white transition-colors">
                {place.category}
              </Link>
            </nav>
            {place.is_hidden_gem && (
              <span className="badge bg-accent text-white">
                <Sparkles className="w-3 h-3" /> Hidden gem
              </span>
            )}
          </div>
        }
        title={
          <SplitHeading
            as="h1"
            onMount
            delay={0.1}
            className="text-display text-sand"
            style={{ fontSize: 'clamp(2.75rem, 5.6vw, 5.25rem)' }}
            parts={[{ text: place.name }]}
          />
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#D8DEDA]">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F4B08A]" /> {location}
            </span>
            {place.rating > 0 && (
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#F4C56A] fill-[#F4C56A]" />
                <span className="text-sand font-semibold">{place.rating.toFixed(1)}</span>
                <span className="text-sand/60">
                  · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-[#D8DEDA]/90 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <Compass className="w-3.5 h-3.5 text-[#F4B08A]" />
              <span>
                submitted by <span className="lowercase font-medium text-white">{submitterName}</span>
              </span>
            </span>
          </div>
        }
        actions={
          <>
            <button onClick={handleSaveToggle} className="btn-primary" aria-pressed={isSaved}>
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? 'Saved' : 'Save place'}
            </button>
            {place.map_link && (
              <a href={place.map_link} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <Navigation className="w-4 h-4" /> Directions
              </a>
            )}
            <button onClick={handleShare} className="btn-ghost" aria-live="polite">
              <Share2 className="w-4 h-4" /> {shareNote || 'Share'}
            </button>
            {place.category === 'Cafes & Restaurants' && menuPages.length > 0 && (
              <button onClick={() => setIsMenuOpen(true)} className="btn-ghost">
                <UtensilsCrossed className="w-4 h-4" /> Open Menu
              </button>
            )}
          </>
        }
      />

      {/* ── Key facts ── */}
      <FactsCard facts={facts} />

      {/* ── Photo story (pinned sideways scroll) ── */}
      {allPhotos.length > 1 && (
        <div className="lg:-mt-12">
          <PhotoStrip photos={allPhotos} name={place.name} fallback={fallback} onOpen={openPhoto} />
        </div>
      )}

      {/* ── Story + weekend pass ── */}
      <div className="max-w-7xl mx-auto px-page pt-24 pb-24 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-14 lg:gap-20">
        <div className="min-w-0 space-y-24">
          {/* About */}
          <section id="place-story" className="scroll-mt-32">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <p className="section-label mb-0">The story</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-soft/80 border border-line text-xs text-muted shadow-sm">
                  <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-text flex items-center justify-center font-display text-[10px] font-bold uppercase">
                    {submitterInitial}
                  </span>
                  <span>
                    discovered & submitted by{' '}
                    <span className="lowercase font-semibold text-ink">{submitterName}</span>
                  </span>
                </div>
              </div>
            </Reveal>
            <SplitHeading className="text-display text-ink mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'Why people' }, { text: 'love it.', accent: true }]} />
            <Reveal delay={0.1} className="space-y-5 max-w-[64ch]">
              {paragraphs.length ? (
                paragraphs.map((para, i) => (
                  <p
                    key={i}
                    className={`text-body text-lg leading-[1.8] ${
                      i === 0 && para.length > 140 ? 'first-letter:font-display first-letter:text-[4.2rem] first-letter:leading-[0.8] first-letter:float-left first-letter:mr-3 first-letter:mt-1.5 first-letter:text-accent' : ''
                    }`}
                  >
                    {para}
                  </p>
                ))
              ) : (
                <p className="text-muted text-lg">No description yet. Been here? Leave a review below and tell people what it's like.</p>
              )}
            </Reveal>
          </section>

          {/* Know before you go */}
          <section>
            <Reveal>
              <p className="section-label mb-5">Know before you go</p>
            </Reveal>
            <SplitHeading className="text-display text-ink mb-10" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'Plan it' }, { text: 'properly.', accent: true }]} />
            <Reveal stagger={0.08} className="grid sm:grid-cols-2 gap-4">
              {knowBefore.map(({ icon: Icon, label, content }) => (
                <RevealItem key={label} className="card p-6 h-full">
                  <span className="w-11 h-11 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="font-display text-xl text-ink mb-2">{label}</h3>
                  <p className="text-sm text-muted leading-relaxed">{content}</p>
                </RevealItem>
              ))}
            </Reveal>
          </section>

          {/* Community reviews */}
          <section>
            <Reveal>
              <p className="section-label mb-5">Community reviews</p>
            </Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
              <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'What explorers' }, { text: 'say.', accent: true }]} />
              {reviews.length > 0 && (
                <Reveal className="flex items-center gap-4">
                  <span className="font-display text-5xl text-ink leading-none">{(place.rating || 0).toFixed(1)}</span>
                  <div>
                    <StarRow rating={place.rating || 0} />
                    <p className="text-xs text-muted mt-1">
                      {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </Reveal>
              )}
            </div>

            {/* Reviews list */}
            {isLoadingReviews ? (
              <div className="space-y-4">
                <div className="skeleton h-28 w-full rounded-[22px]" />
                <div className="skeleton h-28 w-full rounded-[22px]" />
              </div>
            ) : reviews.length === 0 ? (
              <Reveal className="card p-10 text-center mb-8">
                <MessageSquare className="w-8 h-8 text-faint mx-auto mb-3" />
                <p className="font-display text-xl text-ink">Be the first to share your experience</p>
                <p className="text-sm text-muted mt-1">Help fellow explorers know what to expect at {place.name}.</p>
              </Reveal>
            ) : (
              <Reveal stagger={0.07} className="grid gap-4 mb-10">
                {reviews.map((rev) => (
                  <RevealItem key={rev.id}>
                    <article className="card p-6">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-sage-soft text-sage-text font-display text-lg flex items-center justify-center">T</span>
                          <div>
                            <p className="text-sm font-semibold text-ink">Traveller #{rev.user_id}</p>
                            <StarRow rating={rev.rating} size="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <span className="text-xs text-muted">
                          {new Date(rev.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-body leading-relaxed whitespace-pre-line">{rev.comment}</p>
                    </article>
                  </RevealItem>
                ))}
              </Reveal>
            )}

            {/* Write a review */}
            <Reveal className="rounded-[26px] bg-night text-[#D8DEDA] p-7 sm:p-9 grain relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-display text-2xl text-sand mb-1">Been here? Leave a review</h3>
                <p className="text-sm text-[#AEB8B4] mb-6">Tips on timing, parking or the best viewpoints help the next traveller.</p>

                {reviewSuccess && (
                  <div className="mb-5 p-3.5 rounded-2xl text-sm flex items-center gap-2 bg-[#2F7D5B]/20 border border-[#2F7D5B]/40 text-[#9FE0BF]" role="status">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {reviewError && (
                  <div className="mb-5 p-3.5 rounded-2xl text-sm flex items-center gap-2 bg-[#B42318]/20 border border-[#B42318]/40 text-[#F6B4AC]" role="alert">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-5">
                  <div>
                    <p className="text-label text-[#AEB8B4] mb-2">Your rating</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            className="p-1 -m-0.5 rounded transition-transform hover:scale-110"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            aria-pressed={newRating === star}
                          >
                            <Star className={`w-7 h-7 transition-colors ${star <= (hoverRating || newRating) ? 'text-[#F4C56A] fill-[#F4C56A]' : 'text-white/20 fill-white/10'}`} />
                          </button>
                        ))}
                      </div>
                      <span className="font-mono text-sm text-sand/70">{hoverRating || newRating} / 5</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-comment" className="text-label text-[#AEB8B4] block mb-2">
                      Your experience
                    </label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="What did you love? Any tips on parking, timing or viewpoints?"
                      className="field resize-y !bg-white/5 !border-white/15 !text-sand placeholder:!text-white/40 focus:!border-sand focus:!bg-white/10"
                    />
                  </div>

                  <div className="flex justify-end on-photo">
                    <button type="submit" disabled={isSubmittingReview} className="btn-primary">
                      {isSubmittingReview ? (
                        <>
                          <span className="w-4 h-4 border-2 border-ink/50 border-t-transparent rounded-full animate-spin" />
                          Posting…
                        </>
                      ) : (
                        'Post review'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </Reveal>
          </section>

          {/* Footer: source + admin */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-line text-xs text-muted">
            <div className="flex items-center gap-4">
              <span>
                submitted by <span className="lowercase font-semibold text-ink">{submitterName}</span> · admin verified
              </span>
              <button className="hover:text-ink flex items-center gap-1 transition-colors">
                <ExternalLink className="w-3 h-3" /> Report info
              </button>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-label mr-1">Admin</span>
                <Link to={`/edit/${place.id}`} className="btn-ghost !py-2 !px-3.5 !text-xs">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
                <button onClick={handleDelete} className="btn-ghost !py-2 !px-3.5 !text-xs !text-[#B42318] !border-[#B42318]/30 hover:!bg-[#F8DEDA]/50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky side: weekend pass + map ── */}
        <aside className="lg:sticky lg:top-28 self-start space-y-5">
          <Reveal>
            <BoardingPass placeId={place.id} placeName={place.name} fields={passFields} footerFields={passFooter} onFindConvoy={() => navigate(`/groups?destinationId=${place.id}`)} />
          </Reveal>
          <Reveal delay={0.1} className="card p-5 flex items-start gap-4">
            <span className="w-11 h-11 rounded-2xl bg-stone text-ink flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label text-muted mb-1">Where</p>
              <p className="text-sm text-ink font-semibold leading-snug break-words">{place.state || 'Karnataka'}</p>
              {place.map_link ? (
                <a href={place.map_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-accent-text hover:underline underline-offset-4">
                  Open in Google Maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-xs text-muted mt-2">No map pin yet.</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <button onClick={() => navigate(`/groups?destinationId=${place.id}`)} className="w-full card p-5 flex items-center gap-4 text-left hover:border-ink transition-colors group">
              <span className="w-11 h-11 rounded-2xl bg-sage-soft text-sage-text flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">Plan a trip here</span>
                <span className="block text-xs text-muted">Start a group and split the ride</span>
              </span>
              <ArrowRight className="w-4 h-4 text-muted group-hover:translate-x-1 group-hover:text-ink transition-all" />
            </button>
          </Reveal>
        </aside>
      </div>

      {/* ── More places ── */}
      {related.length > 0 && (
        <section className="border-t border-line bg-paper/60">
          <div className="max-w-7xl mx-auto px-page py-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div>
                <Reveal>
                  <p className="section-label mb-5">Keep exploring</p>
                </Reveal>
                <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'You might also' }, { text: 'like.', accent: true }]} />
              </div>
              <Reveal delay={0.15}>
                <Link to={`/explore?category=${encodeURIComponent(place.category)}`} className="btn-ghost">
                  More {place.category} <ArrowRight className="w-4 h-4" />
                </Link>
              </Reveal>
            </div>
            <Reveal stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <RevealItem key={p.id} className="h-full">
                  <PlaceCard place={p} />
                </RevealItem>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {isLightboxOpen && (
        <PhotoLightbox
          photos={allPhotos}
          index={selectedImageIndex}
          onIndexChange={setSelectedImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          name={place.name}
          fallback={fallback}
        />
      )}

      {isMenuOpen && menuPages.length > 0 && (
        <MenuFlipbook pages={menuPages} name={place.name} onClose={() => setIsMenuOpen(false)} />
      )}
    </div>
  );
};
