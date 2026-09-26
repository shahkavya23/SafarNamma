import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  Mail,
  Shield,
  Calendar,
  MapPin,
  Heart,
  Users,
  Sparkles,
  X,
  Compass,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Pencil,
  Quote,
  Camera,
  Upload,
  Loader2,
  RefreshCw,
  Trash2,
  Check,
  ImagePlus,
} from 'lucide-react';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { submissionsApi, groupsApi, placesApi } from '../api/client';
import { findGroupPlace, isStoryUnlocked } from '../utils/groups';
import type { Group, Place } from '../types';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal } from '../components/motion/Reveal';
import { Counter } from '../components/motion/Counter';
import { Chip } from '../components/ui/Chip';
import { GroupCard } from '../components/groups/GroupCard';
import { fallbackPhoto, optimizeImageUrl, photoProps } from '../utils/images';
import { shortLocation } from '../utils/format';
import { setScrollLocked } from '../hooks/useLenis';
import { cn } from '../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

type Tab = 'saved' | 'shared' | 'trips';

/* ── A slowly turning passport stamp beside the avatar ── */
const Stamp = ({ year }: { year: string }) => {
  const reduced = useReducedMotion();
  const text = `SAFARNAMMA · EXPLORER · SINCE ${year} · `;
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="w-[104px] h-[104px] text-[#F4B08A]"
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      <defs>
        <path id="stamp-circle" d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="var(--color-night)" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 3" />
      <text fontSize="9" fill="currentColor" fontFamily="JetBrains Mono, monospace">
        <textPath href="#stamp-circle" textLength={284} lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
      <g transform="translate(60 60)">
        <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill="currentColor" />
      </g>
    </motion.svg>
  );
};

/* ── One saved or shared place, as a compact photo card ── */
const PlaceRow = ({
  place,
  href,
  badge,
  action,
}: {
  place: Place;
  href?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) => {
  const fallback = fallbackPhoto(place.id);
  const img = optimizeImageUrl(place.image_url || (place as any).image_urls?.[0], 400) || fallback;
  const location = shortLocation(place.state) || place.category || 'Karnataka';
  const body = (
    <>
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-stone shrink-0">
        <img
          src={img}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.src.endsWith(fallback)) el.src = fallback;
          }}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="text-label text-muted mb-1 truncate">{place.category}</p>
        <h3 className="font-display text-xl text-ink leading-snug line-clamp-2">{place.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted mt-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> {location}
        </p>
        {badge && <div className="mt-2.5">{badge}</div>}
      </div>
    </>
  );

  return (
    <div className="group relative card p-3 flex gap-4 items-center hover:border-line-strong hover:card-shadow transition-all duration-300">
      {href ? (
        <Link to={href} className="flex gap-4 items-center flex-1 min-w-0">
          {body}
        </Link>
      ) : (
        <div className="flex gap-4 items-center flex-1 min-w-0">{body}</div>
      )}
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
};

const EmptyState = ({ title, body, cta, to }: { title: string; body: string; cta: string; to: string }) => (
  <div className="card p-10 sm:p-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
    <div>
      <h3 className="font-display text-2xl text-ink mb-2">{title}</h3>
      <p className="text-muted max-w-md">{body}</p>
    </div>
    <Link to={to} className="btn-primary shrink-0">
      {cta} <ArrowUpRight className="w-4 h-4" />
    </Link>
  </div>
);

export const UserProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const reduced = useReducedMotion();

  const [userSubmissions, setUserSubmissions] = useState<Place[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(true);
  const [hostedTrips, setHostedTrips] = useState<Group[]>([]);
  const [tripPlaces, setTripPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<Tab>('saved');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Direct hero photo upload (can change multiple times right from profile)
  const [isUploadingHeroAvatar, setIsUploadingHeroAvatar] = useState(false);
  const heroAvatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch places submitted by this user
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user?.email) return;
      setIsLoadingSubmissions(true);
      try {
        const subs = await submissionsApi.getUserSubmissions(user.email);
        setUserSubmissions(subs);
      } catch (err) {
        console.error('Failed to load user submissions', err);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };
    fetchSubmissions();
  }, [user?.email]);

  // Trips this user is hosting
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    // Hosted + joined trips, finished ones included, so members can come back and make their story
    Promise.all([groupsApi.getMyTrips(), placesApi.getPlaces().catch(() => [] as Place[])])
      .then(([all, places]) => {
        if (cancelled) return;
        setHostedTrips(all);
        setTripPlaces(places || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    setScrollLocked(isEditing);
    if (!isEditing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsEditing(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScrollLocked(false);
    };
  }, [isEditing]);

  // Hero photo: parallax drift + shrink-into-frame on scroll
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroInset = useTransform(heroProgress, [0, 1], [0, 1]);
  const heroClip = useMotionTemplate`inset(calc(${heroInset} * 5%) calc(${heroInset} * 3%) calc(${heroInset} * 5%) calc(${heroInset} * 3%) round calc(${heroInset} * 40px))`;
  const heroImageY = useTransform(heroProgress, [0, 1], ['0%', '16%']);

  const liveCount = useMemo(() => userSubmissions.filter((p) => p.is_approved || (p as any).submission_status === 'approved').length, [userSubmissions]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const joined = user.created_at ? new Date(user.created_at) : null;
  const validJoin = joined && !isNaN(joined.getTime());
  const joinDate = validJoin ? joined!.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';
  const joinYear = validJoin ? String(joined!.getFullYear()) : String(new Date().getFullYear());

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);
    setIsUploadingAvatar(true);

    try {
      const url = await uploadImageToCloudinary(file);
      setFormData((prev) => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      setAvatarUploadError(err.message || 'Failed to upload photo to Cloudinary.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar_url: '' }));
    setAvatarUploadError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Direct hero upload: uploads to Cloudinary and merges directly into the users table avatar column
  const handleDirectHeroAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHeroAvatar(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await updateUser({
        avatar_url: url,
      });
      setFormData((prev) => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      console.error('Failed to upload avatar from hero:', err);
      alert(err.message || 'Failed to upload photo to Cloudinary.');
    } finally {
      setIsUploadingHeroAvatar(false);
      if (heroAvatarInputRef.current) heroAvatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingAvatar) return;
    setIsSaving(true);
    try {
      await updateUser({
        name: formData.name.trim() || user.name,
        bio: formData.bio.trim(),
        avatar_url: formData.avatar_url.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditor = () => {
    setFormData({
      name: user.name || '',
      bio: user.bio || '',
      avatar_url: user.avatar_url || '',
    });
    setAvatarUploadError(null);
    setIsEditing(true);
  };

  const initial = user.name?.charAt(0).toUpperCase() || 'S';
  const stats = [
    { n: favorites.length, l: 'Saved places' },
    { n: userSubmissions.length, l: 'Places shared' },
    { n: liveCount, l: 'Live on SafarNamma' },
    { n: hostedTrips.filter((g) => g.organizer_email?.toLowerCase() === user?.email.toLowerCase()).length, l: 'Trips hosted' },
  ];

  const tabs: { key: Tab; label: string; count: number; icon: typeof Heart }[] = [
    { key: 'saved', label: 'Saved', count: favorites.length, icon: Heart },
    { key: 'shared', label: 'Shared', count: userSubmissions.length, icon: Compass },
    { key: 'trips', label: 'My trips', count: hostedTrips.length, icon: Users },
  ];

  return (
    <div className="bg-sand min-h-screen">
      {/* ═══ Hero ═══ */}
      <section ref={heroRef} className="relative bg-sand pt-36 pb-32">
        {/* Photo backdrop: shrinks into a rounded frame as you scroll, like Explore */}
        <motion.div className="absolute inset-0 overflow-hidden bg-night grain" style={reduced ? undefined : { clipPath: heroClip }}>
          <motion.img
            {...photoProps('mullayanagiri')}
            alt=""
            aria-hidden
            fetchPriority="high"
            style={reduced ? { scale: 1.05 } : { y: heroImageY, scale: 1.12 }}
            className="absolute inset-0 w-full h-full object-cover object-[center_78%] animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/60 to-night/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-transparent to-night/40" />
        </motion.div>

        <div className="on-photo relative z-10 max-w-7xl mx-auto px-page">
          <div className="flex flex-col lg:flex-row lg:items-end gap-10 lg:gap-14">
            {/* Avatar + stamp with direct upload & replace option */}
            <div className="relative shrink-0 self-start">
              <motion.div
                initial={reduced ? false : { clipPath: 'inset(100% 0% 0% 0% round 36px)' }}
                animate={{ clipPath: 'inset(0% 0% 0% 0% round 36px)' }}
                transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
                onClick={() => heroAvatarInputRef.current?.click()}
                className="group relative cursor-pointer w-40 h-40 sm:w-48 sm:h-48 rounded-[36px] overflow-hidden bg-accent text-white flex items-center justify-center font-display text-7xl ring-1 ring-white/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
                title="Click to upload or change profile photo"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  initial
                )}

                {isUploadingHeroAvatar ? (
                  <div className="absolute inset-0 bg-night/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="w-8 h-8 text-[#F4B08A] animate-spin" />
                    <span className="text-xs font-semibold">Updating photo…</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-night/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[2px]">
                    <Camera className="w-6 h-6 text-[#F4B08A]" />
                    <span>{user.avatar_url ? 'Change photo' : 'Upload photo'}</span>
                  </div>
                )}
              </motion.div>
              <div className="absolute -right-12 -bottom-8 pointer-events-none">
                <Stamp year={joinYear} />
              </div>

              {/* Direct hero upload file input */}
              <input
                ref={heroAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleDirectHeroAvatarUpload}
                aria-label="Upload profile photo"
              />
            </div>

            {/* Name, bio, meta */}
            <div className="flex-1 min-w-0">
              <p className="section-label mb-5 animate-fade-up">{user.role === 'admin' ? 'Admin · SafarNamma' : 'Your travel profile'}</p>
              <SplitHeading
                as="h1"
                onMount
                delay={0.15}
                className="text-display text-sand break-words"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5.25rem)' }}
                parts={[{ text: user.name }]}
              />
              <p className="font-display italic text-xl sm:text-2xl text-[#D8DEDA] mt-5 max-w-2xl leading-snug animate-fade-up delay-400">
                {user.bio ? (
                  <>
                    <Quote className="inline w-5 h-5 -mt-3 mr-1 text-[#F4B08A]" />
                    {user.bio}
                  </>
                ) : (
                  <span className="text-sand/55">Add a line about how you like to travel.</span>
                )}
              </p>

              <div className="flex flex-wrap gap-2 mt-7 animate-fade-up delay-500">
                <span className="badge glass-dark !py-2 !px-3.5 !text-xs !font-sans !tracking-normal">
                  <Mail className="w-3.5 h-3.5 text-[#F4B08A]" /> {user.email}
                </span>
                <span className="badge glass-dark !py-2 !px-3.5 !text-xs !font-sans !tracking-normal capitalize">
                  <Shield className="w-3.5 h-3.5 text-[#F4B08A]" /> {user.role}
                </span>
                <span className="badge glass-dark !py-2 !px-3.5 !text-xs !font-sans !tracking-normal">
                  <Calendar className="w-3.5 h-3.5 text-[#F4B08A]" /> Exploring since {joinDate}
                </span>
              </div>
            </div>

            <div className="flex gap-3 lg:self-start animate-fade-up delay-600">
              <button onClick={openEditor} className="btn-primary">
                <Pencil className="w-4 h-4" /> Edit profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats card (overlaps the hero) ═══ */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-page -mt-16">
        <Reveal className="rounded-[28px] overflow-hidden border border-line bg-[#E3DACB] card-shadow-hover grid grid-cols-2 lg:grid-cols-4 gap-px">
          {stats.map((s) => (
            <div key={s.l} className="bg-paper p-6 sm:p-7">
              <p className="font-display text-4xl sm:text-5xl text-ink leading-none">
                <Counter value={s.n} />
              </p>
              <p className="text-label text-muted mt-3">{s.l}</p>
            </div>
          ))}
        </Reveal>
      </div>

      {/* ═══ Collections ═══ */}
      <section className="max-w-7xl mx-auto px-page pt-20 pb-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <Reveal>
              <p className="section-label mb-5">Your collection</p>
            </Reveal>
            <SplitHeading className="text-display text-ink" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }} parts={[{ text: 'Everywhere you' }, { text: 'mean to go.', accent: true }]} />
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-paper border border-line self-start md:self-auto overflow-x-auto scrollbar-none max-w-full">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <Chip key={t.key} group="profile-tabs" active={tab === t.key} onClick={() => setTab(t.key)}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                  <span className={cn('ml-1 text-[11px] font-mono px-1.5 rounded-full', tab === t.key ? 'bg-white/15' : 'bg-stone text-muted')}>{t.count}</span>
                </Chip>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {tab === 'saved' &&
              (favorites.length === 0 ? (
                <EmptyState title="Nothing saved yet" body="Tap Save on any place to build your weekend list. It lives here." cta="Browse places" to="/explore" />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      href={`/places/${place.id}`}
                      action={
                        <button
                          onClick={() => removeFavorite(place.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-accent hover:bg-accent-soft transition-colors"
                          title="Remove from saved"
                          aria-label={`Remove ${place.name} from saved`}
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      }
                    />
                  ))}
                </div>
              ))}

            {tab === 'shared' &&
              (isLoadingSubmissions ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-[136px] rounded-[22px]" />
                  ))}
                </div>
              ) : userSubmissions.length === 0 ? (
                <EmptyState title="You haven't shared a place yet" body="Know a waterfall, temple or café worth the drive? Four quick questions and it's with our team." cta="Share a hidden gem" to="/submit" />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userSubmissions.map((place) => {
                    const isApproved = place.is_approved || (place as any).submission_status === 'approved';
                    return (
                      <PlaceRow
                        key={place.id}
                        place={place}
                        href={isApproved ? `/places/${place.id}` : undefined}
                        badge={
                          isApproved ? (
                            <span className="badge badge-success">
                              <CheckCircle2 className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <span className="badge badge-amber">
                              <Clock className="w-3 h-3" /> In review
                            </span>
                          )
                        }
                        action={
                          isApproved ? (
                            <Link to={`/places/${place.id}`} className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-stone transition-colors" aria-label={`View ${place.name}`}>
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          ) : undefined
                        }
                      />
                    );
                  })}
                  <Link to="/submit" className="card border-dashed !border-line-strong p-3 flex items-center justify-center gap-3 text-muted hover:text-ink hover:!border-ink transition-colors min-h-[136px]">
                    <Plus className="w-5 h-5" /> <span className="font-semibold">Share another place</span>
                  </Link>
                </div>
              ))}

            {tab === 'trips' &&
              (hostedTrips.length === 0 ? (
                <EmptyState title="No trips yet" body="Host a trip or join one. Finished trips show up here so you can make your Instagram story." cta="Find a trip" to="/groups" />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hostedTrips.map((g) => {
                    const hosting = g.organizer_email?.toLowerCase() === user?.email.toLowerCase();
                    return (
                      <div key={g.id} className="flex flex-col gap-3">
                        <div className="relative flex-1">
                          <span className={`badge absolute -top-2.5 left-28 z-10 shadow-sm ${hosting ? 'bg-ink text-sand' : 'badge-teal'}`}>{hosting ? 'Hosting' : 'Joined'}</span>
                          <GroupCard group={g} place={findGroupPlace(g, tripPlaces)} variant="ticket" />
                        </div>
                        {isStoryUnlocked(g) && (
                          <Link to={`/groups/${g.id}/story`} className="btn-accent !py-2.5 w-full">
                            <Sparkles className="w-4 h-4" /> Make story
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ═══ Edit profile side sheet ═══ */}
      <AnimatePresence>
        {isEditing && (
          <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-night/55 backdrop-blur-sm" onClick={() => setIsEditing(false)} aria-label="Close" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-profile-title"
              initial={reduced ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: '100%' }}
              transition={{ duration: 0.55, ease: EASE }}
              className="relative w-full max-w-md h-full bg-sand overflow-y-auto shadow-2xl"
              data-lenis-prevent
            >
              <div className="sticky top-0 z-10 bg-sand/90 backdrop-blur border-b border-line px-6 sm:px-8 py-5 flex items-center justify-between">
                <div>
                  <p className="section-label">Profile</p>
                  <h2 id="edit-profile-title" className="font-display text-2xl text-ink mt-1">
                    Edit your details
                  </h2>
                </div>
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full hover:bg-stone text-ink flex items-center justify-center transition-colors" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="px-6 sm:px-8 py-7 space-y-6">
                {/* Live preview */}
                <div className="card p-5 flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-accent text-white flex items-center justify-center font-display text-3xl shrink-0 ring-1 ring-line">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    ) : (
                      (formData.name || user.name).charAt(0).toUpperCase()
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-night/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl text-ink truncate">{formData.name || user.name}</p>
                    <p className="text-sm text-muted italic line-clamp-2">{formData.bio || 'Your bio will appear here.'}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-name" className="field-label">
                    Full name *
                  </label>
                  <input id="profile-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="field" placeholder="Your name" />
                </div>

                {/* Profile photo uploader (exact SubmitPlace / EditPlace cover pattern) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="field-label !mb-0 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-accent" /> Profile photo
                    </p>
                    {formData.avatar_url && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Photo ready
                      </span>
                    )}
                  </div>
                  <p className="field-hint mb-3">Your avatar visible across SafarNamma and travel groups.</p>

                  {avatarUploadError && (
                    <div className="mb-3 p-3.5 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-xs text-[#8A1C12] flex items-center justify-between gap-2" role="alert">
                      <span>{avatarUploadError}</span>
                      <button type="button" onClick={() => setAvatarUploadError(null)} className="p-1 hover:text-[#B42318]" aria-label="Dismiss error">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {formData.avatar_url ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden border border-line bg-stone aspect-square max-w-[200px] mx-auto group shadow-md">
                        <img
                          src={formData.avatar_url}
                          alt="Profile photo preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-night/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                            className="btn-primary !py-2.5 !px-4 !text-xs flex items-center gap-1.5 w-full justify-center"
                            style={{ background: 'var(--color-sand)', color: 'var(--color-ink)' }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Replace
                          </button>
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={handleRemoveAvatar}
                            className="btn-primary !py-2.5 !px-4 !text-xs !bg-[#B42318] flex items-center gap-1.5 w-full justify-center"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                        <span className="absolute bottom-2.5 left-2.5 badge glass-dark !text-[10px] !py-0.5 !px-2">
                          <Check className="w-3 h-3" /> Photo
                        </span>
                      </div>

                      {/* Explicit buttons for mobile / touchscreen users */}
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={isUploadingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                          className="btn-ghost !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                        >
                          {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Replace photo
                        </button>
                        <button
                          type="button"
                          disabled={isUploadingAvatar}
                          onClick={handleRemoveAvatar}
                          className="btn-ghost !py-1.5 !px-3 !text-xs !text-[#B42318] hover:!bg-[#B42318]/10 flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-line-strong hover:border-ink hover:bg-paper rounded-2xl p-7 text-center transition-all flex flex-col items-center justify-center min-h-[160px] disabled:opacity-60 disabled:cursor-wait group"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="w-7 h-7 text-ink animate-spin mb-2" />
                          <p className="text-sm font-semibold text-ink">Uploading your photo…</p>
                          <p className="text-xs text-muted mt-1">Optimising it for fast loading</p>
                        </>
                      ) : (
                        <>
                          <span className="w-12 h-12 rounded-full bg-accent-soft text-accent-text flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <ImagePlus className="w-5 h-5" />
                          </span>
                          <p className="text-sm font-bold text-ink">Upload a profile photo</p>
                          <p className="text-xs text-muted mt-1">PNG, JPG or WEBP, up to 10 MB</p>
                        </>
                      )}
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    aria-label="Upload profile photo file"
                  />
                </div>

                <div>
                  <label htmlFor="profile-bio" className="field-label">
                    Travel bio
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="field resize-none"
                    placeholder="Weekend trekker, chai hunter, always chasing sunrises around Bengaluru…"
                  />
                </div>

                <div className="sticky bottom-0 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 bg-sand/95 backdrop-blur border-t border-line flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost" disabled={isSaving || isUploadingAvatar}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSaving || isUploadingAvatar}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </>
                    ) : isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading photo…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
