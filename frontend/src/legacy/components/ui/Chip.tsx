import type { ReactNode } from 'react';
import { motion } from 'motion/react';

/* Filter chip with a shared sliding fill: chips in the same `group` pass the dark fill between them. */
export const Chip = ({ active, onClick, children, group }: { active: boolean; onClick: () => void; children: ReactNode; group: string }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className="chip shrink-0">
    {active && (
      <motion.span layoutId={`chip-fill-${group}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
    )}
    <span className="relative z-10 flex items-center gap-1.5">{children}</span>
  </button>
);
