import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { Group } from '../../types';
import { seatsLeft } from '../../utils/groups';

// Appears once the hero has scrolled away, and steps aside before the footer
const SHOW_AFTER_VIEWPORTS = 0.9;
const FOOTER_GAP_PX = 480;

/* Phone-only bar that keeps the next step one tap away: how many trips are open, and a way in. */
export const TripNudgeBar = ({ trips }: { trips: Group[] }) => {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - FOOTER_GAP_PX;
    setShow(y > window.innerHeight * SHOW_AFTER_VIEWPORTS && !nearEnd);
  });

  const open = trips.filter((t) => seatsLeft(t) > 0);
  if (!open.length) return null;
  const seats = open.reduce((n, t) => n + seatsLeft(t), 0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-paper/95 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-12px_32px_-20px_rgba(16,42,46,0.45)]"
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <p className="flex-1 min-w-0 text-xs text-body leading-snug">
            <span className="flex items-center gap-1.5 font-bold text-ink text-sm">
              <span className="live-dot" /> {open.length} {open.length === 1 ? 'trip' : 'trips'} open
            </span>
            {seats} {seats === 1 ? 'seat' : 'seats'} waiting for you
          </p>
          <Link to="/groups" className="btn-accent shrink-0 !py-3 !px-5 !text-sm">
            Find your crew <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
