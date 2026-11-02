import { useEffect, useState, type RefObject } from 'react';

/** True while a `position: sticky` element is pinned at its `top` offset (in px). */
export const useIsStuck = (ref: RefObject<HTMLElement | null>, top: number) => {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = ref.current;
      if (el) setStuck(el.getBoundingClientRect().top <= top + 1);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [ref, top]);

  return stuck;
};
