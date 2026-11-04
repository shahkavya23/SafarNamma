import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { Plus, Route as RouteIcon } from 'lucide-react';
import type { Itinerary } from '../types';
import { ApiError, itinerariesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scrollToElement } from '../hooks/useLenis';
import { CreateItineraryModal } from '../components/itineraries/CreateItineraryModal';
import { ItinerariesHeroCopy } from '../components/itineraries/ItinerariesHeroCopy';
import { ItineraryCard, ITINERARY_CARD_SIZE, itineraryCardWidth } from '../components/itineraries/ItineraryCard';
import { RouteIndex } from '../components/itineraries/RouteIndex';
import { TravelQuoteLoader } from '../components/itineraries/TravelQuoteLoader';
import { FREE_RULE } from '../components/itineraries/unlock';
import CarouselStacked from '../components/ui/carousel-stacked';
import PerspectiveTunnelHero, { type TunnelItem } from '../components/ui/perspective-tunnel-hero';
import { optimizeImageUrl, photoSrc, preloadImage, PHOTOS, type PhotoKey } from '../utils/images';

// For routes with no photo of their own: Glow Arena's neon game room (real place upload, served at screen width)
const FALLBACK_IMAGE = 'https://res.cloudinary.com/my3tjiae/image/upload/c_limit,w_1920,f_auto,q_auto:good/v1790283909/3glow-mug0tdthmvxug.webp';

// The curated photos ship with the site, so the tunnel can play before the server has answered.
// One card per curated photo, always: the count sets each card's place in the flight.
const CURATED_PHOTOS = Object.keys(PHOTOS) as PhotoKey[];
const TUNNEL_SLOTS = CURATED_PHOTOS.length;
const TUNNEL_PHOTO_WIDTH = 500;
// A slow connection can't hold the intro back any longer than this; late photos join in flight
const TUNNEL_START_CAP_MS = 1500;
// Leaves the deck's card clear of the floating navbar
const DECK_SCROLL_OFFSET = -72;

// A sleeping server fails or hangs for a while before it answers, so keep asking
type LoadState = 'loading' | 'waking' | 'failed' | 'ready';
const WAKING_AFTER_MS = 4000;
const RETRY_DELAYS_MS = [2000, 3000, 5000];
const RETRY_DELAY_MAX_MS = 8000;
const RETRY_BUDGET_MS = 120000;

const isRetryable = (err: unknown) => !(err instanceof ApiError) || err.status >= 500;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

/**
 * Every route's cover and stop photos, each once, laid over the curated photos. Each curated
 * photo keeps its own slot, so one a route photo can't replace never ends up in the tunnel twice.
 */
const buildTunnelItems = (
  itineraries: Itinerary[],
  onSelectRoute: (index: number) => void,
  onSeeRoutes: () => void,
): TunnelItem[] => {
  const seen = new Set<string>();
  const routePhotos: TunnelItem[] = [];
  const add = (src: string | undefined, title: string, onSelect: () => void) => {
    if (!src || seen.has(src) || routePhotos.length >= TUNNEL_SLOTS) return;
    seen.add(src);
    routePhotos.push({ src, title, onSelect });
  };

  // Every route's cover goes in first, so no route is crowded out by an earlier route's stop photos
  itineraries.forEach((it, i) => {
    add(optimizeImageUrl(it.image_url || undefined, TUNNEL_PHOTO_WIDTH), it.title, () => onSelectRoute(i));
  });
  itineraries.forEach((it, i) => {
    it.stops?.forEach((stop) => {
      const place = stop.destination;
      add(optimizeImageUrl(place?.image_url, TUNNEL_PHOTO_WIDTH), place?.name ?? it.title, () => onSelectRoute(i));
    });
  });

  return CURATED_PHOTOS.map(
    (key, slot) => routePhotos[slot] ?? { src: photoSrc(key, 800), title: PHOTOS[key].place, onSelect: onSeeRoutes },
  );
};

export const ItinerariesPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const reduced = useReducedMotion();

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [tunnelReady, setTunnelReady] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // The deck's route line waits until the deck is actually on screen
  const deckRef = useRef<HTMLDivElement>(null);
  const deckInView = useInView(deckRef, { amount: 0.35, once: true });
  // The deck itself rises as it reaches the screen, so scrolling down never meets an empty page
  const deckArriving = useInView(deckRef, { margin: '0px 0px 15% 0px', once: true });

  const loadController = useRef<AbortController | null>(null);

  const fetchItineraries = async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const { signal } = controller;

    const wakingTimer = setTimeout(() => setLoadState('waking'), WAKING_AFTER_MS);
    const startedAt = Date.now();

    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const data = await itinerariesApi.getAll(signal);
          if (signal.aborted) return;
          setItineraries(data || []);
          setLoadState('ready');
          return;
        } catch (err) {
          if (signal.aborted) return;
          console.error('Failed to load itineraries:', err);
          const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAY_MAX_MS;
          if (!isRetryable(err) || Date.now() - startedAt + delay > RETRY_BUDGET_MS) {
            setLoadState('failed');
            return;
          }
          setLoadState('waking');
          await wait(delay, signal);
          if (signal.aborted) return;
        }
      }
    } finally {
      clearTimeout(wakingTimer);
    }
  };

  useEffect(() => {
    fetchItineraries();
    return () => loadController.current?.abort();
  }, []);

  // The tunnel starts from the photos that ship with the site, whatever the server is doing
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (!cancelled) setTunnelReady(true);
    };
    const cap = setTimeout(start, TUNNEL_START_CAP_MS);
    Promise.all(CURATED_PHOTOS.map((key) => preloadImage(photoSrc(key, 800)))).then(start);
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
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

  // Admins star up to 3 routes as free for everyone; the server says when the limit is reached
  const handleToggleFeatured = async (e: React.MouseEvent, itinerary: Itinerary) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const updated = await itinerariesApi.update(itinerary.id, { is_featured: !itinerary.is_featured });
      setItineraries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error('Failed to update free route:', err);
      alert(err instanceof Error ? err.message : 'Could not update this route.');
    }
  };

  const seeRoutes = () => {
    if (deckRef.current) scrollToElement(deckRef.current, DECK_SCROLL_OFFSET);
  };

  const selectRoute = (index: number) => {
    setActiveIndex(index);
    seeRoutes();
  };

  // The deck opens on the first free pick with the second to its left and the third to its right.
  // The deck loops, so its last card is the one on the front card's left. Only the deck is
  // reordered: the route list and hero keep the server's order, and indices map between the two.
  const deckOrder = useMemo(() => {
    const all = itineraries.map((_, i) => i);
    const free = all.filter((i) => itineraries[i].is_featured);
    if (itineraries.length < 3 || free.length < 2) return all;
    const [center, left, ...right] = free;
    const rest = all.filter((i) => !itineraries[i].is_featured);
    return [center, ...right, ...rest, left];
  }, [itineraries]);
  const deckItems = useMemo(() => deckOrder.map((i) => itineraries[i]), [deckOrder, itineraries]);
  const deckActiveIndex = Math.max(0, deckOrder.indexOf(activeIndex));

  const ready = loadState === 'ready';
  const tunnelItems = useMemo(
    () => buildTunnelItems(itineraries, selectRoute, seeRoutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itineraries],
  );

  return (
    <div className="w-full bg-sand min-h-screen">
    <PerspectiveTunnelHero items={tunnelItems} ready={tunnelReady} scrollHint="Scroll to fly through">
      <ItinerariesHeroCopy
        itineraries={itineraries}
        ready={ready}
        activeId={itineraries[activeIndex]?.id}
        onSelect={(id) => selectRoute(itineraries.findIndex((it) => it.id === id))}
        onSeeAll={seeRoutes}
        note={isAdmin ? 'Star up to 3 routes to make them free. Users unlock any other route by hosting a group on it.' : FREE_RULE}
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
      {loadState === 'loading' || loadState === 'waking' ? (
        <TravelQuoteLoader waking={loadState === 'waking'} />
      ) : loadState === 'failed' ? (
        <div className="py-20 text-center bg-paper/60 border border-line rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-4">
            <RouteIcon className="w-7 h-7" />
          </div>
          <h3 className="font-display text-2xl text-ink mb-2">Couldn't load the routes</h3>
          <p className="text-sm text-muted mb-6 leading-relaxed">The server didn't answer. Give it a moment and try again.</p>
          <button
            onClick={() => {
              setLoadState('loading');
              fetchItineraries();
            }}
            className="btn-primary mx-auto flex items-center gap-2"
          >
            Try again
          </button>
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
        <>
          <CarouselStacked
            items={deckItems}
            getKey={(it) => it.id}
            cardClassName={ITINERARY_CARD_SIZE}
            cardWidth={itineraryCardWidth}
            activeIndex={deckActiveIndex}
            onActiveChange={(i) => setActiveIndex(deckOrder[i] ?? 0)}
            visibleSide={2}
            className="-mx-4 sm:-mx-6 lg:-mx-8 w-auto"
            renderCard={(it, { isActive }) => (
              <ItineraryCard
                itinerary={it}
                fallbackImage={FALLBACK_IMAGE}
                isActive={isActive && deckInView}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onToggleFeatured={handleToggleFeatured}
              />
            )}
          />
          <RouteIndex itineraries={itineraries} activeIndex={activeIndex} onSelect={setActiveIndex} />
        </>
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

