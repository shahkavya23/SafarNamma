import { useState, useEffect, useRef, useCallback } from 'react';

interface ScrollProgress {
  /** Normalized scroll position (0.0 to 1.0) */
  progress: number;
  /** Scroll velocity (pixels per frame, smoothed) */
  velocity: number;
  /** Scroll direction: 1 = down, -1 = up, 0 = idle */
  direction: number;
  /** Raw scroll position in pixels */
  scrollY: number;
}

/**
 * Custom hook that maps window scroll position to a normalized progress value.
 * Smoothly interpolates using requestAnimationFrame for buttery 60fps updates.
 * 
 * @param scrollHeight - The total scroll height that maps to 0→1 progress.
 *                        For example, 5000 means 5000px of scroll = full journey.
 *                        Defaults to document scroll height minus viewport.
 */
export function useScrollProgress(scrollHeight?: number): ScrollProgress {
  const [state, setState] = useState<ScrollProgress>({
    progress: 0,
    velocity: 0,
    direction: 0,
    scrollY: 0,
  });

  const prevScrollY = useRef(0);
  const smoothVelocity = useRef(0);
  const rafId = useRef<number>(0);

  const update = useCallback(() => {
    const currentY = window.scrollY;
    const maxScroll = scrollHeight ?? (document.documentElement.scrollHeight - window.innerHeight);
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, currentY / maxScroll)) : 0;
    
    // Smoothed velocity with damping
    const rawVelocity = currentY - prevScrollY.current;
    smoothVelocity.current += (rawVelocity - smoothVelocity.current) * 0.15;
    
    const direction = Math.abs(smoothVelocity.current) < 0.1 
      ? 0 
      : smoothVelocity.current > 0 ? 1 : -1;

    prevScrollY.current = currentY;

    setState({
      progress,
      velocity: smoothVelocity.current,
      direction,
      scrollY: currentY,
    });

    rafId.current = requestAnimationFrame(update);
  }, [scrollHeight]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId.current);
  }, [update]);

  return state;
}
