import { motion, useReducedMotion } from 'motion/react';
import type { Group } from '../../types';
import { firstName, travellerCount } from '../../utils/groups';

const AVATAR_TONES = ['bg-ink', 'bg-accent', 'bg-sage', 'bg-gold'];
const MAX_AVATARS = 4;

/* Faces of the hosts already heading out, and how many people are going with them.
   Hidden until there is at least one real traveller to show. */
export const TravellersProof = ({ trips, delay = 0.7 }: { trips: Group[]; /** Seconds before the avatars pop in. */ delay?: number }) => {
  const reduced = useReducedMotion();
  const going = travellerCount(trips);
  if (!going) return null;

  const hosts = [...new Set(trips.map((t) => firstName(t.organizer_name)).filter(Boolean))];
  const shown = hosts.slice(0, MAX_AVATARS);

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5" aria-hidden>
        {shown.map((name, i) => (
          <motion.span
            key={name}
            className={`w-9 h-9 rounded-full ring-[3px] ring-sand text-sand text-sm font-bold flex items-center justify-center ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: delay + i * 0.12 }}
          >
            {name[0].toUpperCase()}
          </motion.span>
        ))}
        {hosts.length > MAX_AVATARS && (
          <span className="w-9 h-9 rounded-full ring-[3px] ring-sand bg-paper border border-line text-ink text-xs font-bold flex items-center justify-center">
            +{hosts.length - MAX_AVATARS}
          </span>
        )}
      </div>
      <p className="text-sm text-body leading-snug">
        <span className="font-bold text-ink">
          {going} {going === 1 ? 'traveller' : 'travellers'}
        </span>{' '}
        already going on{' '}
        <span className="font-bold text-ink">
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </span>
      </p>
    </div>
  );
};
