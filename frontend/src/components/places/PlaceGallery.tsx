import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { PLACE_FALLBACK_IMAGE } from './PlaceCard';

const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.target as HTMLImageElement).src = PLACE_FALLBACK_IMAGE;
};

/* ─── One framed photo: blurred fill behind, the real image at ≤ natural size in front ───
   The foreground uses w-auto/h-auto with max bounds, so a small upload is never
   stretched past its own pixels (that's what caused the blur on the old hero). */
const FramedPhoto: React.FC<{ src: string; alt: string; eager?: boolean }> = ({ src, alt, eager }) => (
  <>
    <img
      src={src}
      alt=""
      aria-hidden
      referrerPolicy="no-referrer"
      onError={onImgError}
      className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl brightness-[0.4] saturate-150"
    />
    <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-8">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={onImgError}
        loading={eager ? 'eager' : 'lazy'}
        className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      />
    </div>
  </>
);

interface GalleryProps {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onOpen: () => void;
  name: string;
}

const Dots: React.FC<{ count: number; index: number; onSelect: (i: number) => void }> = ({ count, index, onSelect }) =>
  count > 1 ? (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Show photo ${i + 1}`}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === index ? 'w-6 bg-[#F59E0B]' : 'w-1.5 bg-white/30 hover:bg-white/60'
          }`}
        />
      ))}
    </div>
  ) : null;

/* ─── Desktop: sticky stage that cross-fades between photos ─── */
export const StickyPhotoStage: React.FC<GalleryProps> = ({ photos, index, onIndexChange, onOpen, name }) => {
  const step = (dir: number) => onIndexChange((index + dir + photos.length) % photos.length);

  return (
    <div className="relative h-full rounded-[24px] overflow-hidden bg-[#141820] border border-[rgba(255,255,255,0.08)]">
      {photos.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <FramedPhoto src={src} alt={`${name}, photo ${i + 1}`} eager={i === 0} />
        </div>
      ))}

      {/* Click-to-expand layer */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10 cursor-zoom-in"
        aria-label="Open photo viewer"
      />

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <span className="font-mono text-xs text-white/80">
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </span>
        <Dots count={photos.length} index={index} onSelect={onIndexChange} />
        <div className="flex items-center gap-2">
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} className="glass w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10" aria-label="Previous photo">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => step(1)} className="glass w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10" aria-label="Next photo">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <button type="button" onClick={onOpen} className="glass w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10" aria-label="Open photo viewer">
            <Expand className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Mobile: swipeable scroll-snap carousel ─── */
export const MobilePhotoCarousel: React.FC<GalleryProps> = ({ photos, index, onIndexChange, onOpen, name }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) onIndexChange(i);
  };

  const goTo = (i: number) => {
    trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' });
  };

  // Index changed elsewhere (e.g. in the lightbox) → keep the track in sync
  useEffect(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    if (Math.round(el.scrollLeft / el.clientWidth) !== index) {
      el.scrollTo({ left: index * el.clientWidth });
    }
  }, [index]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-[20px] border border-[rgba(255,255,255,0.08)]"
      >
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={onOpen}
            className="relative shrink-0 w-full aspect-[4/3] snap-center overflow-hidden bg-[#141820]"
            aria-label={`Open photo ${i + 1}`}
          >
            <FramedPhoto src={src} alt={`${name}, photo ${i + 1}`} eager={i === 0} />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 px-1">
        <span className="font-mono text-xs text-[#64748B]">
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </span>
        <Dots count={photos.length} index={index} onSelect={goTo} />
      </div>
    </div>
  );
};

/* ─── Full-screen viewer ─── */
export const PhotoLightbox: React.FC<{
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  name: string;
}> = ({ photos, index, onIndexChange, onClose, name }) => {
  const touchX = useRef<number | null>(null);
  const step = (dir: number) => onIndexChange((index + dir + photos.length) % photos.length);

  // Latest handlers for the keydown listener, which is registered once
  const stepRef = useRef(step);
  const closeRef = useRef(onClose);
  stepRef.current = step;
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'ArrowRight') stepRef.current(1);
      if (e.key === 'ArrowLeft') stepRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#060708]/95 backdrop-blur-sm flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photos`}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <span className="text-label text-[#CBD5E1] truncate pr-4">{name}</span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[#64748B]">{index + 1} / {photos.length}</span>
          <button type="button" onClick={onClose} className="glass w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10" aria-label="Close viewer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-20 min-h-0" onClick={onClose}>
        <img
          key={photos[index]}
          src={photos[index]}
          alt={`${name}, photo ${index + 1}`}
          referrerPolicy="no-referrer"
          onError={onImgError}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg animate-fade-in"
        />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} className="hidden sm:flex glass absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center text-white hover:bg-white/10" aria-label="Previous photo">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} className="hidden sm:flex glass absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center text-white hover:bg-white/10" aria-label="Next photo">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-2 px-4 py-4 overflow-x-auto scrollbar-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onIndexChange(i)}
              className={`shrink-0 w-16 h-11 rounded-md overflow-hidden border transition-opacity ${
                i === index ? 'border-[#F59E0B] opacity-100' : 'border-transparent opacity-50 hover:opacity-90'
              }`}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
