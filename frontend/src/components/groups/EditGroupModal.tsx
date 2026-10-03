import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, MapPin, MessageCircle, ShieldAlert, Lock, Plus, Trash2, AlertCircle, Check, Clock, Loader2 } from 'lucide-react';
import type { Group } from '../../types';
import { groupsApi } from '../../api/client';
import { isTripEditable, editWindowLabel, routeStops, isMultiRoute } from '../../utils/groups';
import { setScrollLocked } from '../../hooks/useLenis';
import { cn } from '../../utils/cn';
import { TripDateTimePicker } from './TripDateTimePicker';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  destinationName?: string;
  onUpdated: (updatedGroup: Group) => void;
}

const CHAT_LINK_REGEX = /^https?:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+|t\.me\/[A-Za-z0-9_+-]+|telegram\.me\/[A-Za-z0-9_+-]+)/i;
const EASE = [0.22, 1, 0.36, 1] as const;
/** A trip is 2–8 people including the host; same limits as the backend. */
const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 8;
const MAX_STOPS = 5;

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO date → the `YYYY-MM-DDTHH:mm` local string TripDateTimePicker works with. */
const toPickerValue = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** One numbered block of the form: mono index, serif heading, optional hint. */
const Section = ({ index, title, hint, children }: { index: string; title: string; hint?: string; children: React.ReactNode }) => (
  <section className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)] gap-x-8 gap-y-4 py-7 first:pt-0 last:pb-0">
    <div>
      <p className="font-mono text-[0.68rem] tracking-[0.18em] text-accent-text">{index}</p>
      <h3 className="font-display text-xl text-ink mt-1.5">{title}</h3>
      {hint && <p className="text-xs text-muted leading-relaxed mt-1.5">{hint}</p>}
    </div>
    <div className="min-w-0 space-y-5">{children}</div>
  </section>
);

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, ...rest }) => {
  // Pause the page (and Lenis) behind the sheet, so the wheel only moves the form
  useEffect(() => {
    if (!isOpen) return;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [isOpen]);

  // The sheet mounts fresh on every open, so the form always starts from the saved trip
  return createPortal(<AnimatePresence>{isOpen && <EditGroupSheet onClose={onClose} {...rest} />}</AnimatePresence>, document.body);
};

const EditGroupSheet = ({ onClose, group, destinationName, onUpdated }: Omit<EditGroupModalProps, 'isOpen'>) => {
  const reduced = useReducedMotion();
  const isMulti = isMultiRoute(group);
  const editable = isTripEditable(group);

  const initialDate = toPickerValue(group.trip_date);
  const initialStops = routeStops(group.custom_destination);

  const [title, setTitle] = useState(group.title || '');
  const [description, setDescription] = useState(group.description || '');
  const [meetingArea, setMeetingArea] = useState(group.meeting_area || '');
  const [chatLink, setChatLink] = useState(group.chat_link || '');
  const [maxMembers, setMaxMembers] = useState(group.max_members || 6);
  const [safetyNotes, setSafetyNotes] = useState(group.safety_notes || '');
  const [tripDate, setTripDate] = useState(initialDate);
  const [stops, setStops] = useState<string[]>(initialStops.length >= 2 ? initialStops : ['', '']);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Seats the host can still open: whatever is left under the cap once the people already in are counted
  const minOpen = Math.max(0, MIN_GROUP_SIZE - group.current_members);
  const maxOpen = Math.max(minOpen, MAX_GROUP_SIZE - group.current_members);
  const openSeatOptions = Array.from({ length: maxOpen - minOpen + 1 }, (_, i) => minOpen + i);

  const busy = isSaving || saved;
  const isDirty =
    title !== (group.title || '') ||
    description !== (group.description || '') ||
    meetingArea !== (group.meeting_area || '') ||
    chatLink !== (group.chat_link || '') ||
    maxMembers !== (group.max_members || 6) ||
    safetyNotes !== (group.safety_notes || '') ||
    tripDate !== initialDate ||
    (isMulti && stops.map((s) => s.trim()).filter(Boolean).join('|') !== initialStops.join('|'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const handleStopChange = (index: number, value: string) => setStops(stops.map((s, i) => (i === index ? value : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!editable) {
      setErrorMessage('Editing is closed: trips cannot be changed within 12 hours of departure.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Give the trip a title.');
      return;
    }
    if (!meetingArea.trim()) {
      setErrorMessage('Add a meeting point so people know where to find you.');
      return;
    }
    if (!chatLink.trim() || !CHAT_LINK_REGEX.test(chatLink.trim())) {
      setErrorMessage('Add a valid WhatsApp (chat.whatsapp.com) or Telegram (t.me) invite link.');
      return;
    }
    if (maxMembers < group.current_members) {
      setErrorMessage(`${group.current_members} people have already joined, so the group can't be smaller than that.`);
      return;
    }
    if (!tripDate) {
      setErrorMessage('Pick both a day and a time for departure.');
      return;
    }
    if (new Date(tripDate).getTime() < Date.now() + 12 * 3600 * 1000) {
      setErrorMessage('Departure has to be at least 12 hours from now.');
      return;
    }

    const validStops = stops.map((s) => s.trim()).filter(Boolean);
    if (isMulti && validStops.length < 2) {
      setErrorMessage('A route needs at least 2 stops.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Group> = {
        title: title.trim(),
        description: description.trim(),
        meeting_area: meetingArea.trim(),
        chat_link: chatLink.trim(),
        max_members: Number(maxMembers),
        safety_notes: safetyNotes.trim(),
        trip_date: new Date(tripDate).toISOString(),
      };
      if (isMulti) payload.custom_destination = validStops.join(' ➔ ');

      const updated = await groupsApi.updateGroup(group.id, payload);
      setSaved(true);
      setTimeout(() => {
        onUpdated(updated);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage((err instanceof Error && err.message) || 'Could not save your changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button type="button" className="absolute inset-0 bg-night/60 backdrop-blur-sm cursor-default" onClick={() => !busy && onClose()} aria-label="Close" tabIndex={-1} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trip-title"
        initial={reduced ? false : { y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={reduced ? undefined : { y: 40, scale: 0.98 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full sm:max-w-3xl max-h-[94dvh] sm:max-h-[min(90dvh,860px)] flex flex-col bg-paper rounded-t-[28px] sm:rounded-[28px] border border-line shadow-[0_40px_90px_-30px_rgba(14,31,34,0.7)] overflow-hidden"
      >
        {/* Header */}
        <header className="shrink-0 px-6 sm:px-9 pt-6 sm:pt-8 pb-5 border-b border-line bg-sand/70">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-label">Host tools</p>
              <h2 id="edit-trip-title" className="text-display text-ink mt-3 text-[1.9rem] sm:text-[2.35rem]">
                Fine-tune <span className="accent-word">your trip.</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-10 h-10 -mr-1 rounded-full border border-line-strong text-ink flex items-center justify-center shrink-0 hover:bg-stone hover:border-ink transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className={cn('badge', editable ? 'badge-amber' : 'badge-danger')}>
              {editable ? <Clock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {editWindowLabel(group)}
            </span>
            <span className="text-xs text-muted truncate">{group.title}</span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          {/* Scrolling body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-9 py-7" data-lenis-prevent>
            {!editable && (
              <div className="mb-7 rounded-2xl bg-[#FDF3F1] border border-[#F2C9C2] p-4 flex gap-3 text-[#8A1C12]" role="status">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">This trip is locked.</p>
                  <p className="text-xs opacity-90 leading-relaxed mt-0.5">Trips can't be changed within 12 hours of departure, so everyone who joined can plan around it.</p>
                </div>
              </div>
            )}

            <fieldset disabled={!editable || busy} className="divide-y divide-line min-w-0 disabled:opacity-70">
              {/* Destination / route */}
              <Section
                index="01"
                title={isMulti ? 'The route' : 'Destination'}
                hint={isMulti ? `Reorder by retyping. Up to ${MAX_STOPS} stops.` : 'Fixed, because people joined for this place.'}
              >
                {isMulti ? (
                  <div>
                    <ol className="relative space-y-2.5">
                      <span className="absolute left-[15px] top-5 bottom-5 border-l-2 border-dashed border-line-strong" aria-hidden />
                      {stops.map((stop, idx) => (
                        <li key={idx} className="relative flex items-center gap-3">
                          <span
                            className={cn(
                              'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              idx === stops.length - 1 ? 'bg-accent text-white' : 'bg-ink text-sand',
                            )}
                          >
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={stop}
                            onChange={(e) => handleStopChange(idx, e.target.value)}
                            placeholder={idx === 0 ? 'First stop, e.g. Nandi Hills' : `Stop ${idx + 1}`}
                            aria-label={`Stop ${idx + 1}`}
                            className="field !py-2.5"
                          />
                          {stops.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setStops(stops.filter((_, i) => i !== idx))}
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-muted hover:text-[#B42318] hover:bg-[#F8DEDA]/60 transition-colors"
                              aria-label={`Remove stop ${idx + 1}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ol>
                    {stops.length < MAX_STOPS && (
                      <button
                        type="button"
                        onClick={() => setStops([...stops, ''])}
                        className="mt-3 ml-11 inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:text-ink transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add a stop
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-sand border border-line px-4 py-3.5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-paper border border-line text-accent-text flex items-center justify-center shrink-0">
                      <MapPin className="w-4.5 h-4.5" />
                    </span>
                    <p className="font-display text-lg text-ink leading-snug min-w-0 flex-1 truncate">{group.custom_destination || destinationName || 'Registered destination'}</p>
                    <Lock className="w-4 h-4 text-faint shrink-0" aria-label="Locked" />
                  </div>
                )}
              </Section>

              {/* Title & plan */}
              <Section index="02" title="The pitch" hint="What people read before they ask to join.">
                <div>
                  <label htmlFor="edit-trip-name" className="field-label">
                    Trip title
                  </label>
                  <input
                    id="edit-trip-name"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sunrise breakfast at Rameshwaram"
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="edit-trip-plan" className="field-label">
                    The plan <span className="font-medium text-muted">· optional</span>
                  </label>
                  <textarea
                    id="edit-trip-plan"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="The vibe, what you'll do, who should come along…"
                    className="field resize-none leading-relaxed"
                  />
                </div>
              </Section>

              {/* When */}
              <Section index="03" title="Departure" hint="At least 12 hours from now.">
                {editable ? (
                  <TripDateTimePicker value={tripDate} onChange={setTripDate} />
                ) : (
                  <p className="font-display text-lg text-ink">
                    {new Date(group.trip_date).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </Section>

              {/* Meetup & seats */}
              <Section index="04" title="The crew" hint="Where you gather, and how many can come.">
                <div>
                  <label htmlFor="edit-trip-meet" className="field-label">
                    Meeting point
                  </label>
                  <input
                    id="edit-trip-meet"
                    type="text"
                    value={meetingArea}
                    onChange={(e) => setMeetingArea(e.target.value)}
                    placeholder="e.g. Main gate, metro station…"
                    className="field"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="field-label !mb-0">Open seats</p>
                    <p className="field-hint">
                      {group.current_members} joined · {maxMembers} of {MAX_GROUP_SIZE} max
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Open seats">
                    {openSeatOptions.map((open) => {
                      const active = group.current_members + open === maxMembers;
                      return (
                        <button
                          key={open}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`${open} open ${open === 1 ? 'seat' : 'seats'}`}
                          onClick={() => setMaxMembers(group.current_members + open)}
                          className={cn(
                            'w-11 h-11 rounded-xl border font-display text-lg tabular-nums transition-colors',
                            active ? 'bg-ink text-sand border-ink' : 'bg-paper border-line-strong text-body enabled:hover:border-ink enabled:hover:text-ink',
                          )}
                        >
                          {open}
                        </button>
                      );
                    })}
                  </div>
                  <p className="field-hint mt-2">
                    {maxMembers - group.current_members > 0
                      ? `${maxMembers - group.current_members} more ${maxMembers - group.current_members === 1 ? 'person' : 'people'} can join, for a group of ${maxMembers}.`
                      : 'No more seats: the group is closed to new requests.'}
                  </p>
                </div>
              </Section>

              {/* Chat & safety */}
              <Section index="05" title="Good to know" hint="Shared only with people you approve.">
                <div>
                  <label htmlFor="edit-trip-chat" className="field-label !flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-muted" /> Group chat link
                  </label>
                  <input
                    id="edit-trip-chat"
                    type="url"
                    value={chatLink}
                    onChange={(e) => setChatLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/…  or  https://t.me/…"
                    className="field"
                  />
                  <p className="field-hint mt-2 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 shrink-0" /> WhatsApp or Telegram. Hidden until you approve someone.
                  </p>
                </div>
                <div>
                  <label htmlFor="edit-trip-safety" className="field-label !flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-muted" /> Safety & gear <span className="font-medium text-muted">· optional</span>
                  </label>
                  <textarea
                    id="edit-trip-safety"
                    rows={2}
                    value={safetyNotes}
                    onChange={(e) => setSafetyNotes(e.target.value)}
                    placeholder="e.g. Helmets mandatory, comfortable shoes, rain cover…"
                    className="field resize-none leading-relaxed"
                  />
                </div>
              </Section>
            </fieldset>
          </div>

          {/* Footer: always in view, so errors and Save never scroll away */}
          <footer className="shrink-0 border-t border-line bg-sand/70 px-6 sm:px-9 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {errorMessage && (
              <div className="mb-3 px-4 py-3 rounded-2xl bg-[#FDF3F1] border border-[#F2C9C2] text-sm text-[#8A1C12] flex items-start gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="hidden sm:flex items-center gap-2 text-xs text-muted" aria-live="polite">
                {editable && (
                  <>
                    <span className={cn('w-1.5 h-1.5 rounded-full', isDirty ? 'bg-accent' : 'bg-faint')} />
                    {isDirty ? 'Unsaved changes' : 'No changes yet'}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button type="button" onClick={onClose} disabled={busy} className="btn-ghost flex-1 sm:flex-none disabled:opacity-50">
                  {editable ? 'Cancel' : 'Close'}
                </button>
                {editable && (
                  <button type="submit" disabled={busy || !isDirty} className={cn('btn-primary flex-1 sm:flex-none sm:min-w-[10.5rem]', saved && '!bg-[#2F7D5B] !opacity-100')}>
                    {saved ? (
                      <>
                        <Check className="w-4 h-4" /> Saved
                      </>
                    ) : isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                )}
              </div>
            </div>
          </footer>
        </form>
      </motion.div>
    </motion.div>
  );
};
