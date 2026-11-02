import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Camera, ImagePlus, Share2, Sparkles, Users, X } from 'lucide-react';
import { photoSrc } from '../../utils/images';
import { setScrollLocked } from '../../hooks/useLenis';
import { Reveal } from '../motion/Reveal';
import { SplitHeading } from '../motion/SplitHeading';

/* Marketing for the Trip Story Maker: a phone mock of a finished story, a home-page section,
   and a one-time announcement on the Groups page. */

const SAMPLE_CAPTIONS = [
  'Kal ka pata nahi, aaj Skandagiri tha',
  'Some trips end. The group chat doesn’t.',
  'Coorg ✔️ Assignments ❌',
  'Found my people at Hampi',
  'Up before the sun for Nandi Hills',
  'Hostel se bahar, zindagi ke andar',
];

/** Cycles through sample captions so the mock feels alive. */
const useRotatingCaption = () => {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % SAMPLE_CAPTIONS.length), 2600);
    return () => clearInterval(t);
  }, [reduced]);
  return SAMPLE_CAPTIONS[i];
};

/* A phone showing a ticket-style story, drawn with HTML so it stays crisp at any size. */
export const StoryPhoneMock = ({ className = '', small = false }: { className?: string; small?: boolean }) => {
  const caption = useRotatingCaption();
  return (
    <div className={`relative ${className}`}>
      {/* Post, tilted behind */}
      {!small && (
        <div className="hidden sm:block absolute -left-16 top-16 w-[62%] rotate-[-8deg] rounded-[26px] bg-sand p-2.5 shadow-2xl ring-1 ring-black/5">
          <div className="rounded-[18px] overflow-hidden bg-sand">
            <div className="grid grid-cols-2 gap-1.5 p-1.5">
              <img src={photoSrc('coorgFalls', 800)} alt="" className="aspect-square w-full object-cover rounded-xl" loading="lazy" />
              <img src={photoSrc('friends', 800)} alt="" className="aspect-square w-full object-cover rounded-xl" loading="lazy" />
              <img src={photoSrc('hampi', 800)} alt="" className="col-span-2 aspect-[2/1] w-full object-cover rounded-xl" loading="lazy" />
            </div>
            <p className="px-3 pb-3 pt-1 font-display text-ink text-sm leading-tight">3 places, 1 day, 0 regrets</p>
          </div>
        </div>
      )}

      {/* Story, in a phone */}
      <div className={`relative ${small ? 'w-[190px]' : 'w-[250px] sm:w-[280px]'} mx-auto rounded-[40px] bg-[#0A1517] p-2.5 shadow-[0_40px_80px_-30px_rgba(14,31,34,0.7)] ring-1 ring-white/10`}>
        <div className="relative rounded-[32px] overflow-hidden bg-night aspect-[9/16] flex flex-col">
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black/80 z-10" aria-hidden />
          <p className="font-mono text-[8px] tracking-[0.2em] text-[#F4B08A] px-4 pt-8 whitespace-nowrap">{small ? 'SUN, 27 SEPT' : 'SUN, 27 SEPT · 4 EXPLORERS'}</p>
          <div className="relative mx-3 mt-2 flex-[1.5] rounded-2xl overflow-hidden">
            <img src={photoSrc('skandagiri', 800)} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
            <div className="absolute left-2 bottom-2 flex gap-1.5">
              {(['nandi', 'coorgFalls'] as const).map((k) => (
                <img key={k} src={photoSrc(k, 800)} alt="" className="w-10 h-10 object-cover rounded-lg ring-2 ring-sand" loading="lazy" />
              ))}
            </div>
          </div>
          <div className="px-4 pt-3 min-h-[3.4em]">
            <AnimatePresence mode="wait">
              <motion.p
                key={caption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className={`font-display text-sand leading-[1.05] ${small ? 'text-[15px]' : 'text-[19px]'}`}
              >
                {caption}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mx-3 mt-2 rounded-xl bg-paper px-3 py-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[7px] tracking-[0.18em] text-muted">ROUTE</p>
              <p className="text-[10px] font-semibold text-ink truncate">Skandagiri → Nandi Hills</p>
            </div>
            <p className="font-display text-accent text-lg leading-none pl-2 border-l border-dashed border-line-strong">4</p>
          </div>
          <div className="mt-auto flex items-center justify-between px-4 py-3">
            <span className="font-display text-[11px] text-sand">SafarNamma</span>
            {!small && <span className="text-[8px] text-[#F4B08A]">safarnamma.vercel.app</span>}
          </div>
        </div>
      </div>

      {/* Floating "shared" chip */}
      <div className={`absolute ${small ? '-right-2 top-8' : '-right-2 sm:-right-8 top-24'} animate-float`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-xs font-bold px-3 py-1.5 shadow-lg">
          <Camera className="w-3.5 h-3.5" /> Shared
        </span>
      </div>
    </div>
  );
};

const STEPS = [
  { icon: Users, title: 'Go on a trip', body: 'Join one on SafarNamma or host your own.' },
  { icon: ImagePlus, title: 'Add a photo or two', body: 'For each place. That’s all you do.' },
  { icon: Share2, title: 'Share in seconds', body: 'We design it and write the caption. Story or post.' },
];

/* Home page section */
export const StoryPromoSection = () => (
  <section className="px-3 sm:px-5 pb-20 lg:pb-24">
    <div className="relative overflow-hidden rounded-[36px] bg-night grain">
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-accent/25 blur-3xl pointer-events-none" aria-hidden />
      <div className="on-photo relative max-w-7xl mx-auto px-page py-16 sm:py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Reveal>
            <span className="badge bg-accent text-white mb-5">
              <Sparkles className="w-3 h-3" /> New · Trip Story Maker
            </span>
          </Reveal>
          <SplitHeading
            className="text-display text-sand mb-5"
            style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4rem)' }}
            accentClassName="italic font-medium text-[#F4B08A]"
            parts={[{ text: 'Go on a trip.', breakAfter: true }, { text: 'Your Insta story', accent: true }, { text: 'makes itself.' }]}
          />
          <Reveal delay={0.15}>
            <p className="text-[#D8DEDA] text-lg leading-relaxed mb-8 max-w-lg">
              Every SafarNamma trip now ends with a ready-to-post Instagram story or post: your photos, a great design, and a caption that isn’t boring.
            </p>
          </Reveal>
          <Reveal stagger={0.1} className="grid sm:grid-cols-3 gap-3 mb-9">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <span className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <Icon className="w-4 h-4 text-[#F4B08A]" />
                </span>
                <p className="font-semibold text-sand text-sm">{title}</p>
                <p className="text-xs text-[#C9D2CE] mt-1 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </Reveal>
          <Reveal delay={0.25} className="flex flex-wrap gap-3">
            <Link to="/groups" className="btn-primary">
              <Camera className="w-4 h-4" /> Find a trip
            </Link>
            <Link to="/groups?host=1" className="btn-ghost">
              Host a trip <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
        <Reveal delay={0.2} className="flex justify-center lg:justify-end pr-6 sm:pr-10">
          <StoryPhoneMock />
        </Reveal>
      </div>
    </div>
  </section>
);

const SEEN_KEY = 'sn:storyPromoSeen:v1';
const hasSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable: it may show again, nothing breaks */
  }
};

/* Groups page: pops up once on the first visit, then lives on as a slim banner that reopens it. */
export const StoryPromoAnnouncement = ({ onHost, onBrowse }: { onHost: () => void; onBrowse: () => void }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeen()) return;
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      setScrollLocked(false);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  return (
    <>
      {/* Slim banner, always there */}
      <div className="max-w-7xl mx-auto w-full px-page pt-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-night text-sand px-5 py-4 text-left card-shadow hover:bg-night-soft transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="badge bg-accent text-white shrink-0">
              <Sparkles className="w-3 h-3" /> New
            </span>
            <span className="text-sm sm:text-base">
              Every trip now ends with a <span className="font-semibold text-[#F4B08A]">ready-made Instagram story</span>. Just add your photos.
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F4B08A] shrink-0">
            See how <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* One-time announcement */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={close} aria-label="Close" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="story-promo-title"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-night text-sand grain"
              data-lenis-prevent
            >
              <button onClick={close} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
              <div className="on-photo relative grid sm:grid-cols-[1fr_auto] gap-8 p-7 sm:p-10 items-center">
                <div>
                  <span className="badge bg-accent text-white mb-4">
                    <Sparkles className="w-3 h-3" /> New on SafarNamma
                  </span>
                  <h2 id="story-promo-title" className="font-display text-sand text-3xl sm:text-4xl leading-[1.05] mb-4">
                    Your trip, <span className="italic text-[#F4B08A]">Insta-ready</span> in seconds.
                  </h2>
                  <p className="text-[#D8DEDA] mb-6">
                    90 minutes after your trip starts, a Story Maker opens for the whole crew and stays open for 24 hours after the start. Add a photo or two per place and pick a look. We make the story or post, and write a caption you’ll actually want to use.
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {['Story (9:16) or post (4:5)', '200+ captions in Hinglish and English, never the same twice', 'Photos stay on your phone. Nothing is uploaded.'].map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-sm text-[#D8DEDA]">
                        <span className="mt-1 w-4 h-4 rounded-full bg-accent/90 text-white text-[10px] flex items-center justify-center shrink-0">✓</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onBrowse();
                      }}
                      className="btn-primary"
                    >
                      Find a trip to join
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onHost();
                      }}
                      className="btn-ghost"
                    >
                      Host a trip
                    </button>
                  </div>
                </div>
                <div className="hidden sm:block pr-4">
                  <StoryPhoneMock small />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
