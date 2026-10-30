import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { Plus, Route as RouteIcon } from 'lucide-react';
import type { Itinerary } from '../types';
import { itinerariesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scrollToElement } from '../hooks/useLenis';
import { CreateItineraryModal } from '../components/itineraries/CreateItineraryModal';
import { ItinerariesHeroCopy } from '../components/itineraries/ItinerariesHeroCopy';
import { ItineraryCard, ITINERARY_CARD_SIZE, itineraryCardWidth } from '../components/itineraries/ItineraryCard';
import CarouselStacked from '../components/ui/carousel-stacked';
import PerspectiveTunnelHero, { type TunnelItem } from '../components/ui/perspective-tunnel-hero';
import { optimizeImageUrl, photoSrc, PHOTOS, type PhotoKey } from '../utils/images';

// For routes with no photo of their own: Glow Arena's neon game room (real place upload, served at screen width)
const FALLBACK_IMAGE = 'https://res.cloudinary.com/my3tjiae/image/upload/c_limit,w_1920,f_auto,q_auto:good/v1790283909/3glow-mug0tdthmvxug.webp';

// The tunnel needs enough photos to feel like a stream; curated ones top up a short list
const MIN_TUNNEL_PHOTOS = 9;
const MAX_TUNNEL_PHOTOS = 14;
const TUNNEL_PHOTO_WIDTH = 500;
// Leaves the deck's card clear of the floating navbar
const DECK_SCROLL_OFFSET = -72;

/** Every route's cover and stop photos, each once, then curated photos if that's too few. */
const buildTunnelItems = (
  itineraries: Itinerary[],
  onSelectRoute: (index: number) => void,
  onSeeRoutes: () => void,
): TunnelItem[] => {
  const seen = new Set<string>();
  const items: TunnelItem[] = [];
  const add = (src: string | undefined, title: string, onSelect: () => void) => {
    if (!src || seen.has(src) || items.length >= MAX_TUNNEL_PHOTOS) return;
    seen.add(src);
    items.push({ src, title, onSelect });
  };

  itineraries.forEach((it, i) => {
    add(optimizeImageUrl(it.image_url || undefined, TUNNEL_PHOTO_WIDTH), it.title, () => onSelectRoute(i));
    it.stops?.forEach((stop) => {
      const place = stop.destination;
      add(optimizeImageUrl(place?.image_url, TUNNEL_PHOTO_WIDTH), place?.name ?? it.title, () => onSelectRoute(i));
    });
  });

  for (const key of Object.keys(PHOTOS) as PhotoKey[]) {
    if (items.length >= MIN_TUNNEL_PHOTOS) break;
    add(photoSrc(key, 800), PHOTOS[key].place, onSeeRoutes);
  }
  return items;
};

export const ItinerariesPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const reduced = useReducedMotion();

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // The deck's route line waits until the deck is actually on screen
  const deckRef = useRef<HTMLDivElement>(null);
  const deckInView = useInView(deckRef, { amount: 0.35, once: true });
  // The deck itself rises as it reaches the screen, so scrolling down never meets an empty page
  const deckArriving = useInView(deckRef, { margin: '0px 0px 15% 0px', once: true });

  const fetchItineraries = async () => {
    setIsLoading(true);
    try {
      const data = await itinerariesApi.getAll();
      setItineraries(data || []);
    } catch (err) {
      console.error('Failed to load itineraries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  const handleCreateSubmit = async (data: any) => {
    const created = await itinerariesApi.create(data);
    setItineraries((prev) => [created, ...prev]);
    navigate(`/itineraries/${created.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this itinerary blueprint?')) return;

    try {
      const success = await itinerariesApi.delete(id);
      if (success) {
        setItineraries((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete itinerary:', err);
      alert('Could not delete itinerary.');
    }
  };

  const seeRoutes = () => {
    if (deckRef.current) scrollToElement(deckRef.current, DECK_SCROLL_OFFSET);
  };

  const selectRoute = (index: number) => {
    setActiveIndex(index);
    seeRoutes();
  };

  const ready = !isLoading;
  const tunnelItems = useMemo(
    () => (ready ? buildTunnelItems(itineraries, selectRoute, seeRoutes) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, itineraries],
  );

  return (
    <div className="w-full bg-sand min-h-screen">
    <PerspectiveTunnelHero items={tunnelItems} ready={ready} scrollHint="Scroll to fly through">
      <ItinerariesHeroCopy
        itineraries={itineraries}
        ready={ready}
        activeId={itineraries[activeIndex]?.id}
        onSelect={(id) => selectRoute(itineraries.findIndex((it) => it.id === id))}
        action={
          isAdmin && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary h-11 shrink-0 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Itinerary
            </button>
          )
        }
      />
    </PerspectiveTunnelHero>

    <div className="pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Content ── */}
      {/* The ref sits outside the rise, so jumps measure where the deck ends up rather than where it is mid-rise */}
      <div ref={deckRef}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 48 }}
        animate={deckArriving ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-ink">Loading curated routes…</p>
        </div>
      ) : itineraries.length === 0 ? (
        <div className="py-20 text-center bg-paper/60 border border-line rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-4">
            <RouteIcon className="w-7 h-7" />
          </div>
          <h3 className="font-display text-2xl text-ink mb-2">No itineraries published yet</h3>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            {isAdmin
              ? 'As an admin, you can create the very first route blueprint with customized stops!'
              : 'Our travel curators are crafting multi-stop routes right now. Check back shortly!'}
          </p>
          {isAdmin && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create First Route
            </button>
          )}
        </div>
      ) : (
        <CarouselStacked
          items={itineraries}
          getKey={(it) => it.id}
          cardClassName={ITINERARY_CARD_SIZE}
          cardWidth={itineraryCardWidth}
          activeIndex={activeIndex}
          onActiveChange={setActiveIndex}
          className="-mx-4 sm:-mx-6 lg:-mx-8 w-auto"
          renderCard={(it, { isActive }) => (
            <ItineraryCard
              itinerary={it}
              fallbackImage={FALLBACK_IMAGE}
              isActive={isActive && deckInView}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          )}
        />
      )}
      </motion.div>
      </div>

      {/* Admin creation modal */}
      <CreateItineraryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </div>
    </div>
  );
};

export default ItinerariesPage;

