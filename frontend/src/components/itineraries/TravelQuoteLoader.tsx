import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/* Shown while the routes load, so the wait gives the reader a reason to go.
   Every line here is checked against its source: no misattributed internet quotes. */
type Quote = { text: string; author: string; source: string; original?: string };

const QUOTES: Quote[] = [
  {
    original: 'Sair kar duniya ki ghafil, zindagani phir kahan',
    text: 'Go and see the world, you careless one. Where will you get this life again?',
    author: 'Khwaja Mir Dard',
    source: '18th-century Urdu poet',
  },
  {
    text: 'Travel is fatal to prejudice, bigotry, and narrow-mindedness.',
    author: 'Mark Twain',
    source: 'The Innocents Abroad, 1869',
  },
  {
    text: 'The journey changes you; it should change you.',
    author: 'Anthony Bourdain',
    source: 'No Reservations',
  },
  {
    text: 'A ship in harbor is safe, but that is not what ships are built for.',
    author: 'John A. Shedd',
    source: 'Salt from My Attic, 1928',
  },
  {
    text: 'To travel is to discover that everyone is wrong about other countries.',
    author: 'Aldous Huxley',
    source: 'Jesting Pilate, 1926',
  },
  {
    text: 'Travel is more than the seeing of sights; it is a change that goes on, deep and permanent, in the ideas of living.',
    author: 'Miriam Beard',
    source: 'Historian',
  },
  {
    text: 'I am not the same, having seen the moon shine on the other side of the world.',
    author: 'Mary Anne Radmacher',
    source: 'Writer',
  },
];

const ROTATE_MS = 7000;

export const TravelQuoteLoader = ({ waking }: { waking: boolean }) => {
  const reduced = useReducedMotion();
  // Start somewhere new each visit, so returning users don't reread the same line first
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const quote = QUOTES[index];

  return (
    <div className="py-20 px-4 text-center max-w-2xl mx-auto" role="status" aria-live="polite">
      <div className="min-h-[13rem] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {quote.original && (
              <p className="text-sm italic text-muted mb-3">{quote.original}</p>
            )}
            <blockquote className="font-display text-2xl sm:text-3xl text-ink leading-snug">
              “{quote.text}”
            </blockquote>
            <figcaption className="mt-5 text-sm">
              <span className="font-semibold text-ink">{quote.author}</span>
              <span className="text-muted"> · {quote.source}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2.5 text-xs text-muted">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        {waking ? 'Getting your routes ready, this can take up to a minute' : 'Loading curated routes'}
      </div>
    </div>
  );
};
