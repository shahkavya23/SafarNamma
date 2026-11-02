import { useEffect } from 'react';

/* ─── Site-wide interactive layer ───
   One set of document listeners (no per-card handlers) powering:
   • cursor spotlight on .place-card / .group-card / .spotlight   (mouse only)
   • magnetic pull on .btn-primary / .btn-accent / .magnetic     (mouse, motion OK)
   • click ripple on buttons                                      (motion OK)
   • hero parallax on [data-parallax="0.25"] images               (motion OK)
   Classes on <html>: `fx-pointer` (fine pointer) and `fx-motion` (fine pointer + motion allowed)
   gate the CSS in index.css, so touch devices and reduced-motion users get a calm page. */

const SURFACES = '.place-card, .group-card, .spotlight';
const MAGNETIC = '.btn-primary, .btn-accent, .btn-teal, .magnetic';
const RIPPLE = '.btn-primary, .btn-accent, .btn-teal, .btn-ghost, .magnetic';

const MAGNET_PULL = 0.18;
const MAGNET_MAX = 8; // px

const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

export function useInteractiveEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionOK = () => !reducedMotion.matches;

    const applyModes = () => {
      root.classList.toggle('fx-pointer', finePointer.matches);
      root.classList.toggle('fx-motion', finePointer.matches && motionOK());
    };
    applyModes();
    finePointer.addEventListener('change', applyModes);
    reducedMotion.addEventListener('change', applyModes);

    /* ── Spotlight, magnet ── */
    let magnet: HTMLElement | null = null;
    const releaseMagnet = () => {
      if (!magnet) return;
      magnet.style.removeProperty('--tx');
      magnet.style.removeProperty('--ty');
      magnet = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const target = e.target as Element | null;
      if (!target || !target.closest) return;
      const motion = root.classList.contains('fx-motion');

      const surface = target.closest<HTMLElement>(SURFACES);
      if (surface) {
        const r = surface.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        surface.style.setProperty('--mx', `${x}px`);
        surface.style.setProperty('--my', `${y}px`);
      }

      if (!motion) return releaseMagnet();
      const button = target.closest<HTMLElement>(MAGNETIC);
      if (button !== magnet) releaseMagnet();
      if (button && !button.matches(':disabled')) {
        magnet = button;
        const r = button.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        button.style.setProperty('--tx', `${clamp(dx * MAGNET_PULL, MAGNET_MAX)}px`);
        button.style.setProperty('--ty', `${clamp(dy * MAGNET_PULL, MAGNET_MAX)}px`);
      }
    };

    /* ── Ripple ── */
    const onPointerDown = (e: PointerEvent) => {
      if (!motionOK()) return;
      const target = e.target as Element | null;
      const button = target?.closest?.<HTMLElement>(RIPPLE);
      if (!button || button.matches(':disabled')) return;
      const r = button.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const ripple = document.createElement('span');
      ripple.className = 'sn-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - r.left}px`;
      ripple.style.top = `${e.clientY - r.top}px`;
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };

    /* ── Parallax ── */
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      if (!motionOK()) return;
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const box = (el.parentElement ?? el).getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        const speed = Number(el.dataset.parallax) || 0.25;
        el.style.setProperty('--py', `${(-box.top * speed).toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateParallax);
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('mouseleave', releaseMagnet);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      finePointer.removeEventListener('change', applyModes);
      reducedMotion.removeEventListener('change', applyModes);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('mouseleave', releaseMagnet);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove('fx-pointer', 'fx-motion');
    };
  }, []);
}
