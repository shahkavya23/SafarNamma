import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, X, UtensilsCrossed } from 'lucide-react';
import { optimizeImageUrl } from '../../utils/images';
import { setScrollLocked } from '../../hooks/useLenis';

const EASE = [0.45, 0, 0.55, 1] as const;

export const MenuFlipbook: React.FC<{
  pages: string[];
  name: string;
  onClose: () => void;
}> = ({ pages, name, onClose }) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const touchX = useRef<number | null>(null);

  const canPrev = index > 0;
  const canNext = index < pages.length - 1;

  const step = (d: number) => {
    setIndex((i) => {
      const next = i + d;
      if (next < 0 || next >= pages.length) return i;
      setDir(d);
      return next;
    });
  };

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

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-night/97 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} menu`}
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <span className="flex items-center gap-2.5 font-display text-lg text-sand truncate pr-4">
          <UtensilsCrossed className="w-4 h-4 text-[#F4B08A] shrink-0" /> {name} · Menu
        </span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-sand/60 tabular-nums">
            {String(index + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}
          </span>
          <button type="button" onClick={onClose} className="glass-dark w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/15" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Book */}
      <div
        className="relative flex-1 flex items-center justify-center px-4 sm:px-10 min-h-0 overflow-hidden"
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
        <div
          className="relative w-full h-[68vh] max-h-[760px] max-w-[560px] sm:max-w-[640px]"
          style={{ perspective: '2200px' }}
        >
          {/* Book shell: spine + drop shadow, gives the "closed book" frame the page turns inside */}
          <div className="absolute inset-0 rounded-r-2xl rounded-l-md bg-[#EFE7DA] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)]">
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/25 to-transparent rounded-l-md" />
          </div>

          <div className="absolute inset-0 pl-3" style={{ transformStyle: 'preserve-3d' }}>
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={index}
                custom={dir}
                initial={reduced ? false : { rotateY: dir > 0 ? 80 : -80, opacity: 0.35 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={reduced ? undefined : { rotateY: dir > 0 ? -80 : 80, opacity: 0.35 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{
                  transformOrigin: dir > 0 ? 'left center' : 'right center',
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                }}
                className="absolute inset-0 rounded-r-2xl overflow-hidden bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
              >
                <img
                  src={optimizeImageUrl(pages[index], 1400)}
                  alt={`${name} menu, page ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                {/* Center-fold shading for book realism */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/15 to-transparent" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {pages.length > 1 && (
          <>
            <button
              type="button"
              disabled={!canPrev}
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="hidden sm:flex glass-dark absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="hidden sm:flex glass-dark absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Mobile tap zones + page dots */}
      {pages.length > 1 && (
        <div className="flex sm:hidden items-center justify-between px-8 pb-2">
          <button type="button" onClick={() => step(-1)} disabled={!canPrev} className="btn-ghost !py-2 !px-4 !text-xs disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button type="button" onClick={() => step(1)} disabled={!canNext} className="btn-ghost !py-2 !px-4 !text-xs disabled:opacity-30">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5 px-4 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDir(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[#F4B08A]' : 'w-1.5 bg-white/25 hover:bg-white/40'}`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
