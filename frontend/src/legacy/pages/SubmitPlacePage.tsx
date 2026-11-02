import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  FileText,
  ImagePlus,
  Info,
  MapPin,
  MapPinned,
  Navigation,
  Send,
  UtensilsCrossed,
} from 'lucide-react';
import { submissionsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ImageUploader } from '../components/ImageUploader';
import { MenuUploader } from '../components/MenuUploader';
import { PlaceCard } from '../components/places/PlaceCard';
import { SplitHeading } from '../components/motion/SplitHeading';
import { PLACE_CATEGORIES } from '../types';
import { categoryIcon } from '../utils/categories';
import { photoProps } from '../utils/images';
import { cn } from '../utils/cn';
import { hoursMarker, hoursMode } from '../utils/hours';
import { HoursModeToggles } from '../components/ui/Open247Toggle';
import { Question } from '../components/ui/Question';
import { revealProps } from '../utils/reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

const EMPTY_FORM = {
  place_name: '',
  approximate_location: '',
  category: '',
  estimated_cost: '',
  description: '',
  map_link: '',
  opening_hours: '',
  closing_hours: '',
  transport_options: '',
  nearby_facilities: '',
};
type FormState = typeof EMPTY_FORM;

const COST_PRESETS = [
  { label: 'Free', value: '0' },
  { label: '₹100', value: '100' },
  { label: '₹250', value: '250' },
  { label: '₹500', value: '500' },
  { label: '₹1,000', value: '1000' },
];

type ExtraKey = 'description' | 'photos' | 'menu' | 'map' | 'practical';

const isValidCost = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;

/* The four required answers, in the order they are asked */
const REQUIRED_STEPS: { key: keyof FormState; label: string; done: (f: FormState) => boolean }[] = [
  { key: 'place_name', label: 'Place name', done: (f) => f.place_name.trim().length >= 2 },
  { key: 'approximate_location', label: 'Location', done: (f) => f.approximate_location.trim().length >= 2 },
  { key: 'category', label: 'Category', done: (f) => Boolean(f.category) },
  { key: 'estimated_cost', label: 'Cost per person', done: (f) => isValidCost(f.estimated_cost) },
];

export const SubmitPlacePage = () => {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [menuUrls, setMenuUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [openExtra, setOpenExtra] = useState<ExtraKey | null>(null);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formTopRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // How many required questions are on screen. Each appears once the previous one is answered,
  // and stays visible afterwards so editing an earlier answer never hides later ones.
  const answeredInOrder = useMemo(() => {
    let n = 0;
    for (const step of REQUIRED_STEPS) {
      if (!step.done(form)) break;
      n++;
    }
    return n;
  }, [form]);
  const [revealed, setRevealed] = useState(1);
  useEffect(() => {
    setRevealed((r) => Math.max(r, Math.min(REQUIRED_STEPS.length, answeredInOrder + 1)));
  }, [answeredInOrder]);

  useEffect(() => {
    if (form.category !== 'Cafes & Restaurants') {
      setMenuUrls([]);
      setOpenExtra((k) => (k === 'menu' ? null : k));
    }
  }, [form.category]);

  const timingMode = hoursMode(form.opening_hours, form.closing_hours);
  const requiredDone = REQUIRED_STEPS.every((s) => s.done(form));
  const doneCount = REQUIRED_STEPS.filter((s) => s.done(form)).length;

  const validateForm = (data: FormState) => {
    const newErrors: Record<string, string> = {};
    if (!data.place_name?.trim()) newErrors.place_name = 'Place name is required';
    if (!data.approximate_location?.trim()) newErrors.approximate_location = 'Location is required';

    // Cost validation: 0 is completely allowed for sightseeing/free spots!
    if (!isValidCost(data.estimated_cost)) {
      newErrors.estimated_cost = 'Please enter a valid cost (enter 0 for free sightseeing)';
    }

    if (!data.category) newErrors.category = 'Please select a category';

    // Google Maps security verification: protect community from hazardous/phishing links
    if (data.map_link && data.map_link.trim() !== '') {
      const link = data.map_link.trim();
      const isGoogleMaps = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(link);
      if (!isGoogleMaps) {
        newErrors.map_link = 'Please provide a valid Google Maps link (e.g. https://maps.app.goo.gl/... or https://maps.google.com/...)';
      }
    }

    return newErrors;
  };

  const scrollToFormTop = () => formTopRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setRevealed(REQUIRED_STEPS.length);
      if (validationErrors.map_link) setOpenExtra('map');
      scrollToFormTop();
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submissionsApi.submitPlace({
        name: form.place_name,
        description: form.description,
        state: form.approximate_location,
        budget_tier: String(form.estimated_cost),
        image_url: imageUrl || 'https://images.unsplash.com/photo-1506461883276-594543d04e12',
        gallery_images: galleryUrls,
        menu_images: form.category === 'Cafes & Restaurants' ? menuUrls : [],
        map_link: form.map_link,
        category: form.category,
        opening_hours: form.opening_hours.trim() || null,
        closing_hours: form.closing_hours.trim() || null,
        transport_options: form.transport_options.trim() || null,
        nearby_facilities: form.nearby_facilities.trim() || null,
        submitted_by_email: user?.email || null,
        submission_status: 'pending',
      });

      if (success) {
        setIsSuccess(true);
        window.scrollTo({ top: 0 });
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Failed to submit. Please try again.';
      setSubmitError(msg);
      scrollToFormTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageUrl('');
    setGalleryUrls([]);
    setMenuUrls([]);
    setErrors({});
    setSubmitError(null);
    setRevealed(1);
    setOpenExtra(null);
    setIsSuccess(false);
    window.scrollTo({ top: 0 });
  };

  // Enter moves to the next question instead of submitting half a form
  const nextOnEnter = (next: React.RefObject<HTMLInputElement | null>) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      next.current?.focus();
    }
  };

  const reveal = revealProps(reduced);

  const preview = {
    id: 0,
    name: form.place_name.trim() || 'Your hidden gem',
    category: form.category || 'Category',
    description: form.description.trim() || 'A line or two about what makes this place special will appear here.',
    image_url: imageUrl || undefined,
    budget_tier: isValidCost(form.estimated_cost) ? form.estimated_cost : undefined,
    state: form.approximate_location.trim() || undefined,
  };

  const extras: { key: ExtraKey; icon: typeof FileText; title: string; blurb: string; filled: boolean }[] = [
    { key: 'description', icon: FileText, title: 'Describe it', blurb: 'What makes it special, tips, cautions', filled: Boolean(form.description.trim()) },
    { key: 'photos', icon: ImagePlus, title: 'Add photos', blurb: 'A cover shot and up to five more', filled: Boolean(imageUrl || galleryUrls.length) },
    ...(form.category === 'Cafes & Restaurants'
      ? [{ key: 'menu' as ExtraKey, icon: UtensilsCrossed, title: 'Add menu', blurb: 'Up to five photos of the menu', filled: Boolean(menuUrls.length) }]
      : []),
    { key: 'map', icon: MapPinned, title: 'Pin on Google Maps', blurb: 'So people can navigate straight there', filled: Boolean(form.map_link.trim()) },
    {
      key: 'practical',
      icon: Clock,
      title: 'Practical info',
      blurb: 'Timings, how to reach, facilities',
      filled: Boolean(form.opening_hours || form.closing_hours || form.transport_options.trim() || form.nearby_facilities.trim()),
    },
  ];

  /* ── Success ── */
  if (isSuccess) {
    return (
      <div className="bg-sand pt-32 pb-24 px-page">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="max-w-5xl mx-auto card overflow-hidden grid md:grid-cols-2 card-shadow-hover"
        >
          <div className="relative min-h-[280px]">
            <img {...photoProps('hampi', '(min-width: 768px) 50vw, 100vw')} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <motion.span
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.3 }}
              className="w-14 h-14 rounded-full bg-ink text-sand flex items-center justify-center mb-6"
            >
              <Check className="w-7 h-7" />
            </motion.span>
            <p className="section-label mb-3">Submitted</p>
            <h1 className="font-display text-4xl text-ink mb-4">Thank you. It's with our team now.</h1>
            <p className="text-body leading-relaxed mb-8">
              We check every place for accuracy before it goes live for the SafarNamma community. You'll get a notification once it's reviewed.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={resetForm} className="btn-primary">
                Share another place
              </button>
              <Link to="/explore" className="btn-ghost">
                Explore places
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-sand">
      {/* ── Hero ── */}
      <section className="relative h-[62vh] min-h-[480px] max-h-[720px] overflow-hidden bg-night grain">
        <img
          {...photoProps('omBeach')}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-[center_65%] animate-fade-in"
        />
        <div className="absolute inset-0 hero-scrim" />
        <div className="on-photo relative z-10 h-full max-w-6xl mx-auto px-page flex flex-col justify-end pb-36">
          <p className="section-label mb-5 animate-fade-up">Community · Share a place</p>
          <SplitHeading
            as="h1"
            onMount
            delay={0.1}
            className="text-display text-sand max-w-3xl"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 5.75rem)' }}
            accentClassName="italic font-medium text-[#F4B08A]"
            parts={[{ text: 'Share a' }, { text: 'hidden gem.', accent: true }]}
          />
          <p className="text-[#E4E8E5] text-lg max-w-xl mt-5 animate-fade-up delay-400">
            Four quick questions and it's on its way. Everything else is optional.
          </p>
        </div>
      </section>

      {/* ── Form + live preview ── */}
      <div ref={formTopRef} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-page -mt-24 pb-28 scroll-mt-28">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10 items-start">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
            className="card card-shadow-hover !rounded-[32px] p-6 sm:p-10 lg:p-12"
          >
            {submitError && (
              <div className="mb-8 p-4 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-sm flex items-start gap-3" role="alert">
                <Info className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#8A1C12]">We couldn't submit this place</p>
                  <p className="text-[#8A1C12]/85 mt-0.5 leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="flex items-center justify-between gap-4 mb-10">
              <p className="text-label text-muted">
                Required · <span className="text-ink">{doneCount}</span> of {REQUIRED_STEPS.length}
              </p>
              <div className="flex gap-1.5 flex-1 max-w-[200px]" aria-hidden>
                {REQUIRED_STEPS.map((s) => (
                  <span key={s.key} className="h-1 flex-1 rounded-full bg-stone overflow-hidden">
                    <motion.span
                      className="block h-full bg-accent origin-left"
                      initial={false}
                      animate={{ scaleX: s.done(form) ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-10">
                {/* 1 · Name */}
                <Question index={1} title="What's the place called?" done={REQUIRED_STEPS[0].done(form)}>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="place_name"
                      type="text"
                      value={form.place_name}
                      onChange={(e) => set('place_name', e.target.value)}
                      onKeyDown={nextOnEnter(locationRef)}
                      className={cn('field !pl-11 !text-base !py-4', errors.place_name && 'field-error')}
                      placeholder="e.g. Avalabetta Viewpoint"
                      aria-label="Place name"
                      aria-invalid={Boolean(errors.place_name)}
                      autoComplete="off"
                    />
                  </div>
                  {errors.place_name && <p className="text-sm text-[#B42318] mt-2">{errors.place_name}</p>}
                </Question>

                {/* 2 · Location */}
                <AnimatePresence initial={false}>
                  {revealed >= 2 && (
                    <motion.div key="loc" {...reveal} className="overflow-hidden">
                      <Question index={2} title="Where is it?" hint="An area, town or district is enough." done={REQUIRED_STEPS[1].done(form)}>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                          <input
                            ref={locationRef}
                            id="approximate_location"
                            type="text"
                            value={form.approximate_location}
                            onChange={(e) => set('approximate_location', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            className={cn('field !pl-11 !text-base !py-4', errors.approximate_location && 'field-error')}
                            placeholder="e.g. Chikkaballapur District"
                            aria-label="Approximate location"
                            aria-invalid={Boolean(errors.approximate_location)}
                          />
                        </div>
                        {errors.approximate_location && <p className="text-sm text-[#B42318] mt-2">{errors.approximate_location}</p>}
                      </Question>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3 · Category */}
                <AnimatePresence initial={false}>
                  {revealed >= 3 && (
                    <motion.div key="cat" {...reveal} className="overflow-hidden">
                      <Question index={3} title="What kind of place is it?" hint="Pick the one that fits best." done={REQUIRED_STEPS[2].done(form)}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Category">
                          {PLACE_CATEGORIES.map((cat) => {
                            const Icon = categoryIcon(cat);
                            const active = form.category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  set('category', cat);
                                  setTimeout(() => costRef.current?.focus({ preventScroll: true }), 350);
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border text-left text-sm font-semibold transition-all duration-300',
                                  active ? 'bg-ink text-sand border-ink shadow-lg shadow-ink/20' : 'bg-paper text-body border-line-strong hover:border-ink hover:text-ink'
                                )}
                              >
                                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#F4B08A]' : 'text-muted')} />
                                <span className="leading-tight">{cat}</span>
                              </button>
                            );
                          })}
                        </div>
                        {errors.category && <p className="text-sm text-[#B42318] mt-2">{errors.category}</p>}
                      </Question>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 4 · Cost */}
                <AnimatePresence initial={false}>
                  {revealed >= 4 && (
                    <motion.div key="cost" {...reveal} className="overflow-hidden">
                      <Question index={4} title="Roughly what does it cost per person?" hint="Entry, food or activity. Choose Free if it's free to visit." done={REQUIRED_STEPS[3].done(form)}>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {COST_PRESETS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              aria-pressed={form.estimated_cost === p.value}
                              onClick={() => set('estimated_cost', p.value)}
                              className={cn(
                                'px-4 py-2 rounded-full border text-sm font-semibold transition-colors',
                                form.estimated_cost === p.value ? 'bg-ink text-sand border-ink' : 'border-line-strong text-body hover:border-ink hover:text-ink'
                              )}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <div className="relative max-w-xs">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">₹</span>
                          <input
                            ref={costRef}
                            id="estimated_cost"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={form.estimated_cost}
                            onChange={(e) => set('estimated_cost', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            className={cn('field !pl-9 !text-base !py-4', errors.estimated_cost && 'field-error')}
                            placeholder="Or type an amount"
                            aria-label="Estimated cost per person in rupees"
                            aria-invalid={Boolean(errors.estimated_cost)}
                          />
                        </div>
                        {errors.estimated_cost && <p className="text-sm text-[#B42318] mt-2">{errors.estimated_cost}</p>}
                      </Question>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Optional extras: only once the required answers are in ── */}
              <AnimatePresence initial={false}>
                {requiredDone && (
                  <motion.div key="extras" {...reveal} className="overflow-hidden">
                    <div className="mt-14 pt-10 border-t border-line">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                        <h3 className="font-display text-2xl text-ink">Want to add more?</h3>
                        <span className="badge bg-sage-soft text-sage-text">All optional</span>
                      </div>
                      <p className="text-sm text-muted mb-6">
                        You can submit now. Extra details help our team approve it faster and help travellers plan.
                      </p>

                      <div className="space-y-3">
                        {extras.map((x) => {
                          const open = openExtra === x.key;
                          const Icon = x.icon;
                          return (
                            <div key={x.key} className={cn('rounded-2xl border transition-colors', open ? 'border-ink bg-paper' : 'border-line-strong bg-paper/60')}>
                              <button
                                type="button"
                                onClick={() => setOpenExtra(open ? null : x.key)}
                                aria-expanded={open}
                                className="w-full flex items-center gap-4 p-4 sm:p-5 text-left"
                              >
                                <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', x.filled ? 'bg-ink text-sand' : 'bg-stone text-ink')}>
                                  {x.filled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block font-semibold text-ink">{x.title}</span>
                                  <span className="block text-sm text-muted truncate">{x.filled ? 'Added' : x.blurb}</span>
                                </span>
                                <ChevronDown className={cn('w-5 h-5 text-muted transition-transform duration-300', open && 'rotate-180')} />
                              </button>

                              <AnimatePresence initial={false}>
                                {open && (
                                  <motion.div
                                    key="panel"
                                    initial={reduced ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.45, ease: EASE }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 sm:px-5 pb-5 pt-1">
                                      {x.key === 'description' && (
                                        <textarea
                                          id="description"
                                          rows={4}
                                          value={form.description}
                                          onChange={(e) => set('description', e.target.value)}
                                          className="field resize-none"
                                          placeholder="What makes this place special? Any parking tips or things travellers should be careful about?"
                                          aria-label="Description"
                                        />
                                      )}

                                      {x.key === 'photos' && (
                                        <ImageUploader
                                          coverUrl={imageUrl}
                                          onCoverChange={setImageUrl}
                                          coverRequired={false}
                                          galleryUrls={galleryUrls}
                                          onGalleryChange={setGalleryUrls}
                                          maxGalleryPhotos={5}
                                        />
                                      )}

                                      {x.key === 'menu' && (
                                        <MenuUploader menuUrls={menuUrls} onMenuChange={setMenuUrls} maxMenuPhotos={5} />
                                      )}

                                      {x.key === 'map' && (
                                        <>
                                          <input
                                            id="map_link"
                                            type="url"
                                            value={form.map_link}
                                            onChange={(e) => set('map_link', e.target.value)}
                                            className={cn('field', errors.map_link && 'field-error')}
                                            placeholder="https://maps.app.goo.gl/…"
                                            aria-label="Google Maps link"
                                            aria-invalid={Boolean(errors.map_link)}
                                          />
                                          {errors.map_link ? (
                                            <p className="text-sm text-[#B42318] mt-2">{errors.map_link}</p>
                                          ) : (
                                            <p className="field-hint mt-2">Google Maps links only. Open the place in Maps, tap Share, and paste the link here.</p>
                                          )}
                                        </>
                                      )}

                                      {x.key === 'practical' && (
                                        <div className="space-y-4">
                                          <HoursModeToggles
                                            mode={timingMode}
                                            onChange={(m) => {
                                              const v = m === 'times' ? '' : hoursMarker(m);
                                              setForm((f) => ({ ...f, opening_hours: v, closing_hours: v }));
                                            }}
                                          />
                                          {timingMode === 'description' && (
                                            <p className="field-hint -mt-1">
                                              Write the timings in <strong className="text-ink">Describe it</strong> above, e.g. “Morning 6–9 AM, evening 5:30–7 PM”.
                                            </p>
                                          )}
                                          {timingMode === 'times' && (
                                            <div className="grid sm:grid-cols-2 gap-4">
                                              <div>
                                                <label htmlFor="opening_hours" className="field-label">Opens at</label>
                                                <input id="opening_hours" type="time" value={form.opening_hours} onChange={(e) => set('opening_hours', e.target.value)} className="field" />
                                              </div>
                                              <div>
                                                <label htmlFor="closing_hours" className="field-label">Closes at</label>
                                                <input id="closing_hours" type="time" value={form.closing_hours} onChange={(e) => set('closing_hours', e.target.value)} className="field" />
                                              </div>
                                            </div>
                                          )}
                                          <div>
                                            <label htmlFor="transport_options" className="field-label">How to get there</label>
                                            <input
                                              id="transport_options"
                                              type="text"
                                              value={form.transport_options}
                                              onChange={(e) => set('transport_options', e.target.value)}
                                              className="field"
                                              placeholder="e.g. BMTC bus 335E, or 10 minutes from the metro"
                                            />
                                          </div>
                                          <div>
                                            <label htmlFor="nearby_facilities" className="field-label">Nearby facilities</label>
                                            <input
                                              id="nearby_facilities"
                                              type="text"
                                              value={form.nearby_facilities}
                                              onChange={(e) => set('nearby_facilities', e.target.value)}
                                              className="field"
                                              placeholder="e.g. Restrooms, parking, street food (comma-separated)"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Submit ── */}
              <div className="mt-12 pt-8 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-muted" aria-live="polite">
                  {requiredDone ? (
                    <span className="flex items-center gap-2 text-sage-text font-semibold">
                      <Check className="w-4 h-4" /> Ready to submit
                    </span>
                  ) : (
                    <>
                      Still needed:{' '}
                      <span className="text-ink font-semibold">
                        {REQUIRED_STEPS.filter((s) => !s.done(form))
                          .map((s) => s.label.toLowerCase())
                          .join(', ')}
                      </span>
                    </>
                  )}
                </p>
                <button type="submit" disabled={!requiredDone || isSubmitting} className="btn-accent !px-7 !py-4 !text-[15px]">
                  {isSubmitting ? (
                    'Submitting…'
                  ) : (
                    <>
                      Submit for review <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted mt-4 sm:text-right">By submitting, you agree to our community guidelines.</p>
            </form>
          </motion.div>

          {/* ── Live preview ── */}
          <aside className="hidden lg:block sticky top-28 lg:mt-32">
            <p className="text-label text-muted mb-4 flex items-center gap-2">
              <span className="live-dot" /> Live preview
            </p>
            <div className="pointer-events-none">
              <PlaceCard place={preview} to={null} priceLabel={isValidCost(form.estimated_cost) ? undefined : 'Cost per person'} />
            </div>
            <ul className="mt-6 space-y-2.5">
              {REQUIRED_STEPS.map((s) => (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center transition-colors', s.done(form) ? 'bg-ink text-sand' : 'border border-line-strong')}>
                    {s.done(form) && <Check className="w-3 h-3" />}
                  </span>
                  <span className={s.done(form) ? 'text-ink font-semibold' : 'text-muted'}>{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-6 leading-relaxed flex gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              This is how travellers will see your place on Explore once it's approved.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};
