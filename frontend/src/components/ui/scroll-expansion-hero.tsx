import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronsDown } from 'lucide-react';
import { setScrollLocked } from '../../hooks/useLenis';

/* ─── Scroll-to-expand media hero ───
   Opens as a small framed photo/video over a backdrop. Wheel, touch or the keyboard
   grow it to fill the screen while the title splits apart; page scrolling stays
   locked until it is fully open, then the children fade in below. Scrolling back
   up at the top of the page shrinks it again. Reduced-motion users get it open. */

interface ScrollExpandMediaProps {
  mediaType?: 'video' | 'image';
  mediaSrc: string;
  posterSrc?: string;
  bgImageSrc: string;
  title?: string;
  /** Small line above the title, e.g. "4 stops · 3 hours" */
  date?: string;
  scrollToExpand?: string;
  textBlend?: boolean;
  children?: ReactNode;
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

const ScrollExpandMedia = ({
  mediaType = 'image',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
}: ScrollExpandMediaProps) => {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [expanded, setExpanded] = useState(!!reduced);
  const [isMobile, setIsMobile] = useState(false);

  // Refs so the window listeners are bound once instead of on every frame
  const progressRef = useRef(progress);
  const expandedRef = useRef(expanded);
  const touchY = useRef(0);

  useEffect(() => {
    if (reduced) return;

    const apply = (next: number) => {
      const p = clamp01(next);
      progressRef.current = p;
      setProgress(p);
      if (p >= 1) {
        expandedRef.current = true;
        setExpanded(true);
      }
    };

    const collapse = () => {
      expandedRef.current = false;
      setExpanded(false);
    };

    const onWheel = (e: WheelEvent) => {
      if (expandedRef.current) {
        if (e.deltaY < 0 && window.scrollY <= 5) {
          e.preventDefault();
          collapse();
        }
        return;
      }
      e.preventDefault();
      apply(progressRef.current + e.deltaY * 0.0009);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchY.current) return;
      const y = e.touches[0].clientY;
      const delta = touchY.current - y;

      if (expandedRef.current) {
        if (delta < -20 && window.scrollY <= 5) {
          e.preventDefault();
          collapse();
        }
        return;
      }
      e.preventDefault();
      // Scrolling back is a little more sensitive so it never feels stuck
      apply(progressRef.current + delta * (delta < 0 ? 0.008 : 0.005));
      touchY.current = y;
    };

    const onTouchEnd = () => {
      touchY.current = 0;
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (!expandedRef.current) {
        if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) {
          e.preventDefault();
          apply(e.key === 'End' ? 1 : progressRef.current + 0.25);
        } else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) {
          e.preventDefault();
          apply(e.key === 'Home' ? 0 : progressRef.current - 0.25);
        }
      } else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key) && window.scrollY <= 5) {
        e.preventDefault();
        collapse();
      }
    };

    // If the page moves some other way (scrollbar drag, devtools, resize), open fully so the
    // content below is never sitting there invisible
    const onScroll = () => {
      if (!expandedRef.current && window.scrollY > 10) apply(1);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [reduced]);

  // Hold the page still until the media has fully opened
  useEffect(() => {
    if (reduced) return;
    setScrollLocked(!expanded);
    return () => setScrollLocked(false);
  }, [expanded, reduced]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Grows from a framed card to the full viewport, so no bare dark frame is left around it
  const mediaWidth = `calc(300px + (100vw - 300px) * ${progress})`;
  const mediaHeight = `calc(400px + (100dvh - 400px) * ${progress})`;
  const textShift = progress * (isMobile ? 180 : 150);
  const showContent = expanded || progress >= 0.75;

  const words = title ? title.trim().split(/\s+/) : [];
  const firstWord = words[0] ?? '';
  const restOfTitle = words.slice(1).join(' ');

  return (
    <div className="overflow-x-clip">
      <section className="relative min-h-[100dvh] bg-night isolate">
        {/* Backdrop fades away as the media grows */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 - progress }}
          transition={{ duration: 0.1 }}
        >
          <img src={bgImageSrc} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-night/45" />
        </motion.div>

        <div className="relative flex flex-col items-center justify-center w-full h-[100dvh]">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            style={{
              width: mediaWidth,
              height: mediaHeight,
              maxWidth: '100vw',
              borderRadius: `${28 * (1 - progress)}px`,
              boxShadow: `0 30px 80px -20px rgba(0, 0, 0, ${0.55 * (1 - progress)})`,
            }}
          >
            {mediaType === 'video' ? (
              <video
                src={mediaSrc}
                poster={posterSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover pointer-events-none"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
              />
            ) : (
              <img src={mediaSrc} alt={title || ''} className="w-full h-full object-cover" />
            )}
            <motion.div
              className="absolute inset-0 bg-night"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0.5 - progress * 0.3 }}
              transition={{ duration: 0.2 }}
            />
          </div>

          {/* Soft dark pool behind the words so they read over any photo */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,110vw)] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,31,34,0.75)_0%,rgba(14,31,34,0.45)_45%,transparent_72%)]"
            style={{ opacity: 1 - progress }}
          />

          <div
            className={`relative z-10 flex flex-col items-center gap-3 text-center px-4 ${
              textBlend ? 'mix-blend-difference' : ''
            }`}
          >
            {date && (
              <p
                className="inline-flex items-center rounded-full bg-night/70 backdrop-blur-md border border-white/15 px-4 py-1.5 font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-sand font-bold"
                style={{ transform: `translateX(-${textShift}vw)` }}
              >
                {date}
              </p>
            )}
            <h1
              className="font-display font-semibold text-5xl md:text-6xl lg:text-7xl text-white leading-none [text-shadow:0_2px_4px_rgba(0,0,0,0.6),0_8px_32px_rgba(0,0,0,0.55)]"
              style={{ transform: `translateX(-${textShift}vw)` }}
            >
              {firstWord}
            </h1>
            {restOfTitle && (
              <h1
                className="font-display font-semibold italic text-5xl md:text-6xl lg:text-7xl text-[#FF9A5C] leading-none [text-shadow:0_2px_4px_rgba(0,0,0,0.65),0_8px_32px_rgba(0,0,0,0.55)]"
                style={{ transform: `translateX(${textShift}vw)` }}
              >
                {restOfTitle}
              </h1>
            )}
            {scrollToExpand && (
              <p
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-night/70 backdrop-blur-md border border-white/15 px-4 py-2 text-sm font-semibold text-white"
                style={{ transform: `translateX(${textShift}vw)`, opacity: 1 - progress * 1.5 }}
              >
                <ChevronsDown className="w-4 h-4 text-[#FF9A5C] motion-safe:animate-bounce" />
                {scrollToExpand}
              </p>
            )}
          </div>
        </div>

        {/* Melts the open photo into the sand page below instead of a hard dark edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-sand via-sand/60 to-transparent"
          style={{ opacity: progress }}
        />
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.7 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default ScrollExpandMedia;
