import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

interface HorizontalScrollerProps {
  /** Rendered in the sticky frame above the track (title, counter…). */
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  trackClassName?: string;
}

/* A pinned section: while it is on screen, vertical scrolling slides the track sideways.
   Falls back to a native swipeable row on small screens and for reduced motion.
   Both modes render the same element tree, so switching never remounts the children
   (a remount resets their measured sizes, which used to make the strip flicker between modes). */
export const HorizontalScroller = ({ header, children, className = '', trackClassName = '' }: HorizontalScrollerProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);
  const count = Children.count(children);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Pinning depends on the screen only. It used to depend on the measured overflow too,
    // which differs between the two layouts, so the strip could flip modes mid-scroll and
    // grow or shrink the page by thousands of pixels, throwing the reader up or down the page.
    const measure = () => {
      setPinned(window.matchMedia('(min-width: 1024px)').matches && !reduced);
      const next = Math.max(0, track.scrollWidth - window.innerWidth);
      // Ignore sub-pixel wobble so the section height (and the page) stays put
      setDistance((d) => (Math.abs(d - next) > 2 ? next : d));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    // Children can change width after mount (e.g. photos sizing to their natural shape)
    Array.from(track.children).forEach((c) => ro.observe(c));
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [reduced, count]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, pinned ? -distance : 0]);
  const progress = useTransform(smooth, [0, 1], ['0%', '100%']);

  return (
    <section
      ref={sectionRef}
      className={`relative ${className}`}
      style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? 'sticky top-0 h-screen flex flex-col justify-center overflow-hidden pt-44 pb-6' : ''}>
        {header}
        <motion.div
          ref={trackRef}
          style={{ x }}
          className={`flex ${pinned ? 'gap-6 will-change-transform' : 'gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2'} ${trackClassName}`}
        >
          {children}
        </motion.div>
        {pinned && (
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 mt-8">
            <div className="h-px bg-line relative overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 bg-ink" style={{ width: progress }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
