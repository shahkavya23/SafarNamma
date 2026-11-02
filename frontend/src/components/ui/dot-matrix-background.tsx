import { useEffect, useRef } from 'react';

/* A field of small square dots that ripple in from the centre, then twinkle in steps, each dot
   switching brightness every few seconds. Canvas 2D, so no WebGL context or extra library. */

const GAP = 20;
const DOT = 5;
const STEP_SECONDS = 5;
const LEVELS = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1];
// Mostly sandstone, with a few marigold and kanakambara dots
const SAND = '242,236,227';
const MARIGOLD = '242,165,22';
const ACCENT = '224,86,31';

// Stable 0–1 noise per cell, so the field looks the same on every frame
const hash = (x: number, y: number, s = 0) => {
  let h = Math.imul(x * 374761393 + y * 668265263 + s * 2246822519, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const DotMatrixBackground = ({ className = '', strength = 0.4 }: { className?: string; strength?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    const start = performance.now();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const cols = Math.ceil(width / GAP);
      const rows = Math.ceil(height / GAP);
      const ox = Math.floor((width - (cols - 1) * GAP - DOT) / 2);
      const oy = Math.floor((height - (rows - 1) * GAP - DOT) / 2);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const seed = hash(x, y);
          // The intro ripples out from the centre; a dot flashes a little brighter as it arrives
          const reveal = Math.hypot(x - cols / 2, y - rows / 2) * 0.012 + seed * 0.15;
          const age = t * 3 - reveal;
          if (age < 0) continue;
          const level = LEVELS[Math.floor(hash(x, y, Math.floor(t / STEP_SECONDS + seed * STEP_SECONDS) + 1) * 10)];
          const flash = age < 0.1 ? 1.25 : 1;
          const tone = seed < 0.05 ? ACCENT : seed < 0.12 ? MARIGOLD : SAND;
          ctx.fillStyle = `rgba(${tone},${Math.min(1, level * strength * flash * (tone === SAND ? 1 : 1.6))})`;
          ctx.fillRect(ox + x * GAP, oy + y * GAP, DOT, DOT);
        }
      }
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      // Every frame while the ripple runs, then ten a second is plenty for the stepped twinkle
      if (t < 1.5 || now - last > 100) {
        draw(t);
        last = now;
      }
      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(60);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const run = () => {
      cancelAnimationFrame(raf);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    };
    run();
    document.addEventListener('visibilitychange', run);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', run);
    };
  }, [strength]);

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none block w-full h-full ${className}`} />;
};
