import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Bookmark,
  ExternalLink,
  Star,
  Sparkles,
  ArrowRight,
  Pencil,
  Trash2,
  IndianRupee,
  CalendarDays,
  Hourglass,
  Clock,
  Users,
  Share2,
  UtensilsCrossed,
  PenLine,
} from 'lucide-react';
import type { Place, Review } from '../types';
import { placesApi, reviewApi } from '../api/client';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { PhotoStrip, PhotoLightbox } from '../components/places/PlaceGallery';
import { MenuFlipbook } from '../components/places/MenuFlipbook';
import { BoardingPass } from '../components/places/BoardingPass';
import { PlaceCard } from '../components/places/PlaceCard';
import { DetailHero, FactsCard, type Fact } from '../components/detail/DetailHero';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal, RevealItem } from '../components/motion/Reveal';
import { fallbackPhoto } from '../utils/images';
import { formatBudget, shortLocation, formatSubmitterName } from '../utils/format';
import { categoryIcon } from '../utils/categories';
import { formatVisitingHours, isHoursInDescription, isOpen247 } from '../utils/hours';
import { describePlace } from '../utils/describePlace';
import { budgetLevel, durationNote, hoursStatus, seasonStatus } from '../utils/visitInfo';
import { PlaceStory } from '../components/places/PlaceStory';
import { PlaceReviews } from '../components/places/PlaceReviews';

export const PlaceDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  // Re-render every minute so "Open now · closes in 3h" stays true
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMinute((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [related, setRelated] = useState<Place[]>([]);
  const [shareNote, setShareNote] = useState('');

  // Layer 4A: Reviews & Ratings state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

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

  // Posts a review, shows it at the top, then refreshes the place so the header rating updates. Throws on failure.
  const postReview = async (rating: number, comment: string) => {
    if (!place) return;
    const createdReview = await reviewApi.createReview({ destination_id: place.id, rating, comment });
    setReviews((prev) => [createdReview, ...prev]);
    if (slug) {
      const refreshedPlace = await placesApi.getPlaceById(slug);
      if (refreshedPlace) setPlace(refreshedPlace);
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

  // Smooth-scrolls to a section further down the page (story, reviews, review form)
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

  const priceLevel = budgetLevel(place.budget_tier);
  const facts: Fact[] = [
    {
      icon: IndianRupee,
      label: 'Budget',
      value: formatBudget(place.budget_tier).replace(' / person', ''),
      meter: { level: priceLevel, max: 3, symbol: '₹', label: ['Free', 'Low cost', 'Mid range', 'Pricey'][priceLevel] },
      note: priceLevel ? 'Per person, roughly' : 'No ticket needed',
    },
    { icon: CalendarDays, label: 'Best time', value: place.best_season || 'All year', status: seasonStatus(place.best_season) },
    { icon: Hourglass, label: 'Time needed', value: place.duration || 'Flexible', note: durationNote(place.duration) },
    {
      icon: Clock,
      label: 'Hours',
      status: isOpen247(place.opening_hours, place.closing_hours)
        ? { label: 'Open now · never closes', tone: 'open' }
        : hoursStatus(place.opening_hours, place.closing_hours),
      value: isHoursInDescription(place.opening_hours, place.closing_hours) ? (
        <button
          type="button"
          onClick={() => jumpTo('place-story')}
          className="text-left underline decoration-accent/50 underline-offset-4 hover:text-accent-text transition-colors"
        >
          Check description
        </button>
      ) : (
        hours
      ),
    },
    { icon: CategoryIcon, label: 'Category', value: place.category, note: 'See more like this', href: `/explore?category=${encodeURIComponent(place.category)}` },
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

  // The description sorted into where / when / what to see; empty parts are left out
  const sections = describePlace(place.description);
  const mapUrl =
    place.map_link || (place.latitude != null && place.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}` : null);

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
            {place.rating > 0 ? (
              <button type="button" onClick={() => jumpTo('place-reviews')} className="flex items-center gap-2 hover:text-white transition-colors group">
                <Star className="w-4 h-4 text-[#F4C56A] fill-[#F4C56A]" />
                <span className="text-sand font-semibold">{place.rating.toFixed(1)}</span>
                <span className="text-sand/60 underline decoration-sand/30 underline-offset-4 group-hover:text-sand group-hover:decoration-sand/70 transition-colors">
                  · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </button>
            ) : (
              <button type="button" onClick={() => jumpTo('write-review')} className="flex items-center gap-2 text-sand/70 hover:text-white transition-colors">
                <Star className="w-4 h-4 text-[#F4C56A]" />
                <span className="underline decoration-sand/30 underline-offset-4">No reviews yet · be the first</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => jumpTo('place-story')}
              aria-label={`Submitted by ${submitterName}. Read the story`}
              className="flex items-center gap-2.5 bg-white/10 hover:bg-white/[0.18] pl-1 pr-3.5 py-1 rounded-full backdrop-blur-md border border-white/15 hover:border-white/30 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-[#F4B08A] text-night flex items-center justify-center font-display text-xs font-bold uppercase shrink-0">
                {submitterInitial}
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[10px] uppercase tracking-[0.14em] text-sand/60">Submitted by</span>
                <span className="text-sm font-semibold text-white capitalize">{submitterName}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => jumpTo('write-review')}
              className="flex items-center gap-1.5 text-xs text-[#D8DEDA]/90 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5 text-[#F4B08A]" /> Write a review
            </button>
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
            <PlaceStory sections={sections} mapUrl={mapUrl} />
          </section>

          {/* Community reviews */}
          <section id="place-reviews" className="scroll-mt-32">
            <Reveal>
              <p className="section-label mb-5">Community reviews</p>
            </Reveal>
            <SplitHeading className="text-display text-ink mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'What explorers' }, { text: 'say.', accent: true }]} />
            <PlaceReviews placeName={place.name} rating={place.rating || 0} reviews={reviews} loading={isLoadingReviews} onPost={postReview} />
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
