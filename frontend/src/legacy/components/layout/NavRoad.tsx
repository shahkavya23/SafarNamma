import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

/* ─── The road out of the "N" ───
   In the SafarNamma logo, a winding road runs through the N of "Namma".
   Here that road keeps going: it slips out of the bottom of the N, dips to
   the navbar's lower edge and becomes the bar's border, with the logo's
   yellow centre line. A little jeep drives along it as you scroll the page,
   so the navbar doubles as a reading-progress bar. */

// Logo geometry (source image 1024 × 682). Where the N's road meets the bottom of the letter.
export const LOGO_HEIGHT = 58;
const LOGO_RATIO = 1024 / 682;
const EXIT = { x: 0.215, y: 0.885 };

const ASPHALT = '#1E3E44';
const EDGE = '#E9DDB0';
const LINE = '#F2C94C';

interface NavRoadProps {
  /** Left padding before the logo, in px. */
  logoLeft: number;
  /** Bar height, in px. */
  barHeight: number;
  /** Where the road should end (px from the right edge), so it tucks under the right-hand controls. */
  endInset: number;
}

const Jeep = () => (
  <g>
    {/* spare wheel */}
    <rect x={-13.5} y={-10.5} width={2.4} height={5} rx={1} fill="#16353A" />
    {/* body */}
    <rect x={-11.5} y={-11.5} width={23} height={6.5} rx={2} fill="#2A7C84" />
    {/* cabin + windscreen */}
    <path d="M -8 -11.5 L -6 -16.5 L 3.5 -16.5 L 6 -11.5 Z" fill="#2A7C84" />
    <path d="M -5.2 -12.2 L -4 -15.3 L 2.6 -15.3 L 4.3 -12.2 Z" fill="#BFE6E8" opacity={0.9} />
    {/* roof rack */}
    <rect x={-6.5} y={-18} width={9.5} height={1.2} rx={0.6} fill="#16353A" />
    {/* headlight */}
    <circle cx={10.6} cy={-8.6} r={1.2} fill={LINE} />
    {/* wheels */}
    {[-6.5, 6.5].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={-4.2} r={2.9} fill="#10272B" />
        <circle cx={cx} cy={-4.2} r={1.1} fill="#C9D4D2" />
      </g>
    ))}
  </g>
);

export const NavRoad = ({ logoLeft, barHeight, endInset }: NavRoadProps) => {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where the road leaves the N
  const logoTop = (barHeight - LOGO_HEIGHT) / 2;
  const nx = logoLeft + LOGO_HEIGHT * LOGO_RATIO * EXIT.x;
  const ny = logoTop + LOGO_HEIGHT * EXIT.y;
  const roadY = barHeight - 4;
  const logoRight = logoLeft + LOGO_HEIGHT * LOGO_RATIO;
  const straightStart = nx + 26;
  const jeepStart = logoRight + 18;
  const end = Math.max(straightStart + 40, width - endInset);

  const d = `M ${nx} ${ny - 3} C ${nx + 2} ${ny + 5}, ${nx + 10} ${roadY}, ${straightStart} ${roadY} L ${end} ${roadY}`;

  // The jeep drives from the N to the end of the road as the page scrolls
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const source = reduced ? scrollYProgress : smooth;
  const x = useTransform(source, [0, 1], [jeepStart, end - 16]);

  // Face the way we're travelling
  const [facing, setFacing] = useState(1);
  const last = useRef(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (Math.abs(v - last.current) < 0.002) return;
    setFacing(v >= last.current ? 1 : -1);
    last.current = v;
  });

  if (!width) return <svg ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;

  return (
    <svg ref={ref} className="absolute inset-0 z-20 w-full h-full pointer-events-none overflow-visible" viewBox={`0 0 ${width} ${barHeight}`} aria-hidden>
      {/* Road: cream verge, asphalt, yellow centre dashes */}
      <path d={d} fill="none" stroke={EDGE} strokeWidth={10} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ASPHALT} strokeWidth={7.5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={LINE} strokeWidth={1.4} strokeDasharray="6 6" strokeLinecap="round" />

      {/* Jeep */}
      <motion.g style={{ x, y: roadY - 0.5 }}>
        <motion.g animate={{ scaleX: facing }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <motion.g animate={reduced ? undefined : { y: [0, -0.6, 0] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}>
            <Jeep />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  );
};
