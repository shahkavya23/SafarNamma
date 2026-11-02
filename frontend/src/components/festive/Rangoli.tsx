import { motion, useReducedMotion, type Variants } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

const petal = (len: number, wid: number) =>
  `M0 0 C ${wid} ${-len * 0.35}, ${wid} ${-len * 0.75}, 0 ${-len} C ${-wid} ${-len * 0.75}, ${-wid} ${-len * 0.35}, 0 0 Z`;

interface Petal {
  d: string;
  transform: string;
  color: string;
  delay: number;
}

// A hollow medallion: every ring starts at radius 72, leaving the middle clear for content
const HOLE = 66;
const RINGS = [
  { n: 12, len: 26, wid: 10, off: 72, color: '#E0561F', delay: 0.1, rot: 0 },
  { n: 12, len: 18, wid: 7, off: 72, color: '#F2A516', delay: 0.3, rot: 15 },
  { n: 24, len: 8, wid: 3.5, off: 100, color: '#4E7262', delay: 0.6, rot: 7.5 },
];

const PETALS: Petal[] = RINGS.flatMap(({ n, len, wid, off, color, delay, rot }) =>
  Array.from({ length: n }, (_, i) => ({
    d: petal(len, wid),
    transform: `rotate(${rot + (360 / n) * i}) translate(0 ${-off})`,
    color,
    delay: delay + i * 0.03,
  }))
);

// Dots sit between the outer petals
const DOTS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  return { cx: Math.sin(a) * 104, cy: -Math.cos(a) * 104, color: i % 2 ? '#E0561F' : '#F2A516', delay: 1 + i * 0.02 };
});

const stroke: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (delay: number) => ({ pathLength: 1, opacity: 1, transition: { pathLength: { duration: 1.6, ease: EASE, delay }, opacity: { duration: 0.2, delay } } }),
};
const dot: Variants = {
  hidden: { opacity: 0, scale: 0 },
  show: (delay: number) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay } }),
};

/* A rangoli that draws itself stroke by stroke the first time it scrolls into view.
   Its centre (about 60% of its width) is left open, so a number or word can sit inside. */
export const Rangoli = ({ className = '' }: { className?: string }) => {
  const reduced = useReducedMotion();
  return (
    <motion.svg
      aria-hidden
      viewBox="-110 -110 220 220"
      className={className}
      initial={reduced ? 'show' : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
    >
      <motion.circle r={HOLE} stroke="#C99A3B" strokeWidth={1.2} fill="none" variants={stroke} custom={0} />
      {PETALS.map((p, i) => (
        <motion.path key={i} d={p.d} transform={p.transform} stroke={p.color} strokeWidth={1.6} fill="none" variants={stroke} custom={p.delay} />
      ))}
      {DOTS.map((d, i) => (
        <motion.circle key={i} cx={d.cx} cy={d.cy} r={2.4} fill={d.color} variants={dot} custom={d.delay} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      ))}
    </motion.svg>
  );
};
