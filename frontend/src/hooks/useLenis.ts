import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

/* ─── Smooth scrolling (Lenis) ───
   One instance for the app. Skipped for reduced-motion users and touch devices,
   which keep native scrolling. Jumps to the top on every route change. */
let lenis: Lenis | null = null;

export function useLenis() {
  const { pathname } = useLocation();

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    lenis = new Lenis({ autoRaf: true, duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
}

/** Jump back to the top (used when a link points at the current page, so the route-change jump never fires). */
export function scrollToTop() {
  lenis?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

/** Pause page scrolling while a modal or sheet is open. */
export function setScrollLocked(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  // Both roots: html carries overflow-x: clip, so the viewport takes its overflow from html, not body
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  document.body.style.overflow = locked ? 'hidden' : '';
}
