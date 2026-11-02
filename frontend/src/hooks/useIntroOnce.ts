import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** Seconds into the home hero intro when the Host button pops and the crew lands. */
export const INTRO_POP = 2.4;

// Intros already shown since the page was loaded; cleared by a reload, kept while moving around the app
const played = new Set<string>();

/* True the first time a page shows after the site is opened or reloaded (and motion is allowed), so the
   intro greets every fresh visit but doesn't replay when someone clicks back to the page. */
export const useIntroOnce = (key: string) => {
  const reduced = useReducedMotion();
  const [firstShow] = useState(() => !played.has(key));

  useEffect(() => {
    played.add(key);
  }, [key]);

  return firstShow && !reduced;
};
