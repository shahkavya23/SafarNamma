import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ChevronsDown } from 'lucide-react';

/* ─── Perspective tunnel hero ───
   Photos fly out of the distance and past the viewer while the copy holds still in the
   middle. One value drives it all: a short share plays by itself once the photos are
   ready, and the page's own scroll plays the rest, so wheel, touch, keyboard and
   scrollbar all work and the page is never trapped. The section pins itself while the
   tunnel plays, then lets go. Reduced-motion users get a still arrangement, unpinned. */

export interface TunnelItem {
  src: string;
  title: string;
  onSelect?: () => void;
}

interface PerspectiveTunnelHeroProps {
  items: TunnelItem[];
  /** The photos are in: start the fly-out */
  ready: boolean;
  scrollHint?: string;
  children: ReactNode;
}

// How much of the tunnel plays on load, so the first view already has photos in it
const INTRO_SHARE = 0.38;
const INTRO_SECONDS = 1.4;
const STILL_PROGRESS = 0.42;
const STAGGER_SPAN = 0.55;
const POINTER_SPRING = { stiffness: 60, damping: 25, mass: 0.5 };

interface Stage {
  width: number;
  height: number;
  isMobile: boolean;
}

const readStage = (): Stage => ({
  width: window.innerWidth,
  height: window.innerHeight,
  isMobile: window.innerWidth < 768,
});

// Mouse only: on touch there is no pointer to follow
const usePointerParallax = (enabled: boolean) => {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, POINTER_SPRING);
  const y = useSpring(rawY, POINTER_SPRING);

  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
};

interface TunnelCardProps {
  item: TunnelItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  stage: Stage;
}

const TunnelCard = ({ item, index, total, progress, pointer, stage }: TunnelCardProps) => {
  const start = (index / total) * (1 - STAGGER_SPAN);
  const local = useTransform(progress, [start, start + STAGGER_SPAN], [0, 1]);

  const farZ = stage.isMobile ? -1200 : -1700;
  const nearZ = stage.isMobile ? 350 : 500;
  const z = useTransform(local, [0, 1], [farZ, nearZ]);
  const opacity = useTransform(local, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);
  const pointerEvents = useTransform(local, (l) => (l > 0.05 && l < 0.95 ? 'auto' : 'none'));

  const goldenAngle = index * 137.5 * (Math.PI / 180);
  const baseX = Math.cos(goldenAngle) * stage.width * (0.28 + (index % 3) * 0.08);
  const baseY = Math.sin(goldenAngle) * stage.height * (0.26 + (index % 2) * 0.09);
  const rotateZ = (index % 2 === 0 ? 1 : -1) * (3 + (index % 5) * 2);
  const panStrength = stage.isMobile ? 20 : 45;

  const width = stage.isMobile
    ? Math.max(100, Math.min(140, stage.width * 0.32))
    : Math.max(180, Math.min(270, stage.width * 0.18));

  const transform = useTransform([z, pointer.x, pointer.y], ([currZ, px, py]: number[]) => {
    const offsetX = baseX - px * panStrength;
    const offsetY = baseY - py * panStrength;
    return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${rotateZ}deg)`;
  });

  return (
    <motion.button
      type="button"
      // The route chips offer the same thing to keyboards and screen readers
      tabIndex={-1}
      aria-hidden
      onClick={item.onSelect}
      style={{ width, transform, opacity, pointerEvents, zIndex: index + 1 }}
      className="group absolute left-1/2 top-1/2 aspect-[4/5] will-change-transform select-none cursor-pointer"
    >
      <span className="relative block h-full w-full overflow-hidden rounded-2xl bg-stone shadow-[0_24px_60px_-20px_rgba(14,31,34,0.55)] ring-1 ring-ink/10 transition-shadow duration-500 group-hover:ring-2 group-hover:ring-accent">
        <img
          src={item.src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <span className="absolute inset-0 flex items-end p-3 sm:p-4 bg-linear-to-t from-night/80 via-night/10 to-transparent text-left">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-white line-clamp-2">
            {item.title}
          </span>
        </span>
      </span>
    </motion.button>
  );
};

const PerspectiveTunnelHero = ({ items, ready, scrollHint, children }: PerspectiveTunnelHeroProps) => {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<Stage>(readStage);

  useEffect(() => {
    const onResize = () => setStage(readStage());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const scrolled = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.0005 });

  const intro = useMotionValue(0);
  useEffect(() => {
    if (!ready || reduced) return;
    const controls = animate(intro, 1, { duration: INTRO_SECONDS, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [ready, reduced, intro]);

  const progress = useTransform([intro, scrolled], ([i, s]: number[]) =>
    reduced ? STILL_PROGRESS : INTRO_SHARE * i + (1 - INTRO_SHARE) * s,
  );

  const pointer = usePointerParallax(!reduced);

  // The copy stays solid and leaves with the section when the pin lets go, so the view is never empty
  const copyScale = useTransform(scrolled, [0, 0.72], [1, 1.06]);
  const hintOpacity = useTransform(scrolled, [0, 0.08], [1, 0]);

  const cards = useMemo(() => items.map((item, index) => ({ item, index })), [items]);

  return (
    <section ref={sectionRef} className={`relative w-full bg-sand ${reduced ? 'h-[100dvh]' : 'h-[240dvh]'}`}>
      <div
        className="sticky top-0 h-[100dvh] w-full overflow-hidden flex items-center justify-center select-none"
        style={{ perspective: stage.isMobile ? '900px' : '1200px' }}
      >
        {/* Backdrop: dotted ground, warm glow and two depth rings to fly through */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(16,42,46,0.16)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(224,86,31,0.14)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute h-[48vmin] w-[48vmin] rounded-full border border-accent/15" />
        <div className="pointer-events-none absolute h-[76vmin] w-[76vmin] rounded-full border border-dashed border-ink/15" />

        {/* The 3D plane; flattened below the copy, so a photo can never cover the words */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{ transformStyle: 'preserve-3d' }}>
          {cards.map(({ item, index }) => (
            <TunnelCard
              key={item.src}
              item={item}
              index={index}
              total={cards.length}
              progress={progress}
              pointer={pointer}
              stage={stage}
            />
          ))}
        </div>

        {/* Soft pool of sand behind the words so they read over any photo */}
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 mt-16 h-[min(46dvh,340px)] w-[min(860px,110vw)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(242,236,227,0.82)_0%,rgba(242,236,227,0.55)_50%,transparent_72%)]"
        />

        {/* Still version has no scroll distance, so nothing here may depend on scroll */}
        <motion.div
          style={reduced ? undefined : { scale: copyScale }}
          className="relative z-30 w-full max-w-4xl px-5 pt-16"
        >
          {children}
        </motion.div>

        {scrollHint && !reduced && (
          <motion.div
            style={{ opacity: hintOpacity }}
            className="pointer-events-none absolute bottom-5 z-30 flex items-center gap-1.5 rounded-full bg-paper/90 border border-line px-3.5 py-1.5 text-xs font-semibold text-ink"
          >
            <ChevronsDown className="w-3.5 h-3.5 text-accent motion-safe:animate-bounce" />
            {scrollHint}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PerspectiveTunnelHero;
