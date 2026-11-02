import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Check, CheckCircle, EyeOff, MessageSquare, PenLine, Plus, Send, Star } from 'lucide-react';
import type { Review } from '../../types';
import { Chip } from '../ui/Chip';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;
const RATING_WORDS = ['', 'Skip it', 'Not great', 'It was okay', 'Really good', 'Loved it'];
// Tapping a prompt adds it as a line to start from, so a review covers what the next visitor asks
const PROMPTS = ['Best time to go', 'Parking', 'Food nearby', 'Crowds', 'Tickets & entry', 'Good for'];
const LONG_REVIEW = 260;
// A nudge toward detail as the review grows: empty, short, decent, rich
const QUALITY_WORDS = ['A couple of sentences is perfect', 'Keep going', 'Good detail', 'Really helpful'];

type Sort = 'newest' | 'highest' | 'lowest';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'highest', label: 'Highest' },
  { key: 'lowest', label: 'Lowest' },
];

const Stars = ({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) => (
  <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn(size, s <= Math.round(rating) ? 'text-gold fill-gold' : 'text-stone-deep fill-stone-deep')} />
    ))}
  </span>
);

/** "3 days ago", "2 months ago". */
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return '';
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

const ReviewCard = ({ review, index }: { review: Review; index: number }) => {
  const [open, setOpen] = useState(false);
  const long = review.comment.length > LONG_REVIEW;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: EASE, delay: (index % 2) * 0.06 }}
      className="group rounded-[20px] bg-paper border border-line p-5 sm:p-6 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgba(16,42,46,0.35)]"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-sage-soft text-sage-text font-display text-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:-rotate-6">
            T
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">Traveller #{review.user_id}</p>
            <p className="text-xs text-muted">{ago(review.created_at)}</p>
          </div>
        </div>
        <span className="flex flex-col items-end gap-1 shrink-0">
          <Stars rating={review.rating} size="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold text-muted">{RATING_WORDS[review.rating]}</span>
        </span>
      </div>
      <p className={cn('text-body leading-relaxed whitespace-pre-line', long && !open && 'line-clamp-4')}>{review.comment}</p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-sm font-bold text-accent-text hover:text-ink transition-colors">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </motion.article>
  );
};

interface PlaceReviewsProps {
  placeName: string;
  rating: number;
  reviews: Review[];
  loading: boolean;
  /** Posts the review; throws with a message when it fails. */
  onPost: (rating: number, comment: string) => Promise<void>;
}

/* ─── What explorers say ───
   A summary you can filter by star, reviews that read like the cards above, and a form that
   helps people write something useful: a word for each rating and prompts that start a line. */
export const PlaceReviews = ({ placeName, rating, reviews, loading, onPost }: PlaceReviewsProps) => {
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<Sort>('newest');
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const counts = useMemo(() => [5, 4, 3, 2, 1].map((s) => ({ star: s, n: reviews.filter((r) => Math.round(r.rating) === s).length })), [reviews]);
  const shown = useMemo(() => {
    const list = starFilter ? reviews.filter((r) => Math.round(r.rating) === starFilter) : [...reviews];
    if (sort === 'highest') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'lowest') list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [reviews, sort, starFilter]);

  const live = hoverRating || newRating;
  const length = comment.trim().length;
  const quality = !length ? 0 : length < 40 ? 1 : length < 140 ? 2 : 3;
  const usedPrompts = useMemo(() => {
    const lines = comment.split('\n');
    return new Set(PROMPTS.filter((p) => lines.some((l) => l.startsWith(`${p}:`))));
  }, [comment]);

  // The box grows with the text, up to its max height
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [comment]);

  /** Puts the cursor at `at`, after React has rendered the new text. */
  const focusAt = (at: (value: string) => number) =>
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      const i = at(el.value);
      el.focus();
      el.setSelectionRange(i, i);
    });

  const addPrompt = (p: string) => {
    if (usedPrompts.has(p)) {
      // Already started: jump to the end of that line instead of adding it twice
      focusAt((v) => {
        const lines = v.split('\n');
        const row = lines.findIndex((l) => l.startsWith(`${p}:`));
        return lines.slice(0, row + 1).join('\n').length;
      });
      return;
    }
    setComment((c) => `${c}${c && !c.endsWith('\n') ? '\n' : ''}${p}: `);
    setPosted(false);
    focusAt((v) => v.length);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please write a few words about your experience.');
      textRef.current?.focus();
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await onPost(newRating, comment.trim());
      setComment('');
      setNewRating(5);
      setPosted(true);
      setSort('newest');
      setStarFilter(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit your review. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary: the score, and a bar per star that filters the list */}
      {reviews.length > 0 && (
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-center rounded-[24px] bg-paper border border-line p-6 sm:p-7">
          <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-2">
            <span className="font-display text-6xl text-ink leading-none">{rating.toFixed(1)}</span>
            <div>
              <Stars rating={rating} />
              <p className="text-xs text-muted mt-1">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {counts.map(({ star, n }, i) => {
              const on = starFilter === star;
              return (
                <li key={star}>
                  <button
                    type="button"
                    disabled={!n}
                    aria-pressed={on}
                    onClick={() => setStarFilter(on ? null : star)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-2 py-1 text-sm transition-colors disabled:opacity-40 disabled:cursor-default',
                      on ? 'bg-ink text-sand' : 'text-body enabled:hover:bg-stone/60'
                    )}
                  >
                    <span className="w-6 font-semibold tabular-nums flex items-center gap-0.5">
                      {star}
                      <Star className={cn('w-3 h-3', on ? 'fill-sand text-sand' : 'fill-gold text-gold')} />
                    </span>
                    <span className={cn('flex-1 h-2 rounded-full overflow-hidden', on ? 'bg-sand/20' : 'bg-stone')}>
                      <motion.span
                        className={cn('block h-full rounded-full', on ? 'bg-sand' : 'bg-gold')}
                        initial={reduced ? false : { width: 0 }}
                        whileInView={{ width: `${(n / reviews.length) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: EASE, delay: i * 0.06 }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums text-xs font-semibold">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* The list */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="skeleton h-36 rounded-[20px]" />
          <div className="skeleton h-36 rounded-[20px]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[24px] bg-paper border border-line p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <span className="w-14 h-14 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <p className="font-display text-xl text-ink">Be the first to share your experience</p>
            <p className="text-sm text-muted mt-1">Help fellow explorers know what to expect at {placeName}.</p>
          </div>
          <button type="button" onClick={() => textRef.current?.focus()} className="btn-ghost shrink-0">
            <PenLine className="w-4 h-4" /> Write the first review
          </button>
        </div>
      ) : (
        <div>
          {reviews.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {SORTS.map((s) => (
                  <Chip key={s.key} group="review-sort" active={sort === s.key} onClick={() => setSort(s.key)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              {starFilter && (
                <button type="button" onClick={() => setStarFilter(null)} className="text-sm font-bold text-accent-text hover:text-ink transition-colors">
                  Showing {starFilter}-star · Show all
                </button>
              )}
            </div>
          )}
          <motion.div layout className="grid sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((r, i) => (
                <ReviewCard key={r.id} review={r} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Leave a review */}
      <form id="write-review" onSubmit={submit} className="scroll-mt-32 rounded-[24px] bg-paper border border-line p-6 sm:p-8 card-shadow">
        <div className="flex items-start gap-4 pb-6 mb-6 border-b border-line">
          <span className="w-11 h-11 rounded-2xl bg-sage-soft text-sage-text flex items-center justify-center shrink-0 -rotate-3">
            <PenLine className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-2xl text-ink leading-tight">Been here? Leave a review</h3>
            <p className="text-sm text-muted mt-1">Tips on timing, parking or the best viewpoints help the next traveller to {placeName}.</p>
          </div>
        </div>

        <AnimatePresence>
          {posted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              role="status"
            >
              <div className="mb-5 p-3.5 rounded-2xl text-sm flex items-center gap-2 bg-sage-soft text-sage-text font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" /> Your review is up. Thank you!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl text-sm flex items-center gap-2 bg-[#FBE4E0] text-[#A8321F]" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Rating, with a word that says what it means */}
        <p className="text-label text-muted mb-2.5">Your rating</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-7 rounded-2xl bg-sand/70 border border-line px-4 py-3 sm:w-fit">
          <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)} role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={newRating === star}
                aria-label={`${star} star${star > 1 ? 's' : ''}, ${RATING_WORDS[star]}`}
                onClick={() => setNewRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                className="p-1 -m-0.5 rounded-lg transition-transform hover:scale-115 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                {/* Re-keyed on each pick so the chosen stars pop in a quick wave */}
                <motion.span
                  key={`${star}-${newRating}`}
                  className="block"
                  initial={reduced || star > newRating ? false : { scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 14, delay: star * 0.035 }}
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors duration-200',
                      star <= live ? 'text-gold fill-gold drop-shadow-[0_3px_6px_rgba(201,154,59,0.35)]' : 'text-stone-deep fill-stone'
                    )}
                  />
                </motion.span>
              </button>
            ))}
          </div>
          <span className="relative inline-grid min-w-[7.5rem]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={live}
                className="[grid-area:1/1] font-display text-xl text-ink whitespace-nowrap"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {RATING_WORDS[live]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        {/* Prompts that start a line; a used one turns sage and jumps back to its line */}
        <label htmlFor="review-comment" className="text-label text-muted block mb-2.5">
          Your experience
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PROMPTS.map((p) => {
            const used = usedPrompts.has(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={used}
                onClick={() => addPrompt(p)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold active:scale-95 transition-[border-color,background-color,color,scale] duration-200',
                  used ? 'border-sage/40 bg-sage-soft text-sage-text' : 'border-line bg-sand text-body hover:border-ink hover:text-ink'
                )}
              >
                {used ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                {p}
              </button>
            );
          })}
        </div>

        {/* One composer: the text, then how helpful it reads so far */}
        <div
          className={cn(
            'rounded-[18px] border bg-white/60 transition-[border-color,box-shadow,background-color] duration-200',
            'border-line-strong hover:border-[rgba(16,42,46,0.32)] focus-within:!border-ink focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(16,42,46,0.08)]'
          )}
        >
          <textarea
            ref={textRef}
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setPosted(false);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            placeholder="What did you love? Tap a prompt above to start a line."
            className="block w-full min-h-[7.5rem] max-h-[22rem] resize-none bg-transparent px-4 pt-3.5 pb-2 text-ink leading-relaxed placeholder:text-[#8A938F] outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
            <div className="flex items-center gap-2.5" aria-live="polite">
              <span className="flex gap-1" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={cn('h-1.5 w-5 rounded-full transition-colors duration-300', n <= quality ? (quality === 3 ? 'bg-sage' : 'bg-gold') : 'bg-stone')}
                  />
                ))}
              </span>
              <span className={cn('text-xs font-semibold transition-colors', quality === 3 ? 'text-sage-text' : 'text-muted')}>{QUALITY_WORDS[quality]}</span>
            </div>
            <span className="text-[11px] tabular-nums text-faint">{length || ''}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <EyeOff className="w-3.5 h-3.5" /> Posted as a traveller, without your name.
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden sm:inline text-[11px] text-faint">Ctrl + Enter</span>
            <button type="submit" disabled={posting || !length} className="btn-primary">
              {posting ? (
                <>
                  <span className="w-4 h-4 border-2 border-sand/50 border-t-transparent rounded-full animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  Post review <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
