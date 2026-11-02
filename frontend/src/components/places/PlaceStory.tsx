import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Film,
  IndianRupee,
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
import { sentences, splitLabel, type Highlight, type PlaceSections } from '../../utils/describePlace';
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
  [/\b(?:shop|brand|market|luxury|store|bazaar)/i, ShoppingBag],
  [/\b(?:dining|food|cafe|eat|restaurant|nightlife|drink)/i, UtensilsCrossed],
  [/\b(?:entertain|movie|cinema|theat|game|arcade|music|show)/i, Film],
  [/\b(?:architect|history|heritage|temple|fort|palace|monument|ambian|dome)/i, Landmark],
  [/\b(?:trek|hill|peak|view|summit|mountain)/i, Mountain],
  [/\b(?:garden|nature|park|forest|wildlife|bird)/i, Trees],
  [/\b(?:water|lake|beach|falls|river|boat)/i, Waves],
];
const iconFor = (h: Highlight) =>
  ICONS.find(([re]) => re.test(h.title ?? ''))?.[1] ?? ICONS.find(([re]) => re.test(h.text))?.[1] ?? Sparkles;

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

/* A single highlight: shown open, there's nothing to choose between. */
const HighlightCard = ({ h }: { h: Highlight }) => {
  const Icon = iconFor(h);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[24px] bg-paper border border-line p-6 sm:p-7"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <h3 className="font-display text-2xl text-ink leading-tight">{h.title}</h3>
      </div>
      <HighlightBody h={h} />
    </motion.div>
  );
};

/* ── Plan your visit: timings, entry and where, each a row that opens to show everything ── */

type VisitKey = 'when' | 'cost' | 'where';

/** A line, with its own label ("Inside Tour Timings") in bold when it has one. */
const VisitLine = ({ line }: { line: string }) => {
  const { label, text } = splitLabel(line);
  return (
    <p className="text-ink leading-relaxed">
      {label && <span className="font-semibold">{label}: </span>}
      {text}
    </p>
  );
};

const VisitRow = ({
  id,
  icon: Icon,
  label,
  lines,
  href,
  open,
  onToggle,
}: {
  id: VisitKey;
  icon: LucideIcon;
  label: string;
  lines: string[];
  href?: string;
  open: boolean;
  onToggle: () => void;
}) => {
  const reduced = useReducedMotion();
  const [first, ...rest] = lines;
  const more = rest.length > 0 || !!href;
  const panelId = `visit-${id}-panel`;
  return (
    <div
      id={id === 'when' ? 'place-timings' : undefined}
      className={cn(
        'scroll-mt-32 rounded-[20px] bg-paper border transition-[border-color,box-shadow] duration-300',
        open ? 'border-line-strong shadow-[0_18px_40px_-24px_rgba(16,42,46,0.35)]' : 'border-line hover:border-line-strong'
      )}
    >
      <button
        type="button"
        onClick={more ? onToggle : undefined}
        aria-expanded={more ? open : undefined}
        aria-controls={more ? panelId : undefined}
        className={cn(
          'group w-full flex items-start gap-4 p-5 text-left rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          !more && 'cursor-default'
        )}
      >
        <span className="w-11 h-11 rounded-2xl bg-sage-soft text-sage-text flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label text-muted mb-1.5">{label}</p>
          <VisitLine line={first} />
          {more && !open && (
            <p className="mt-1.5 text-sm font-bold text-accent-text group-hover:text-ink transition-colors">
              {rest.length ? `+ ${rest.length} more` : 'Show on map'}
            </p>
          )}
        </div>
        {more && (
          <ChevronDown className={cn('w-5 h-5 mt-3 shrink-0 text-muted transition-transform duration-300 group-hover:text-ink', open && 'rotate-180')} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && more && (
          <motion.div
            id={panelId}
            className="overflow-hidden"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="pl-5 sm:pl-[4.75rem] pr-5 pb-5 -mt-1 space-y-2">
              {rest.map((line, i) => (
                <VisitLine key={i} line={line} />
              ))}
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/map inline-flex items-center gap-1 pt-1 text-sm font-bold text-accent-text hover:text-ink transition-colors"
                >
                  Open in Maps <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/map:translate-x-0.5 group-hover/map:-translate-y-0.5" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Opens a "Plan your visit" row from elsewhere on the page (the Hours fact's "Check description"). */
export const openVisitRow = (key: VisitKey) => window.dispatchEvent(new CustomEvent('place-visit:open', { detail: key }));

/* ── Intro: the first two sentences, the rest behind "Read more" ── */
const INTRO_SENTENCES = 2;

const Intro = ({ paragraphs }: { paragraphs: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  const lead = sentences(paragraphs[0]);
  const long = lead.length > INTRO_SENTENCES + 1 || paragraphs.length > 1;
  const shown = expanded || !long ? paragraphs : [lead.slice(0, INTRO_SENTENCES).join(' ')];
  return (
    <div className="space-y-4 max-w-[64ch]">
      {shown.map((para, i) => (
        <ScrollInk
          key={`${i}-${expanded}`}
          text={para}
          className={cn('leading-[1.75]', i === 0 ? 'text-ink text-xl sm:text-2xl font-medium' : 'text-body text-lg')}
        />
      ))}
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:text-ink transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
};

/* ─── The description, as something to read through ───
   First what a visitor needs to plan (timings, entry, where), each a row that opens; then the intro;
   then the highlights as tabs to step through. Empty parts are left out. */
export const PlaceStory = ({ sections, mapUrl }: { sections: PlaceSections; mapUrl?: string | null }) => {
  const visit = [
    { id: 'when' as const, icon: Clock, label: 'Timings', lines: sections.when, href: undefined },
    { id: 'cost' as const, icon: IndianRupee, label: 'Entry & tickets', lines: sections.cost, href: undefined },
    { id: 'where' as const, icon: MapPin, label: 'Where it is', lines: sections.where, href: mapUrl ?? undefined },
  ].filter((v) => v.lines.length);

  const [open, setOpen] = useState<Set<VisitKey>>(new Set());
  const toggle = (key: VisitKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  useEffect(() => {
    const onOpen = (e: Event) => setOpen((prev) => new Set(prev).add((e as CustomEvent<VisitKey>).detail));
    window.addEventListener('place-visit:open', onOpen);
    return () => window.removeEventListener('place-visit:open', onOpen);
  }, []);

  if (!sections.about.length && !visit.length && !sections.highlights.length) {
    return <p className="text-muted text-lg">No description yet. Been here? Leave a review below and tell people what it's like.</p>;
  }

  return (
    <div className="space-y-10">
      {visit.length > 0 && (
        <div>
          <p className="section-label mb-5">Plan your visit</p>
          <div className="space-y-3">
            {visit.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              >
                <VisitRow {...v} open={open.has(v.id)} onToggle={() => toggle(v.id)} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {sections.about.length > 0 && <Intro paragraphs={sections.about} />}

      {sections.highlights.length > 0 && (
        <div>
          <p className="section-label mb-5">What to see & do</p>
          {sections.highlights.length > 1 ? <HighlightExplorer items={sections.highlights} /> : <HighlightCard h={sections.highlights[0]} />}
        </div>
      )}
    </div>
  );
};
