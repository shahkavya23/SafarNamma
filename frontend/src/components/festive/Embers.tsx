import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface Ember {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  hue: number;
}

/* A few warm sparks drifting up, like embers off a diya.
   Pauses while off screen or in a background tab; reduced-motion users get nothing. */
export const Embers = ({ count = 24, className = '' }: { count?: number; className?: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reduced) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let onScreen = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const spawn = (y: number): Ember => ({
      x: Math.random() * w,
      y,
      r: 0.8 + Math.random() * 2,
      speed: 0.25 + Math.random() * 0.55,
      wobble: Math.random() * Math.PI * 2,
      hue: 28 + Math.random() * 22,
    });
    const embers = Array.from({ length: count }, () => spawn(Math.random() * h));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) {
        e.y -= e.speed;
        e.wobble += 0.03;
        e.x += Math.sin(e.wobble) * 0.35;
        if (e.y < -10) Object.assign(e, spawn(h + 10));
        // Fade out as they rise
        const a = Math.max(0, Math.min(1, e.y / h)) * 0.9;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue},100%,60%,${a * 0.15})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue},100%,68%,${a})`;
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      const next = onScreen && !document.hidden;
      if (next === running) return;
      running = next;
      cancelAnimationFrame(raf);
      if (running) tick();
    };

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [count, reduced]);

  if (reduced) return null;
  return <canvas ref={ref} aria-hidden className={className} />;
};
