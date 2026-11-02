import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { isDiwaliSeason } from '../../utils/festive';

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

const MARIGOLD = ['#F28C28', '#FFC15E'];
const BULBS = ['#FFC15E', '#FF7A59', '#FFE9A8', '#F28C28'];
const SPARK_COLORS = ['#FFF4D6', '#FFC15E', '#FFE9A8', '#FF7A59'];

// Diwali dress-up: a diya on the roof rack, fairy lights along the roof, a marigold garland on the bonnet
const DiwaliDecor = () => (
  <g>
    {/* fairy lights strung from the rack down to the bumpers */}
    <path d="M -11.5 -11 Q -9 -14.5 -6.5 -17.4 M 3 -17.4 Q 8 -14.5 11.5 -11" fill="none" stroke="#5A3A1E" strokeWidth={0.35} />
    {[
      [-10.4, -12.6],
      [-8.6, -14.8],
      [4.9, -15.9],
      [7.4, -14.1],
      [9.9, -12.3],
    ].map(([cx, cy], i) => (
      <circle key={`b${i}`} cx={cx} cy={cy} r={0.7} fill={BULBS[i % BULBS.length]} />
    ))}
    {/* marigold garland draped across the body */}
    {Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return <circle key={`m${i}`} cx={-10 + t * 20} cy={-10.6 + Math.sin(t * Math.PI) * 1.6} r={0.95} fill={MARIGOLD[i % 2]} />;
    })}
    {/* diya on the roof rack: warm glow, clay bowl, flame */}
    <circle cx={-1.5} cy={-21} r={3.2} fill="#FFC15E" opacity={0.22} />
    <path d="M -3.6 -18.4 Q -1.5 -16.4 0.6 -18.4 Z" fill="#C8692B" />
    <path d="M -1.5 -22.6 Q -0.4 -20.6 -1.5 -19 Q -2.6 -20.6 -1.5 -22.6 Z" fill="#FFC15E" />
    <path d="M -1.5 -21.4 Q -1 -20.4 -1.5 -19.5 Q -2 -20.4 -1.5 -21.4 Z" fill="#FF7A59" />
  </g>
);

// Phuljhadi held out the back. It always shows a lit starburst; sparks only fly while the
// jeep is moving, so a parked page stays idle
const SPARKLER_TIP = { x: -17, y: -20 };
const RAYS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const len = i % 2 ? 2.6 : 4.2;
  return { x: Math.cos(angle) * len, y: Math.sin(angle) * len };
});
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  // Fan backwards and upwards, away from the direction of travel
  const angle = (190 + (i / 13) * 130) * (Math.PI / 180);
  const reach = 6 + (i % 3) * 2.2;
  return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, delay: (i * 0.06) % 0.5, color: SPARK_COLORS[i % SPARK_COLORS.length] };
});

const Sparkler = ({ lit }: { lit: boolean }) => (
  <g>
    <line x1={-11.5} y1={-11} x2={SPARKLER_TIP.x} y2={SPARKLER_TIP.y} stroke="#8A8F90" strokeWidth={0.7} strokeLinecap="round" />
    <g transform={`translate(${SPARKLER_TIP.x} ${SPARKLER_TIP.y})`}>
      <circle r={lit ? 4.4 : 3.4} fill="#FFC15E" opacity={0.3} />
      {RAYS.map((r, i) => (
        <line key={i} x1={0} y1={0} x2={r.x} y2={r.y} stroke={i % 2 ? '#FF9A3C' : '#FFE9A8'} strokeWidth={0.55} strokeLinecap="round" />
      ))}
      <circle r={1.1} fill="#FFFFFF" />
      {lit &&
        SPARKS.map((sp, i) => (
          <motion.circle
            key={i}
            r={0.75}
            fill={sp.color}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: [0, sp.dx], y: [0, sp.dy + 2], opacity: [1, 0] }}
            transition={{ duration: 0.55, delay: sp.delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
    </g>
  </g>
);

const Jeep = ({ festive, sparking }: { festive: boolean; sparking: boolean }) => (
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
    {festive && <circle cx={12.2} cy={-8.6} r={2.6} fill="#FFC15E" opacity={0.3} />}
    <circle cx={10.6} cy={-8.6} r={1.2} fill={LINE} />
    {/* wheels */}
    {[-6.5, 6.5].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={-4.2} r={2.9} fill="#10272B" />
        <circle cx={cx} cy={-4.2} r={1.1} fill="#C9D4D2" />
      </g>
    ))}
    {festive && <DiwaliDecor />}
    {festive && <Sparkler lit={sparking} />}
  </g>
);

export const NavRoad = ({ logoLeft, barHeight, endInset }: NavRoadProps) => {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const [festive] = useState(() => isDiwaliSeason());

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
  // The engine only bounces while the jeep is moving. A bounce that never stops repaints the
  // navbar every frame, and on long pages that keeps the main thread busy and makes scrolling stutter
  const [driving, setDriving] = useState(false);
  const parkTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(parkTimer.current), []);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setDriving(true);
    window.clearTimeout(parkTimer.current);
    parkTimer.current = window.setTimeout(() => setDriving(false), 250);
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
          <motion.g
            animate={reduced || !driving ? { y: 0 } : { y: [0, -0.6, 0] }}
            transition={driving ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          >
            <Jeep festive={festive} sparking={driving && !reduced} />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  );
};
