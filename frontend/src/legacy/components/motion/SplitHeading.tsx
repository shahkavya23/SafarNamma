import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface Part {
  text: string;
  /** Render this run as the italic orange accent word(s). */
  accent?: boolean;
  /** Start a new line after this run. */
  breakAfter?: boolean;
}

interface SplitHeadingProps {
  parts: Part[];
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  /** Animate on mount instead of when scrolled into view (for heroes). */
  onMount?: boolean;
  accentClassName?: string;
}

/* Headline that rises in word by word from behind a mask. */
export const SplitHeading = ({
  parts,
  as = 'h2',
  className,
  style,
  delay = 0,
  onMount = false,
  accentClassName = 'accent-word',
}: SplitHeadingProps) => {
  const reduced = useReducedMotion();
  const Tag = as;
  let index = 0;

  const words = parts.flatMap((part) =>
    part.text.split(' ').filter(Boolean).map((word, i, arr) => ({ word, accent: part.accent, br: Boolean(part.breakAfter) && i === arr.length - 1 }))
  );

  if (reduced) {
    return (
      <Tag className={className} style={style}>
        {parts.map((p, i) => (
          <Fragment key={i}>
            {p.accent ? <span className={accentClassName}>{p.text}</span> : p.text}
            {p.breakAfter ? <br /> : i < parts.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </Tag>
    );
  }

  const trigger = onMount
    ? { initial: 'hidden', animate: 'show' }
    : { initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.6 } };

  return (
    <Tag className={className} style={style} aria-label={words.map((w) => w.word).join(' ')}>
      <motion.span className="inline" {...trigger} aria-hidden="true">
        {words.map(({ word, accent, br }, i) => {
          const d = delay + index++ * 0.06;
          return (
            <Fragment key={i}>
              <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
                <motion.span
                  className={`inline-block ${accent ? accentClassName : ''}`}
                  variants={{
                    hidden: { y: '105%', opacity: 0 },
                    show: { y: '0%', opacity: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: d } },
                  }}
                >
                  {word}
                </motion.span>
              </span>
              {br ? <br /> : i < words.length - 1 ? ' ' : ''}
            </Fragment>
          );
        })}
      </motion.span>
    </Tag>
  );
};
