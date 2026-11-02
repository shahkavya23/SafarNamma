import * as React from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ─── Stacked carousel ───
   A deck of cards: the front card sits upright and in reach, its neighbours tilt and
   shrink away behind it. Drag or swipe sideways (or use the arrows / ←→ keys) to spin
   the deck; a tap on a side card brings it forward. Everything inside the front card
   stays clickable, and vertical scrolling is left to the page. Three or more cards
   loop; two stop at each end, so the other card always peeks from the free side. */

interface CarouselStackedProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderCard: (item: T, state: { isActive: boolean }) => React.ReactNode;
  /** Width and height classes for each card */
  cardClassName: string;
  /** The card's width in px at a given window width, which sets how far the side cards sit */
  cardWidth: (windowWidth: number) => number;
  /** Bring this card to the front; pair with onActiveChange to stay in step with the deck */
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
  className?: string;
}

interface CarouselConfig {
  distanceDivisor: number;
  velocityDivisor: number;
  sensitivity: number;
  xMultiplier: number;
  yMultiplier: number;
  rotationMultiplier: number;
  scaleReduction: number;
}

const getCarouselConfig = (windowWidth: number, cardWidth: number): CarouselConfig => {
  if (windowWidth < 640) {
    return { distanceDivisor: 120, velocityDivisor: 500, sensitivity: 240, xMultiplier: cardWidth * 0.88, yMultiplier: 10, rotationMultiplier: 3, scaleReduction: 0.06 };
  }
  return { distanceDivisor: 200, velocityDivisor: 800, sensitivity: 300, xMultiplier: cardWidth * 0.62, yMultiplier: 22, rotationMultiplier: 5, scaleReduction: 0.1 };
};

const SPRING = { type: 'spring', stiffness: 200, damping: 30, mass: 1 } as const;
const DRAG_SLOP = 6;
const wrap = (i: number, n: number) => ((i % n) + n) % n;

const CarouselStacked = <T,>({
  items,
  getKey,
  renderCard,
  cardClassName,
  cardWidth,
  activeIndex,
  onActiveChange,
  className,
}: CarouselStackedProps<T>) => {
  const scrollProgress = useMotionValue(0);
  const startProgress = React.useRef(0);
  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);
  const [windowWidth, setWindowWidth] = React.useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );

  const total = items.length;
  const loops = total >= 3;
  // Where the deck may rest: anywhere when it loops, otherwise on a real card
  const settle = React.useCallback(
    (p: number) => (loops ? p : Math.max(0, Math.min(total - 1, p))),
    [loops, total],
  );

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const markActive = (next: number) => {
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    onActiveChange?.(next);
  };

  // A card was removed: land on a card that still exists
  React.useEffect(() => {
    if (!total) return;
    const next = wrap(Math.round(scrollProgress.get()), total);
    scrollProgress.set(next);
    markActive(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, scrollProgress]);

  const config = React.useMemo(() => getCarouselConfig(windowWidth, cardWidth(windowWidth)), [windowWidth, cardWidth]);

  useMotionValueEvent(scrollProgress, 'change', (p) => {
    if (total) markActive(wrap(Math.round(p), total));
  });

  const moveTo = (p: number) => {
    animate(scrollProgress, settle(p), SPRING);
  };
  const step = (dir: 1 | -1) => moveTo(Math.round(scrollProgress.get()) + dir);

  // Asked from outside to show a card: go the short way round
  React.useEffect(() => {
    if (activeIndex === undefined || !total) return;
    const target = wrap(activeIndex, total);
    if (target === activeRef.current) return;
    let diff = target - activeRef.current;
    if (loops) {
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
    }
    moveTo(Math.round(scrollProgress.get()) + diff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const handlePanEnd = (_: PointerEvent, info: PanInfo) => {
    const distanceShift = -info.offset.x / config.distanceDivisor;
    const velocityShift = -info.velocity.x / config.velocityDivisor;
    const totalShift = Math.max(-3, Math.min(3, Math.round(distanceShift + velocityShift)));
    moveTo(Math.round(startProgress.current) + totalShift);
  };

  // A click that follows a real drag is the end of the drag, not a tap on whatever was under it
  const handleClickCapture = (e: React.MouseEvent) => {
    const start = pointerStart.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_SLOP) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  };

  if (!total) return null;

  return (
    <div className={cn('relative flex flex-col items-center w-full overflow-x-clip select-none', className)}>
      <motion.div
        role="region"
        aria-roledescription="carousel"
        aria-label="Itineraries — drag, swipe or use the arrow keys"
        tabIndex={0}
        onKeyDown={handleKey}
        onPointerDownCapture={(e) => (pointerStart.current = { x: e.clientX, y: e.clientY })}
        onClickCapture={handleClickCapture}
        onPanStart={() => (startProgress.current = scrollProgress.get())}
        onPan={(_, info) => scrollProgress.set(settle(scrollProgress.get() - info.delta.x / config.sensitivity))}
        onPanEnd={handlePanEnd}
        style={{ touchAction: 'pan-y' }}
        className={cn(
          'relative isolate w-full grid place-items-center py-8 rounded-3xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
          total > 1 && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {items.map((item, i) => (
          <StackedCard
            key={getKey(item)}
            index={i}
            total={total}
            loops={loops}
            isActive={i === active}
            progress={scrollProgress}
            config={config}
            className={cardClassName}
            onBringForward={(diff) => moveTo(Math.round(scrollProgress.get()) + diff)}
          >
            {renderCard(item, { isActive: i === active })}
          </StackedCard>
        ))}
      </motion.div>

      {total > 1 && (
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!loops && active === 0}
            aria-label="Previous itinerary"
            className="w-10 h-10 rounded-full bg-paper border border-line text-ink flex items-center justify-center hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Drag to explore</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!loops && active === total - 1}
            aria-label="Next itinerary"
            className="w-10 h-10 rounded-full bg-paper border border-line text-ink flex items-center justify-center hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

interface StackedCardProps {
  index: number;
  total: number;
  loops: boolean;
  isActive: boolean;
  progress: MotionValue<number>;
  config: CarouselConfig;
  className: string;
  onBringForward: (diff: number) => void;
  children: React.ReactNode;
}

const StackedCard = ({ index, total, loops, isActive, progress, config, className, onBringForward, children }: StackedCardProps) => {
  const signedOffset = (p: number) => {
    let diff = index - p;
    if (loops) {
      diff %= total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
    }
    return diff;
  };
  const offset = useTransform(progress, signedOffset);

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : o * config.rotationMultiplier));
  const y = useTransform(offset, (o) => (Math.abs(o) < 0.05 ? 0 : Math.abs(o) * config.yMultiplier));
  const scale = useTransform(offset, (o) => 1 - Math.abs(o) * config.scaleReduction);
  // Only the front card and its neighbours show, so big cards never pile up behind each other
  const opacity = useTransform(offset, [-1.4, -1, 0, 1, 1.4], [0, 1, 1, 1, 0]);
  const pointerEvents = useTransform(offset, (o) => (Math.abs(o) > 1.2 ? 'none' : 'auto'));
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10));
  const shade = useTransform(offset, [-1, -0.3, 0, 0.3, 1], [0.45, 0.15, 0, 0.15, 0.45]);

  return (
    <motion.div
      style={{ x, rotate, y, scale, opacity, zIndex, pointerEvents }}
      onClick={isActive ? undefined : () => onBringForward(Math.round(signedOffset(progress.get())))}
      className={cn('col-start-1 row-start-1 relative', !isActive && 'cursor-pointer', className)}
    >
      {/* inert: side cards can't be tabbed into, and their clicks land on this wrapper */}
      <div inert={!isActive} className="w-full h-full">
        {children}
      </div>
      <motion.div style={{ opacity: shade }} className="absolute inset-0 rounded-[28px] bg-night pointer-events-none" />
    </motion.div>
  );
};

export default CarouselStacked;
