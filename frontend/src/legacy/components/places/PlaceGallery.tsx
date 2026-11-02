import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { optimizeImageUrl } from '../../utils/images';
import { setScrollLocked } from '../../hooks/useLenis';
import { HorizontalScroller } from '../motion/HorizontalScroller';
import { SplitHeading } from '../motion/SplitHeading';

interface StripProps {
  photos: string[];
  name: string;
  fallback: string;
  onOpen: (index: number) => void;
}

/* ─── One photo in the strip ───
   Fixed height, natural width: portrait and landscape shots both keep their shape.
   Until the image loads it holds a sensible 4:3 slot so the track doesn't jump. */
const StripPhoto = ({ src, alt, index, total, fallback, onOpen }: { src: string; alt: string; index: number; total: number; fallback: string; onOpen: () => void }) => {
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <figure className="shrink-0 snap-start">
      <button
        type="button"
        onClick={onOpen}
        className="group relative block h-[340px] sm:h-[420px] lg:h-[min(56vh,520px)] rounded-[24px] overflow-hidden bg-stone cursor-zoom-in"
        style={{ aspectRatio: ratio ? String(Math.min(Math.max(ratio, 0.6), 1.9)) : '4 / 3' }}
        aria-label={`Open photo ${index + 1} of ${total}`}
      >
        <img
          src={optimizeImageUrl(src, 1200)}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith(fallback)) img.src = fallback;
          }}
          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
        />
        <span className="absolute right-4 top-4 w-9 h-9 rounded-full glass-dark flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Expand className="w-4 h-4" />
        </span>
      </button>
      <figcaption className="mt-3 font-mono text-xs tracking-[0.18em] text-muted">
        {String(index + 1).padStart(2, '0')} <span className="text-faint">/ {String(total).padStart(2, '0')}</span>
      </figcaption>
    </figure>
  );
};

/* ─── Photo story: a pinned strip that scrolls sideways as you scroll down ─── */
export const PhotoStrip: React.FC<StripProps> = ({ photos, name, fallback, onOpen }) => (
  <HorizontalScroller
    className="bg-sand"
    trackClassName="px-page lg:pl-[max(var(--page-gutter),calc((100vw-80rem)/2+var(--page-gutter)))] items-start"
    header={
      <div className="max-w-7xl w-full mx-auto px-page pt-20 lg:pt-0 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="section-label mb-4">Photo story · {photos.length} shots</p>
          <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: 'See it before' }, { text: 'you go.', accent: true }]} />
        </div>
        <p className="text-muted max-w-xs text-sm leading-relaxed">Shot by travellers who've been. Tap any photo to see it full size.</p>
      </div>
    }
  >
    {photos.map((src, i) => (
      <StripPhoto key={src + i} src={src} alt={`${name}, photo ${i + 1}`} index={i} total={photos.length} fallback={fallback} onOpen={() => onOpen(i)} />
    ))}
  </HorizontalScroller>
);

/* ─── Full-screen viewer ─── */
export const PhotoLightbox: React.FC<{
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  name: string;
  fallback: string;
}> = ({ photos, index, onIndexChange, onClose, name, fallback }) => {
  const reduced = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const [dir, setDir] = useState(1);
  const step = (d: number) => {
    setDir(d);
    onIndexChange((index + d + photos.length) % photos.length);
  };

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
    setScrollLocked(true);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScrollLocked(false);
    };
  }, []);

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!img.src.endsWith(fallback)) img.src = fallback;
  };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-night/97 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photos`}
      data-lenis-prevent
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 sm:px-8 py-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <span className="font-display text-lg text-sand truncate pr-4">{name}</span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-sand/60 tabular-nums">
            {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          </span>
          <button type="button" onClick={onClose} className="glass-dark w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/15" aria-label="Close viewer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-24 min-h-0 overflow-hidden" onClick={onClose}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.img
            key={photos[index]}
            custom={dir}
            initial={reduced ? false : { opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            src={optimizeImageUrl(photos[index], 2000)}
            alt={`${name}, photo ${index + 1}`}
            referrerPolicy="no-referrer"
            onError={onImgError}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
          />
        </AnimatePresence>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="hidden sm:flex glass-dark absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center hover:bg-white/15"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="hidden sm:flex glass-dark absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center hover:bg-white/15"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-2 px-4 py-4 overflow-x-auto scrollbar-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => {
                setDir(i > index ? 1 : -1);
                onIndexChange(i);
              }}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden ring-2 transition-all ${i === index ? 'ring-accent opacity-100' : 'ring-transparent opacity-45 hover:opacity-90'}`}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={optimizeImageUrl(src, 200)} alt="" referrerPolicy="no-referrer" onError={onImgError} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
