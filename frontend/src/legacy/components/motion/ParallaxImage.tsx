import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

interface ParallaxImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'style'> {
  /** Total drift as a percentage of the frame height (e.g. 12 → ±6%). */
  strength?: number;
  /** Class for the clipping frame. */
  frameClassName?: string;
  /** Class for the image itself. */
  className?: string;
  priority?: boolean;
}

/* An image that drifts slower than the page inside its own clipping frame. */
export const ParallaxImage = ({ strength = 14, frameClassName = '', className = '', priority, ...img }: ParallaxImageProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength / 2}%`, `${strength / 2}%`]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${frameClassName}`}>
      <motion.img
        {...(img as object)}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        style={reduced ? { scale: 1 } : { y, scale: 1 + strength / 100 }}
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
    </div>
  );
};
