import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Search, Trash2, AlertCircle, Crown, Loader2, Download } from 'lucide-react';
import type { Group, GroupMember } from '../../types';
import { groupsApi } from '../../api/client';
import { setScrollLocked } from '../../hooks/useLenis';
import { downloadCrewCsv } from '../../utils/crewCsv';

interface CrewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  /** Called after someone is removed, with the trip as it now stands. */
  onChanged: (updatedGroup: Group) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const SEARCH_DELAY_MS = 250;

export const CrewListModal: React.FC<CrewListModalProps> = ({ isOpen, onClose, ...rest }) => {
  // Pause the page (and Lenis) behind the sheet, so the wheel only moves the list
  useEffect(() => {
    if (!isOpen) return;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [isOpen]);

  // The sheet mounts fresh on every open, so the list is always loaded from the database
  return createPortal(<AnimatePresence>{isOpen && <CrewListSheet onClose={onClose} {...rest} />}</AnimatePresence>, document.body);
};

const CrewListSheet = ({ onClose, group, onChanged }: Omit<CrewListModalProps, 'isOpen'>) => {
  const reduced = useReducedMotion();

  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // The one row showing the "are you sure" alert, if any
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const term = query.trim();

  // Search runs in the database: wait for a pause in typing, and drop answers to older queries
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(
      async () => {
        try {
          const found = await groupsApi.getMembers(group.id, term);
          if (stale) return;
          setMembers(found);
          setLoadError('');
        } catch (err) {
          if (stale) return;
          setLoadError((err instanceof Error && err.message) || 'Could not load the crew. Please try again.');
        } finally {
          if (!stale) setIsLoading(false);
        }
      },
      term ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [group.id, term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isRemoving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRemoving, onClose]);

  const askToRemove = (memberId: number | null) => {
    setConfirmingId(memberId);
    setRemoveError('');
  };

  const handleRemove = async (member: GroupMember) => {
    setIsRemoving(true);
    setRemoveError('');
    try {
      const updated = await groupsApi.removeMember(group.id, member.id);
      setMembers((list) => list.filter((m) => m.id !== member.id));
      setConfirmingId(null);
      onChanged(updated);
    } catch (err) {
      setRemoveError((err instanceof Error && err.message) || 'Could not remove this person. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // The file always holds the whole crew, so a search in progress is loaded again without its filter
  const handleDownload = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const everyone = term ? await groupsApi.getMembers(group.id) : members;
      downloadCrewCsv(group, everyone);
    } catch (err) {
      setExportError((err instanceof Error && err.message) || 'Could not download the crew list. Please try again.');
    } finally {
      setIsExporting(false);
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
      <button type="button" className="absolute inset-0 bg-night/60 backdrop-blur-sm cursor-default" onClick={() => !isRemoving && onClose()} aria-label="Close" tabIndex={-1} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crew-list-title"
        initial={reduced ? false : { y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={reduced ? undefined : { y: 40, scale: 0.98 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full sm:max-w-xl max-h-[94dvh] sm:max-h-[min(90dvh,760px)] flex flex-col bg-paper rounded-t-[28px] sm:rounded-[28px] border border-line shadow-[0_40px_90px_-30px_rgba(14,31,34,0.7)] overflow-hidden"
      >
        {/* Header */}
        <header className="shrink-0 px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-line bg-sand/70">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-label">Host tools</p>
              <h2 id="crew-list-title" className="text-display text-ink mt-3 text-[1.9rem] sm:text-[2.35rem]">
                Your <span className="accent-word">crew.</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isRemoving}
              className="w-10 h-10 -mr-1 rounded-full border border-line-strong text-ink flex items-center justify-center shrink-0 hover:bg-stone hover:border-ink transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-xs text-muted truncate min-w-0">
              {group.current_members} of {group.max_members} going · {group.title}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || isExporting || isRemoving || !!loadError}
              className="btn-ghost !py-2 !px-3.5 !text-xs shrink-0 disabled:opacity-50"
              aria-label="Download the crew list as a CSV file"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download CSV
            </button>
          </div>
          {exportError && (
            <p className="text-xs font-semibold text-[#8A1C12] mt-2" role="alert">
              {exportError}
            </p>
          )}

          <div className="relative mt-4">
            <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              aria-label="Search the crew by name or email"
              className="field !pl-11"
            />
          </div>
        </header>

        {/* Scrolling body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6" data-lenis-prevent>
          {loadError ? (
            <div className="rounded-2xl bg-[#FDF3F1] border border-[#F2C9C2] p-4 flex gap-3 text-sm text-[#8A1C12]" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loadError}</span>
            </div>
          ) : isLoading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="skeleton h-[4.5rem] w-full rounded-2xl" />
              <div className="skeleton h-[4.5rem] w-full rounded-2xl" />
              <div className="skeleton h-[4.5rem] w-full rounded-2xl" />
            </div>
          ) : (
            <ul className="space-y-3">
              {/* The host is on the trip too, but isn't a roster row and can't be removed */}
              {!term && (
                <li className="flex items-center gap-3 p-4 rounded-2xl bg-accent-soft/60 border border-accent/20">
                  <span className="w-10 h-10 rounded-full bg-paper text-accent-text flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{group.organizer_name} · You</p>
                    <p className="text-xs text-muted truncate">Host</p>
                  </div>
                </li>
              )}

              {members.map((member) =>
                confirmingId === member.id ? (
                  <li key={member.id} className="p-4 rounded-2xl bg-[#FDF3F1] border border-[#F2C9C2] text-[#8A1C12]" role="alert">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">Remove {member.user_name} from this trip?</p>
                        <p className="text-xs leading-relaxed mt-1 opacity-90">
                          They've already joined. They'll lose the chat link here and their seat reopens. You'll need to remove them from the group chat yourself.
                        </p>
                        {removeError && <p className="text-xs font-semibold mt-2">{removeError}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button type="button" onClick={() => askToRemove(null)} disabled={isRemoving} className="btn-ghost !py-2 !px-4 !text-xs">
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={isRemoving}
                        className="btn-primary !py-2 !px-4 !text-xs !bg-[#B42318] !border-[#B42318] hover:!bg-[#8A1C12] hover:!border-[#8A1C12] !text-white"
                      >
                        {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {isRemoving ? 'Removing…' : 'Yes, remove'}
                      </button>
                    </div>
                  </li>
                ) : (
                  <li key={member.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-sand border border-line">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-full bg-sage-soft text-sage-text font-bold flex items-center justify-center shrink-0">{member.user_name?.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{member.user_name}</p>
                        <p className="text-xs text-muted truncate">{member.user_email}</p>
                        <p className="text-[11px] text-muted mt-0.5">Joined {new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => askToRemove(member.id)}
                      disabled={isRemoving}
                      className="btn-ghost !py-2 !px-3.5 !text-xs shrink-0 hover:!text-[#B42318] hover:!border-[#B42318]/40"
                      aria-label={`Remove ${member.user_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </li>
                ),
              )}

              {members.length === 0 && (
                <li className="rounded-2xl bg-sand border border-line p-8 text-center text-sm text-muted">
                  {term ? `No one matches “${term}”.` : "No one has been approved yet. People you approve will show up here."}
                </li>
              )}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
