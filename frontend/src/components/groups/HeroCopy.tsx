import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Counter } from '../motion/Counter';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

/* What the photo row below actually shows: Nandi, Skandagiri, Coorg, Gokarna, Hampi, the Ghats */
const PLACES = ['sunrise', 'trek', 'waterfall', 'beach', 'temple', 'road trip'];
const SENTENCE: { text: string; strong?: boolean }[] = [
  { text: 'Every photo rolling past is a real trip from campus.' },
  { text: 'Join one, or start your own.', strong: true },
];

type Mode = 'join' | 'host';
const MODES: { key: Mode; label: string }[] = [
  { key: 'join', label: 'Join a trip' },
  { key: 'host', label: 'Host a trip' },
];
const STEPS: Record<Mode, string[]> = {
  join: ['Ask to join', 'Host says yes', 'Chat opens'],
  host: ['Pick a place', 'Set date & seats', 'Approve your crew'],
};
// The step highlight walks 0 → 1 → 2 and rests on the last one for an extra beat
const STEP_SEQUENCE = [0, 1, 2, 2];

/** True while the tab is visible, so loops don't run in a background tab. */
const usePageVisible = () => {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
};

/** Steps through `length` positions every `every` ms once `startAfter` has passed, while `running`.
    Changing `resetKey` starts it over from 0. */
const useTicker = (length: number, every: number, startAfter: number, running: boolean, resetKey?: unknown) => {
  const [tick, setTick] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => setTick(0), [resetKey]);
  useEffect(() => {
    if (!running || started) return;
    const t = window.setTimeout(() => setStarted(true), startAfter);
    return () => window.clearTimeout(t);
  }, [running, started, startAfter]);
  useEffect(() => {
    if (!running || !started) return;
    const t = window.setInterval(() => setTick((n) => (n + 1) % length), every);
    return () => window.clearInterval(t);
  }, [running, started, length, every, resetKey]);
  return tick;
};

/* A word that rises from behind a mask, like SplitHeading. */
const Rise = ({ children, delay, reduced, className }: { children: string; delay: number; reduced: boolean | null; className?: string }) => (
  <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
    <motion.span
      className={cn('inline-block', className)}
      initial={reduced ? false : { y: '105%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.span>
  </span>
);

interface HeroCopyProps {
  count: number;
  loading: boolean;
  /** Opens the start-a-trip sheet (it handles login and the SST check). */
  onHost: () => void;
  /** Scrolls to the trips. */
  onBrowse: () => void;
}

/* ─── Groups hero copy ───
   Read in one path: the live pill, "Pick the ___." cycling through the places in the photo row,
   "Find your crew." with a swoosh drawn under it, a sentence that inks in word by word, then the
   two ways in (join or host) as three steps with a highlight walking across them. The steps play
   the joining story, then the hosting one, until someone picks a side; each ends in an action.
   Reduced motion shows it all still. */
export const HeroCopy = ({ count, loading, onHost, onBrowse }: HeroCopyProps) => {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const pageVisible = usePageVisible();
  const running = inView && pageVisible && !reduced;

  const [mode, setMode] = useState<Mode>('join');
  // Once someone picks a side, it stays put
  const [pinned, setPinned] = useState(false);

  const place = useTicker(PLACES.length, 2400, 1400, running);
  const stepTick = useTicker(STEP_SEQUENCE.length, 1600, 2100, running, mode);
  const step = reduced ? -1 : STEP_SEQUENCE[stepTick];
  const word = reduced ? 'place' : PLACES[place];

  // After a full walk, hand over to the other story
  const lastTick = useRef(stepTick);
  useEffect(() => {
    if (!pinned && lastTick.current === STEP_SEQUENCE.length - 1 && stepTick === 0) setMode((m) => (m === 'join' ? 'host' : 'join'));
    lastTick.current = stepTick;
  }, [stepTick, pinned]);

  const pick = (m: Mode) => {
    setPinned(true);
    setMode(m);
  };

  // The cycling word's box eases to the next word's width, so the centred line glides instead of jumping
  const sizer = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (sizer.current) setWordWidth(sizer.current.offsetWidth);
  }, [word]);

  const sentenceWords = SENTENCE.flatMap((part) => part.text.split(' ').map((w) => ({ w, strong: part.strong })));
  const showAction = reduced || step === 2;

  return (
    <div ref={ref}>
      {/* Live pill */}
      <p className="inline-flex items-center gap-2 rounded-full bg-paper border border-line px-3.5 py-1.5 text-label !text-[11px] text-body animate-fade-up">
        <span className="w-1.5 h-1.5 rounded-full bg-seat animate-pulse-dot" aria-hidden />
        {loading ? (
          'Travel groups · Bengaluru'
        ) : (
          <span>
            <strong className="font-semibold text-ink"><Counter value={count} duration={1.2} /></strong> {count === 1 ? 'trip' : 'trips'} leaving soon · Bengaluru
          </span>
        )}
      </p>

      {/* Headline */}
      <h1 className="text-display text-ink mt-6" style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4rem)' }} aria-label="Pick the place. Find your crew.">
        <span aria-hidden="true">
          <Rise delay={0.1} reduced={reduced}>Pick</Rise>{' '}
          <Rise delay={0.16} reduced={reduced}>the</Rise>{' '}
          <motion.span
            className="relative inline-flex justify-center align-bottom whitespace-nowrap"
            initial={false}
            animate={wordWidth ? { width: wordWidth } : undefined}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {/* Measures the next word; never seen */}
            <span ref={sizer} className="invisible absolute left-0 top-0 italic font-medium whitespace-nowrap">
              {word}
            </span>
            <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={word}
                  className="relative inline-block italic font-medium whitespace-nowrap"
                  initial={reduced ? false : { y: '105%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1, transition: { duration: 0.6, ease: EASE, delay: place === 0 ? 0.22 : 0 } }}
                  exit={{ y: '-105%', opacity: 0, transition: { duration: 0.45, ease: EASE } }}
                >
                  {word}
                  <motion.span
                    className="absolute left-0 right-0 bottom-[0.1em] h-[0.05em] min-h-[2px] bg-ink/25 origin-left"
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
                  />
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.span>
          .
          <br />
          <Rise delay={0.3} reduced={reduced} className="accent-word">Find</Rise>{' '}
          <Rise delay={0.36} reduced={reduced} className="accent-word">your</Rise>{' '}
          <span className="relative inline-block">
            <Rise delay={0.42} reduced={reduced} className="accent-word">crew.</Rise>
            {/* Hand-drawn swoosh under "crew." */}
            <svg className="absolute left-[-4%] w-[96%] -bottom-[0.16em] h-[0.28em] overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
              <motion.path
                d="M2 8.5 C 22 3.5, 48 2.5, 70 5 S 92 9, 98 4"
                fill="none"
                stroke="var(--color-accent)"
                strokeOpacity={0.6}
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.95 }}
              />
            </svg>
          </span>
        </span>
      </h1>

      {/* A sentence that inks in as you read it, ending on the two ways in */}
      <p className="text-body text-base sm:text-lg max-w-lg mx-auto mt-5 leading-relaxed max-[700px]:hidden">
        {sentenceWords.map(({ w, strong }, i) => (
          <motion.span
            key={i}
            className={strong ? 'font-semibold text-ink' : undefined}
            initial={reduced ? false : { opacity: 0.15 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 1.0 + i * 0.05 }}
          >
            {w}
            {i < sentenceWords.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </p>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 1.6 }}
      >
        {/* Join or host */}
        <div className="mt-5 inline-flex rounded-full bg-paper border border-line p-1 text-xs sm:text-[13px] font-semibold" role="group" aria-label="How do you want to go?">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => pick(m.key)}
                className={cn(
                  'relative rounded-full px-3.5 sm:px-4 py-1.5 transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                  active ? 'text-sand' : 'text-muted hover:text-ink'
                )}
              >
                {active && <motion.span layoutId="hero-mode" className="absolute inset-0 rounded-full bg-ink" transition={reduced ? { duration: 0 } : SPRING} />}
                <span className="relative">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* That story's three steps, with a highlight walking across them and an action at the end */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.ol
            key={mode}
            className="mt-3 flex flex-wrap items-center justify-center gap-y-2 text-xs sm:text-sm font-semibold"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {STEPS[mode].map((label, i) => {
              const active = step === i;
              const done = step > i;
              return (
                <li key={label} className="flex items-center">
                  {i > 0 && (
                    <span className="relative w-4 sm:w-8 h-px mx-1 bg-line-strong overflow-hidden" aria-hidden>
                      <motion.span
                        className="absolute inset-0 bg-seat origin-left"
                        initial={false}
                        animate={{ scaleX: step >= i ? 1 : 0 }}
                        transition={{ duration: 0.45, ease: EASE }}
                      />
                    </span>
                  )}
                  <span className={cn('relative flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-300', active ? 'text-ink' : reduced ? 'text-body' : 'text-muted')}>
                    {active && (
                      <motion.span
                        layoutId="hero-step"
                        className="absolute inset-0 rounded-full bg-paper border border-line shadow-[0_6px_18px_-10px_rgba(16,42,46,0.35)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    <span
                      className={cn(
                        'relative w-[1.15rem] h-[1.15rem] rounded-full text-[10px] font-bold flex items-center justify-center transition-colors duration-300',
                        active || done ? 'bg-seat text-white' : 'bg-stone text-muted'
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="relative whitespace-nowrap">{label}</span>
                  </span>
                </li>
              );
            })}
            <li className="flex items-center ml-1 sm:ml-2">
              <motion.button
                type="button"
                onClick={mode === 'host' ? onHost : onBrowse}
                tabIndex={showAction ? 0 : -1}
                aria-hidden={!showAction}
                className={cn('group/act flex items-center gap-1 px-2 py-1.5 rounded-full text-accent-text hover:text-ink transition-colors', !showAction && 'pointer-events-none')}
                initial={false}
                animate={{ opacity: showAction ? 1 : 0, x: showAction ? 0 : -6 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {mode === 'host' ? 'Start a trip' : 'Browse trips'}
                {mode === 'host' ? (
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/act:translate-x-0.5" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover/act:translate-y-0.5" />
                )}
              </motion.button>
            </li>
          </motion.ol>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
