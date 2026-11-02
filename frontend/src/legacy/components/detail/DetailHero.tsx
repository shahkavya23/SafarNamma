import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Expand } from 'lucide-react';
import { optimizeImageUrl } from '../../utils/images';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

interface DetailHeroProps {
  /** First photo is the lead; the second (if any) sits in front of it. */
  photos: string[];
  fallback: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  photoLabel?: string;
  onOpenPhotos?: () => void;
  /** A shorter band for pages with little hero text; a lone photo then fills its column. */
  compact?: boolean;
}

/* ─── Shared hero for place and group detail pages ───
   A night backdrop lit by a blurred copy of the lead photo, the title on the left,
   and a two-photo collage on the right that wipes open and drifts with the scroll.
   Framing the photos (instead of stretching one full-bleed) keeps portrait and
   low-resolution uploads looking sharp. */
export const DetailHero = ({ photos, fallback, eyebrow, title, meta, actions, photoLabel, onOpenPhotos, compact }: DetailHeroProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const leadY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
  const frontY = useTransform(scrollYProgress, [0, 1], ['0%', '-32%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1.25, 1.45]);

  const lead = optimizeImageUrl(photos[0], 1400) || fallback;
  const front = photos[1] ? optimizeImageUrl(photos[1], 900) : undefined;
  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!img.src.endsWith(fallback)) img.src = fallback;
  };

  const wipe = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { clipPath: 'inset(100% 0% 0% 0% round 32px)' },
          animate: { clipPath: 'inset(0% 0% 0% 0% round 32px)' },
          transition: { duration: 1.3, ease: EASE, delay },
        };

  return (
    <section ref={ref} className={cn('relative overflow-hidden bg-night grain', compact ? 'pt-28 lg:pt-32 pb-32 lg:pb-36' : 'pt-32 lg:pt-36 pb-40 lg:pb-44')}>
      {/* Ambient light from the photo itself */}
      <motion.img
        src={lead}
        alt=""
        aria-hidden
        referrerPolicy="no-referrer"
        onError={onError}
        style={reduced ? { scale: 1.3 } : { scale: glowScale }}
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-45 saturate-150"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/40" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-page grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        <motion.div className="on-photo lg:col-span-6" style={reduced ? undefined : { y: textY }}>
          {eyebrow && <div className="mb-6 animate-fade-up">{eyebrow}</div>}
          {title}
          {meta && <div className="mt-6 animate-fade-up delay-400">{meta}</div>}
          {actions && <div className="flex flex-wrap gap-3 mt-9 animate-fade-up delay-500">{actions}</div>}
        </motion.div>

        <div className={cn('lg:col-span-6 relative', compact ? 'h-[260px] sm:h-[340px] lg:h-[400px]' : 'h-[380px] sm:h-[480px] lg:h-[560px]')}>
          <motion.div className={cn('absolute right-0 top-0', compact && !front ? 'w-full h-full' : 'w-[82%] h-[84%]')} style={reduced ? undefined : { y: leadY }}>
            <motion.div {...wipe(0.15)} className="w-full h-full rounded-[32px] overflow-hidden bg-night-soft shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
              <img src={lead} alt="" referrerPolicy="no-referrer" onError={onError} fetchPriority="high" className="w-full h-full object-cover" />
            </motion.div>
            {onOpenPhotos && (
              <button onClick={onOpenPhotos} className="absolute right-4 top-4 badge glass-dark !py-2 !px-3 hover:bg-night/70 transition-colors">
                <Expand className="w-3.5 h-3.5" /> {photoLabel ?? 'View photos'}
              </button>
            )}
          </motion.div>

          {front && (
            <motion.div className="absolute left-0 bottom-0 w-[42%] h-[50%] z-10" style={reduced ? undefined : { y: frontY }}>
              <motion.div {...wipe(0.45)} className="w-full h-full rounded-[26px] overflow-hidden bg-night-soft ring-[8px] ring-night shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
                <img src={front} alt="" referrerPolicy="no-referrer" onError={onError} className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

/** A paper card of key facts that overlaps the bottom of the DetailHero. */
export const FactsCard = ({ facts }: { facts: { icon: React.ComponentType<{ className?: string }>; label: string; value: ReactNode; accent?: boolean }[] }) => {
  const reduced = useReducedMotion();
  return (
    <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-page -mt-24">
      <motion.dl
        initial={reduced ? false : 'hidden'}
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
        className="rounded-[28px] overflow-hidden border border-line bg-[#E3DACB] card-shadow-hover flex flex-wrap gap-px"
      >
        {facts.map(({ icon: Icon, label, value, accent }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
            className="bg-paper p-5 sm:p-6 flex gap-3.5 flex-1 basis-[150px] sm:basis-[210px]"
          >
            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent ? 'bg-accent-soft text-accent-text' : 'bg-stone text-ink')}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-label text-muted mb-1">{label}</dt>
              <dd className="font-display text-lg text-ink leading-snug break-words">{value}</dd>
            </div>
          </motion.div>
        ))}
      </motion.dl>
    </div>
  );
};
