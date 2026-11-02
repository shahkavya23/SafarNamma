import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Film,
  Landmark,
  MapPin,
  Mountain,
  ShoppingBag,
  Sparkles,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { Highlight, PlaceSections } from '../../utils/describePlace';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Intro: words ink in as the paragraph scrolls through the screen, so it's read at the pace it's revealed ── */
const InkWord = ({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) => {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={{ opacity }}>{word} </motion.span>;
};

const ScrollInk = ({ text, className }: { text: string; className?: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'end 0.6'] });
  if (reduced) return <p ref={ref} className={className}>{text}</p>;
  const words = text.split(' ');
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <InkWord key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </span>
    </p>
  );
};

/* ── Highlights ── */

/** An icon that fits the highlight's label, from its words. */
const ICONS: [RegExp, LucideIcon][] = [
  [/shop|brand|market|luxury|store|bazaar/i, ShoppingBag],
  [/dining|food|cafe|eat|restaurant|nightlife|drink/i, UtensilsCrossed],
  [/entertain|movie|cinema|theat|game|arcade|music|show/i, Film],
  [/architect|history|heritage|temple|fort|palace|monument|ambian/i, Landmark],
  [/trek|hill|peak|view|summit|mountain/i, Mountain],
  [/garden|nature|park|forest|wildlife|bird/i, Trees],
  [/water|lake|beach|falls|river|boat/i, Waves],
];
const iconFor = (h: Highlight) => ICONS.find(([re]) => re.test(`${h.title ?? ''} ${h.text}`))?.[1] ?? Sparkles;

/** "Features A, B, and C." → a lead-in verb and the things it lists, so a list reads as chips. Null if it isn't a list. */
const listOf = (text: string) => {
  const m = text.match(/^(Houses|Features|Offers|Includes|Has|Boasts|Outfitted with|Home to|Known for)\s+(.+?)\.?$/i);
  if (!m) return null;
  const items = m[2]
    .split(/,\s*(?:and\s+|or\s+)?|\s+and\s+(?=[^,]*$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length < 3 || items.some((s) => s.length > 70)) return null;
  return { lead: m[1], items };
};

const HighlightBody = ({ h }: { h: Highlight }) => {
  const list = listOf(h.text);
  if (!list) return <p className="text-body text-lg leading-relaxed">{h.text}</p>;
  return (
    <div>
      <p className="text-label text-muted mb-3">{list.lead}</p>
      <ul className="flex flex-wrap gap-2">
        {list.items.map((item, i) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.05 }}
            className="rounded-full bg-sand border border-line px-3.5 py-1.5 text-sm text-ink"
          >
            {item}
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

/* A tab list of the labelled highlights beside the open one. On phones the open one unfolds under its tab. */
const HighlightExplorer = ({ items }: { items: Highlight[] }) => {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (i: number) => {
    const next = (i + items.length) % items.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  };

  const panel = (i: number) => {
    const h = items[i];
    const Icon = iconFor(h);
    const next = items[(i + 1) % items.length];
    return (
      <motion.div
        key={i}
        role="tabpanel"
        id={`highlight-panel-${i}`}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <h3 className="font-display text-2xl text-ink leading-tight">{h.title}</h3>
        </div>
        <HighlightBody h={h} />
        {items.length > 1 && (
          <div className="mt-auto pt-6 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted tabular-nums">
              {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => go(i + 1)} className="group/next inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:text-ink transition-colors">
              Next: {next.title}
              <ArrowRight className="w-4 h-4 transition-transform group-hover/next:translate-x-0.5" />
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="grid md:grid-cols-[minmax(0,15rem)_1fr] gap-3 md:gap-5">
      <div role="tablist" aria-orientation="vertical" aria-label="What to see and do" onKeyDown={onKeyDown} className="flex flex-col gap-1.5">
        {items.map((h, i) => {
          const on = i === active;
          const Icon = iconFor(h);
          return (
            <div key={i}>
              <button
                ref={(el) => { tabs.current[i] = el; }}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`highlight-panel-${i}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  'relative w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60',
                  on ? 'text-sand' : 'text-ink hover:bg-paper'
                )}
              >
                {on && <motion.span layoutId="highlight-tab" className="absolute inset-0 rounded-2xl bg-ink" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className={cn('relative font-mono text-xs tabular-nums', on ? 'text-sand/60' : 'text-accent-text')}>{String(i + 1).padStart(2, '0')}</span>
                <span className="relative flex-1 font-semibold leading-snug">{h.title}</span>
                <Icon className={cn('relative w-4 h-4 shrink-0 transition-opacity', on ? 'opacity-80' : 'opacity-40')} />
              </button>
              {/* Phones: the open highlight unfolds right under its tab */}
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    className="md:hidden overflow-hidden"
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduced ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <div className="rounded-[20px] bg-paper border border-line p-5 mt-1.5 mb-1">{panel(i)}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Desktop: the open highlight beside the list */}
      <div className="hidden md:block rounded-[24px] bg-paper border border-line p-7 min-h-[16rem]">
        <AnimatePresence mode="wait" initial={false}>
          {panel(active)}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* Unlabelled highlights: cards that rise in one after another. */
const HighlightCards = ({ items }: { items: Highlight[] }) => (
  <ol className="grid sm:grid-cols-2 gap-3">
    {items.map((h, i) => {
      const Icon = iconFor(h);
      return (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE, delay: (i % 2) * 0.08 }}
          className="group rounded-[20px] bg-paper border border-line p-5 transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgba(16,42,46,0.35)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Icon className="w-4 h-4" />
            </span>
            {h.title && <h3 className="font-display text-lg text-ink leading-snug">{h.title}</h3>}
          </div>
          <p className="text-body leading-relaxed">{h.text}</p>
        </motion.li>
      );
    })}
  </ol>
);

/* ─── The description, as something to read through ───
   The intro inks in as you scroll; where / when are cards (where opens the map); the highlights
   are tabs you step through, each list shown as chips. Empty parts are left out. */
export const PlaceStory = ({ sections, mapUrl }: { sections: PlaceSections; mapUrl?: string | null }) => {
  const facts = [
    { key: 'where', icon: MapPin, label: 'Where it is', lines: sections.where, href: mapUrl ?? undefined },
    { key: 'when', icon: Clock, label: 'When to go', lines: sections.when, href: undefined },
  ].filter((f) => f.lines.length);
  const labelled = sections.highlights.length > 1 && sections.highlights.every((h) => h.title);

  if (!sections.about.length && !facts.length && !sections.highlights.length) {
    return <p className="text-muted text-lg">No description yet. Been here? Leave a review below and tell people what it's like.</p>;
  }

  return (
    <div className="space-y-10">
      {sections.about.length > 0 && (
        <div className="space-y-4 max-w-[64ch]">
          {sections.about.map((para, i) => (
            <ScrollInk key={i} text={para} className={cn('leading-[1.75]', i === 0 ? 'text-ink text-xl sm:text-2xl font-medium' : 'text-body text-lg')} />
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <div className={cn('grid gap-3', facts.length > 1 && 'sm:grid-cols-2')}>
          {facts.map(({ key, icon: Icon, label, lines, href }, i) => {
            const body = (
              <>
                <span className="w-11 h-11 rounded-2xl bg-sage-soft text-sage-text flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-label text-muted mb-1.5">{label}</p>
                  {lines.map((line, j) => (
                    <p key={j} className="text-ink leading-relaxed [&+&]:mt-1.5">{line}</p>
                  ))}
                  {href && (
                    <span className="inline-flex items-center gap-1 mt-2.5 text-sm font-bold text-accent-text group-hover:text-ink transition-colors">
                      Open in Maps <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  )}
                </div>
              </>
            );
            const card = 'group flex gap-4 rounded-[20px] bg-paper border border-line p-5 transition-[border-color,box-shadow] duration-300';
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              >
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={cn(card, 'hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgba(16,42,46,0.35)]')}>
                    {body}
                  </a>
                ) : (
                  <div className={card}>{body}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {sections.highlights.length > 0 && (
        <div>
          <p className="section-label mb-5">What to see & do</p>
          {labelled ? <HighlightExplorer items={sections.highlights} /> : <HighlightCards items={sections.highlights} />}
        </div>
      )}
    </div>
  );
};
