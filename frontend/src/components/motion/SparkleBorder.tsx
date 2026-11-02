import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/* A spark of light that runs round a pill button's edge. With `popDelay`, the button
   also gives one small pop after that many seconds. */
export const SparkleBorder = ({ children, className = '', popDelay }: { children: ReactNode; className?: string; popDelay?: number }) => {
  const reduced = useReducedMotion();
  const pop = !reduced && popDelay !== undefined;
  return (
    <motion.span
      className={`sparkle-border ${className}`}
      animate={pop ? { scale: [1, 1.07, 1] } : undefined}
      transition={pop ? { duration: 0.6, delay: popDelay, ease: [0.22, 1, 0.36, 1] } : undefined}
    >
      {children}
    </motion.span>
  );
};
