import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, ImagePlus, Loader2, Lock, Share2, Shuffle, X } from 'lucide-react';
import type { Group, Place } from '../types';
import { groupsApi, placesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { findGroupPlace, groupDestination, isStoryClosed, isStoryUnlocked, routeStops, storyUnlockTime, tripHiddenAt, TRIP_LISTED_HOURS } from '../utils/groups';
import { CAPTION_MOODS, moodForCategory, pickCaption, type CaptionMood } from '../utils/tripCaptions';
import { renderStory, STORY_SIZES, warmStoryFonts, type StoryFormat, type StoryTemplate } from '../utils/storyCanvas';
import { Chip } from '../components/ui/Chip';
import { cn } from '../utils/cn';

const PHOTOS_PER_STOP = 2;

const TEMPLATES: { key: StoryTemplate; label: string }[] = [
  { key: 'ticket', label: 'Ticket' },
  { key: 'film', label: 'Film strip' },
  { key: 'collage', label: 'Collage' },
];

type Photo = { bitmap: ImageBitmap; url: string };

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="card p-5 sm:p-6">
    <h2 className="font-display text-xl text-ink flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-full bg-ink text-sand text-sm font-bold flex items-center justify-center font-body">{n}</span>
      {title}
    </h2>
    {children}
  </section>
);

/* Turns a finished trip into an Instagram story or post: members add photos, we do the rest. */
export const TripStoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [place, setPlace] = useState<Place | undefined>();
  const [loading, setLoading] = useState(true);

  const [format, setFormat] = useState<StoryFormat>('story');
  const [template, setTemplate] = useState<StoryTemplate>('ticket');
  const [photos, setPhotos] = useState<Photo[][]>([]);
  const [mood, setMood] = useState<CaptionMood>('fun');
  const [turn, setTurn] = useState(0);
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    warmStoryFonts(); // start loading the fonts the image uses right away
    if (!id) return;
    (async () => {
      const [g, places] = await Promise.all([groupsApi.getGroupById(id, user?.email), placesApi.getPlaces().catch(() => [] as Place[])]);
      if (g) {
        setGroup(g);
        const p = findGroupPlace(g, places);
        setPlace(p);
        setMood(moodForCategory(p?.category));
      }
      setLoading(false);
    })();
  }, [id, user?.email]);

  const stops = useMemo(() => {
    if (!group) return [];
    const route = routeStops(group.custom_destination);
    return route.length ? route : [groupDestination(group, place)];
  }, [group, place]);

  useEffect(() => {
    setPhotos((prev) => stops.map((_, i) => prev[i] ?? []));
  }, [stops]);

  const ctx = useMemo(
    () => (group ? { place: stops[0] || 'here', stops, crew: Math.max(1, group.current_members), tripDate: new Date(group.trip_date) } : null),
    [group, stops]
  );

  // New caption whenever the mood changes or Shuffle is pressed
  useEffect(() => {
    if (!ctx || !group) return;
    const picked = pickCaption(mood, ctx, `${user?.email ?? 'guest'}:${group.id}`, turn);
    setHeadline(picked.headline);
    setCaption(picked.caption);
  }, [mood, turn, ctx, group, user?.email]);

  // Live preview, re-rendered shortly after any change
  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRendering(true);
      try {
        const blob = await renderStory({
          format,
          template,
          headline: headline || ' ',
          title: group.title,
          tripDate: new Date(group.trip_date),
          crew: Math.max(1, group.current_members),
          stops: stops.map((name, i) => ({ name, images: (photos[i] ?? []).map((p) => p.bitmap) })),
        });
        if (cancelled) return;
        blobRef.current = blob;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } catch (err) {
        if (!cancelled) setMessage(err instanceof Error ? err.message : 'Could not draw the preview.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [group, format, template, headline, photos, stops]);

  // Free thumbnails and bitmaps when leaving the page
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(
    () => () => {
      photosRef.current.flat().forEach((p) => {
        URL.revokeObjectURL(p.url);
        p.bitmap.close();
      });
    },
    []
  );

  const addPhotos = async (stopIndex: number, files: FileList | null) => {
    if (!files?.length) return;
    const room = PHOTOS_PER_STOP - (photos[stopIndex]?.length ?? 0);
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    try {
      const loaded = await Promise.all(
        picked.map(async (f) => ({ bitmap: await createImageBitmap(f, { imageOrientation: 'from-image' }), url: URL.createObjectURL(f) }))
      );
      setPhotos((prev) => prev.map((list, i) => (i === stopIndex ? [...list, ...loaded] : list)));
    } catch {
      setMessage('That photo couldn’t be opened. Try a JPG or PNG.');
    }
  };

  const removePhoto = (stopIndex: number, photoIndex: number) => {
    setPhotos((prev) =>
      prev.map((list, i) => {
        if (i !== stopIndex) return list;
        const gone = list[photoIndex];
        URL.revokeObjectURL(gone.url);
        gone.bitmap.close();
        return list.filter((_, j) => j !== photoIndex);
      })
    );
  };

  const photoCount = photos.reduce((n, list) => n + list.length, 0);
  const fileName = `safarnamma-${(group?.title || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${format}.jpg`;

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = fileName;
    a.click();
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      flash('Caption copied. Paste it on Instagram.');
    } catch {
      flash('Couldn’t copy. Select the caption and copy it yourself.');
    }
  };

  const share = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    const data = { files: [file], text: caption };
    try {
      if (navigator.canShare?.(data)) {
        // Copy first: Instagram ignores shared text, so the caption is ready to paste
        await navigator.clipboard.writeText(caption).catch(() => {});
        await navigator.share(data);
      } else {
        download();
        flash('Saved to your device. Open Instagram and add it from your gallery.');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') download();
    }
  };

  /* ── States before the maker ── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  const isHost = Boolean(user && group && user.email.toLowerCase() === group.organizer_email.toLowerCase());
  const isMember = isHost || group?.user_request_status === 'approved';

  if (!group || !isMember || !isStoryUnlocked(group)) {
    const opens = group ? storyUnlockTime(group) : null;
    const closed = group ? isStoryClosed(group) : false;
    return (
      <div className="max-w-xl mx-auto px-page py-24 text-center">
        <span className="w-14 h-14 rounded-full bg-stone flex items-center justify-center mx-auto mb-6">
          <Lock className="w-6 h-6 text-ink" />
        </span>
        <h1 className="font-display text-3xl text-ink mb-3">
          {!group ? 'Trip not found' : !isMember ? 'Only for this trip’s crew' : closed ? 'The story maker has closed' : 'Your story maker is almost ready'}
        </h1>
        <p className="text-muted mb-8">
          {!group
            ? 'This trip may have been removed.'
            : !isMember
              ? 'The host and approved members can make a story once the trip is done.'
              : closed
                ? `It stays open for ${TRIP_LISTED_HOURS} hours after a trip leaves. Plan the next one and don’t miss it this time.`
                : `It opens at ${opens!.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} on ${opens!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, once you’ve been out for a bit, and stays open for ${TRIP_LISTED_HOURS} hours after the start.`}
        </p>
        <Link to={group ? `/groups/${group.id}` : '/groups'} className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to the trip
        </Link>
      </div>
    );
  }

  const { w, h } = STORY_SIZES[format];

  return (
    <div className="max-w-7xl mx-auto w-full px-page pt-8 pb-24">
      <Link to={`/groups/${group.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to the trip
      </Link>
      <p className="section-label mb-3">Story maker</p>
      <h1 className="text-display text-ink mb-2" style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}>
        Make your <span className="accent-word">trip story.</span>
      </h1>
      <p className="text-muted mb-10 max-w-2xl">
        {group.title} · {stops.join(' → ')}. Add a photo or two for each place. We’ll do the rest.
        <span className="block text-sm mt-1.5">
          Open until {tripHiddenAt(group).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.
        </span>
      </p>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
        <div className="space-y-5">
          <Step n={1} title="Story or post?">
            <div className="flex flex-wrap gap-2">
              <Chip group="story-format" active={format === 'story'} onClick={() => setFormat('story')}>
                Story · 9:16
              </Chip>
              <Chip group="story-format" active={format === 'post'} onClick={() => setFormat('post')}>
                Post · 4:5
              </Chip>
            </div>
          </Step>

          <Step n={2} title="Add your photos">
            <div className="space-y-4">
              {stops.map((name, i) => (
                <div key={`${name}-${i}`} className="rounded-2xl border border-line bg-paper p-4">
                  <p className="font-semibold text-ink mb-3">
                    {stops.length > 1 && <span className="text-label text-muted mr-2">Stop {i + 1}</span>}
                    {name}
                  </p>
                  <div className="flex gap-3">
                    {(photos[i] ?? []).map((p, j) => (
                      <div key={p.url} className="relative w-24 h-24 rounded-xl overflow-hidden bg-stone">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i, j)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-night/70 text-white flex items-center justify-center"
                          aria-label="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(photos[i]?.length ?? 0) < PHOTOS_PER_STOP && (
                      <label className="w-24 h-24 rounded-xl border-2 border-dashed border-line-strong hover:border-ink flex flex-col items-center justify-center gap-1 text-muted hover:text-ink cursor-pointer transition-colors">
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-xs font-semibold">Add</span>
                        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(i, e.target.files); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="field-hint mt-3">Up to {PHOTOS_PER_STOP} photos per place. They stay on your phone; nothing is uploaded.</p>
          </Step>

          <Step n={3} title="Pick a look and a caption">
            <p className="field-label">Template</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {TEMPLATES.map((t) => (
                <Chip key={t.key} group="story-template" active={template === t.key} onClick={() => setTemplate(t.key)}>
                  {t.label}
                </Chip>
              ))}
            </div>

            <p className="field-label">Mood</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {CAPTION_MOODS.map((m) => (
                <Chip key={m.key} group="story-mood" active={mood === m.key} onClick={() => setMood(m.key)}>
                  {m.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="story-headline" className="field-label !mb-0">
                On the image
              </label>
              <button type="button" onClick={() => setTurn((t) => t + 1)} className="btn-ghost !py-2 !px-4 !text-xs">
                <Shuffle className="w-3.5 h-3.5" /> Shuffle
              </button>
            </div>
            <input id="story-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} className="field mb-4" />

            <label htmlFor="story-caption" className="field-label">
              Post caption
            </label>
            <textarea id="story-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="field resize-y leading-relaxed" />
          </Step>
        </div>

        {/* Preview + share */}
        <aside className="lg:sticky lg:top-28 space-y-4">
          <div className="card p-4">
            <div className="relative mx-auto rounded-2xl overflow-hidden bg-stone" style={{ aspectRatio: `${w} / ${h}`, maxHeight: '62vh' }}>
              {previewUrl && <img src={previewUrl} alt="Story preview" className="w-full h-full object-contain" />}
              {rendering && (
                <span className="absolute top-3 right-3 badge glass-dark">
                  <Loader2 className="w-3 h-3 animate-spin" /> Updating
                </span>
              )}
            </div>
            <p className="text-center text-xs text-muted mt-3">
              {w}×{h} · {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </p>
          </div>

          <button type="button" onClick={share} disabled={!previewUrl || photoCount === 0} className="btn-accent w-full !py-4 disabled:opacity-50">
            <Share2 className="w-4 h-4" /> Share to Instagram
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={download} disabled={!previewUrl || photoCount === 0} className="btn-ghost disabled:opacity-50">
              <Download className="w-4 h-4" /> Download
            </button>
            <button type="button" onClick={copyCaption} className="btn-ghost">
              <Copy className="w-4 h-4" /> Copy caption
            </button>
          </div>
          {photoCount === 0 && <p className="text-xs text-muted text-center">Add at least one photo to share.</p>}
          {message && (
            <p className={cn('text-sm text-center font-semibold flex items-center justify-center gap-1.5 text-sage-text')} role="status">
              <Check className="w-4 h-4" /> {message}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
