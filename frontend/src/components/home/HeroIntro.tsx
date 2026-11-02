import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { CarFront, MapPin } from 'lucide-react';
import { INTRO_POP } from '../../hooks/useIntroOnce';

const EASE = [0.22, 1, 0.36, 1] as const;

// Timeline, in seconds from page open
const ROAD_START = 0.3;
const ROAD_DRAW = 1.2;
const CAR_START = 0.6;
const CAR_DRIVE = 1.3;
const CREW_START = 0.5;
const CREW_TRAVEL = 2.0;

const PHONE_MAX = 640;
const CAR_SIZE = 32;
const CREW_SIZE = 32;
const CREW_TONES = ['bg-ink', 'bg-accent', 'bg-sage', 'bg-gold', 'bg-ink', 'bg-accent'];
// Where each traveller drifts in from: right side (over the photos), below, left edge
const CREW_FROM = [
  { dx: 1.15, dy: 0.15 },
  { dx: 1.3, dy: 0.55 },
  { dx: 1.1, dy: 0.9 },
  { dx: 0.4, dy: 1.15 },
  { dx: -0.15, dy: 0.75 },
  { dx: -0.2, dy: 0.35 },
];

type Box = { x: number; y: number; w: number; h: number };
type Geometry = { width: number; height: number; from: Box; to: Box; proof?: Box; phone: boolean };

/* Position of an element inside the container, from offsets so in-flight CSS transforms don't skew it. */
const boxWithin = (el: HTMLElement, container: HTMLElement): Box => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};

/* Opening scene for the hero: a road draws itself from Bengaluru to the Host button, a car drives
   along it and parks, and a few travellers gather round the button before settling into the
   "already going" row. Purely decorative; clicks pass straight through. */
export const HeroIntro = ({
  play,
  container,
  from,
  to,
  proof,
  hasProof,
  ready,
}: {
  /** Animate the scene; otherwise only the settled road and parked car are drawn. */
  play: boolean;
  container: RefObject<HTMLElement | null>;
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
  proof: RefObject<HTMLElement | null>;
  /** Real travellers to land on; without them the crew fades out at the button. */
  hasProof: boolean;
  /** Trip data has arrived (or failed); the crew starts then. */
  ready: boolean;
}) => {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const drive = useMotionValue(play ? 0 : 100);
  const offsetDistance = useTransform(drive, (v) => `${v}%`);

  // A passive effect, not a layout one: the parent column and the pill/button refs attach after this
  // component's layout effects run, so they'd still be null there
  useEffect(() => {
    const box = container.current;
    if (!box) return;
    const measure = () => {
      if (!from.current || !to.current) return;
      setGeo({
        width: box.offsetWidth,
        height: box.offsetHeight,
        from: boxWithin(from.current, box),
        to: boxWithin(to.current, box),
        proof: proof.current ? boxWithin(proof.current, box) : undefined,
        phone: window.innerWidth < PHONE_MAX,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [container, from, to, proof]);

  useLayoutEffect(() => {
    if (!play) return;
    const run = animate(drive, 100, { duration: CAR_DRIVE, delay: CAR_START, ease: EASE });
    return () => run.stop();
  }, [play, drive]);

  if (!geo) return null;
  const { width, height, from: pill, to: host, phone } = geo;

  // The car parks just past the Host button (above it on phones, where the row can wrap)
  const park = phone
    ? { x: Math.min(host.x + host.w - CAR_SIZE / 2, width - CAR_SIZE / 2), y: host.y - CAR_SIZE / 2 - 6 }
    : { x: Math.min(host.x + host.w + CAR_SIZE, width - CAR_SIZE / 2), y: host.y + host.h / 2 };
  const pin = { x: pill.x + pill.w + 18, y: pill.y + pill.h / 2 };
  const edge = width - 8;
  const road = phone
    ? `M ${-CAR_SIZE} ${park.y} L ${park.x} ${park.y}`
    : `M ${pin.x} ${pin.y} C ${Math.min(edge, pin.x + 260)} ${pin.y + 40}, ${Math.min(edge, park.x + 140)} ${park.y - 180}, ${park.x} ${park.y}`;

  return (
    <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
      {!phone && (
        <svg className="absolute inset-0 overflow-visible" width={width} height={height}>
          <defs>
            {/* A solid stroke drawn along the road reveals the dashes as it goes */}
            <mask id="hero-road-reveal" maskUnits="userSpaceOnUse">
              <motion.path
                d={road}
                fill="none"
                stroke="#fff"
                strokeWidth={10}
                strokeLinecap="round"
                initial={{ pathLength: play ? 0 : 1 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: ROAD_DRAW, delay: ROAD_START, ease: 'easeInOut' }}
              />
            </mask>
          </defs>
          <motion.path
            d={road}
            fill="none"
            mask="url(#hero-road-reveal)"
            className="stroke-accent"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="2 10"
            initial={{ opacity: play ? 1 : 0.3 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.8, delay: play ? INTRO_POP + 0.4 : 0 }}
          />
          <motion.g
            initial={play ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.1 }}
          >
            <circle cx={pin.x} cy={pin.y} r={11} className="fill-accent-soft" />
            <MapPin x={pin.x - 7} y={pin.y - 7} width={14} height={14} className="text-accent-text" />
          </motion.g>
        </svg>
      )}

      {/* The car rides the road path, kept upright, then settles with a little bounce */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ offsetPath: `path("${road}")`, offsetRotate: '0deg', offsetDistance }}
        initial={play ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: CAR_START }}
      >
        <motion.span
          className="flex items-center justify-center rounded-full bg-ink text-sand card-shadow"
          style={{ width: CAR_SIZE, height: CAR_SIZE }}
          animate={play ? { y: [0, -6, 0] } : undefined}
          transition={{ duration: 0.45, delay: CAR_START + CAR_DRIVE, ease: 'easeOut' }}
        >
          <CarFront className="w-4 h-4" />
        </motion.span>
      </motion.div>

      {/* The crew waits for trip data, so it knows whether there are real avatars to land on */}
      {play && ready && (
        <>
          <Crew geo={geo} hasProof={hasProof} />
          {/* One soft ring off the Host button as the crew arrives */}
          <motion.span
            className="absolute rounded-full border-2 border-accent"
            style={{ left: host.x, top: host.y, width: host.w, height: host.h }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.7, 0], scale: [1, 1.08, 1.3] }}
            transition={{ duration: 0.9, delay: INTRO_POP, ease: 'easeOut' }}
          />
        </>
      )}
    </div>
  );
};

/* Travellers drifting in from the photos and edges, gathering round the Host button, then lining up
   where the real avatars sit. The flight is planned once at mount so a resize or late data can't restart it. */
const Crew = ({ geo, hasProof }: { geo: Geometry; hasProof: boolean }) => {
  const [crew] = useState(() => {
    const { width, height, to: host, proof, phone } = geo;
    const hostCenter = { x: host.x + host.w / 2, y: host.y + host.h / 2 };
    return CREW_TONES.slice(0, phone ? 4 : 6).map((tone, i, all) => {
      const angle = (i / all.length) * Math.PI * 2 - Math.PI / 2;
      const ring = { x: hostCenter.x + Math.cos(angle) * (host.w / 2 + 28), y: hostCenter.y + Math.sin(angle) * (host.h / 2 + 26) };
      const land = proof && hasProof ? { x: proof.x + 18 + i * 26, y: proof.y + proof.h / 2 } : ring;
      const start = { x: CREW_FROM[i].dx * width, y: CREW_FROM[i].dy * height };
      return { tone, start, ring, land };
    });
  });

  return crew.map(({ tone, start, ring, land }, i) => (
    <motion.span
      key={i}
      className={`absolute left-0 top-0 rounded-full ring-[3px] ring-sand ${tone}`}
      style={{ width: CREW_SIZE, height: CREW_SIZE, marginLeft: -CREW_SIZE / 2, marginTop: -CREW_SIZE / 2 }}
      initial={{ x: start.x, y: start.y, opacity: 0, scale: 0.6 }}
      animate={{
        x: [start.x, ring.x, land.x],
        y: [start.y, ring.y, land.y],
        opacity: [0, 1, 1, 0],
        scale: [0.6, 1, hasProof ? 1 : 0.4],
      }}
      transition={{
        duration: CREW_TRAVEL,
        delay: CREW_START + i * 0.07,
        ease: EASE,
        times: [0, 0.6, 1],
        opacity: { duration: CREW_TRAVEL, delay: CREW_START + i * 0.07, times: [0, 0.15, 0.85, 1] },
      }}
    />
  ));
};
