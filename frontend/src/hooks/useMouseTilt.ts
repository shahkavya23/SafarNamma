import { useState, useEffect, useRef } from 'react';

interface MouseTilt {
  /** Normalized X tilt (-1 = far left, 0 = center, 1 = far right) */
  tiltX: number;
  /** Normalized Y tilt (-1 = top, 0 = center, 1 = bottom) */
  tiltY: number;
  /** Whether the mouse is currently inside the viewport */
  isActive: boolean;
}

/**
 * Custom hook for cursor-driven Jeep tilt / suspension banking.
 * Maps the mouse X position across the viewport to a smooth tilt value.
 * Uses spring-damper smoothing for a natural suspension feel.
 */
export function useMouseTilt(): MouseTilt {
  const [tilt, setTilt] = useState<MouseTilt>({
    tiltX: 0,
    tiltY: 0,
    isActive: false,
  });

  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isActive = useRef(false);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1
      targetX.current = (e.clientX / window.innerWidth) * 2 - 1;
      targetY.current = (e.clientY / window.innerHeight) * 2 - 1;
      isActive.current = true;
    };

    const handleMouseLeave = () => {
      targetX.current = 0;
      targetY.current = 0;
      isActive.current = false;
    };

    const animate = () => {
      // Spring-damper smoothing (lerp with damping factor)
      const damping = 0.08;
      currentX.current += (targetX.current - currentX.current) * damping;
      currentY.current += (targetY.current - currentY.current) * damping;

      setTilt({
        tiltX: currentX.current,
        tiltY: currentY.current,
        isActive: isActive.current,
      });

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return tilt;
}
