import { motion, useReducedMotion } from 'motion/react';
import { Counter } from '../motion/Counter';

const SIZE = 112;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const LENGTH = 2 * Math.PI * RADIUS;

/** How full the trip is: a ring that fills as it scrolls into view, around the number going. */
export const SeatsRing = ({ joined, max }: { joined: number; max: number }) => {
  const reduced = useReducedMotion();
  const share = Math.min(1, joined / Math.max(1, max));
  const offset = LENGTH * (1 - share);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }} role="img" aria-label={`${joined} of ${max} seats taken`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-stone" />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={LENGTH}
          className="stroke-accent"
          initial={reduced ? false : { strokeDashoffset: LENGTH }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={reduced ? { strokeDashoffset: offset } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <Counter value={joined} duration={1.2} className="font-display text-3xl leading-none text-ink" />
        <span className="text-[11px] text-muted mt-1">of {max}</span>
      </div>
    </div>
  );
};
