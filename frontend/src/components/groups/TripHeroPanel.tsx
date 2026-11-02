import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle, Clock, Crown, Edit3, ExternalLink, Lock, MessageCircle, PartyPopper, Send, UserCheck, Users, XCircle } from 'lucide-react';
import type { Group } from '../../types';
import { editWindowLabel, isPastTrip, isTripEditable, seatsLeft } from '../../utils/groups';
import { ShareTrip } from './ShareTrip';
import { cn } from '../../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

/* ─── The one next step for a visitor ───
   Request to join → waiting → you're in (chat link) or declined. Shared by the hero panel,
   the sidebar ticket and the phone bar so all three always agree. Each state cross-fades
   into the next, so sending a request visibly turns the button into its answer. */

interface PrimaryActionProps {
  group: Group;
  isApprovedMember: boolean;
  status: RequestStatus;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onRequest: () => void;
  /** hero: on the dark photo band · card: the sidebar ticket · bar: the phone's bottom bar */
  variant: 'hero' | 'card' | 'bar';
}

const chatStyle = (link?: string | null) => {
  const whatsApp = link?.includes('whatsapp.com') || link?.includes('wa.me');
  const telegram = link?.includes('t.me') || link?.includes('telegram.me');
  return {
    label: whatsApp ? 'Join WhatsApp group' : telegram ? 'Join Telegram chat' : 'Open group chat',
    className: whatsApp ? '!bg-[#1EA952] hover:!bg-[#178C44] !text-white' : telegram ? '!bg-[#0088cc] hover:!bg-[#0077b5] !text-white' : '',
  };
};

export const TripPrimaryAction = ({ group, isApprovedMember, status, isAuthenticated, isSubmitting, onRequest, variant }: PrimaryActionProps) => {
  const reduced = useReducedMotion();
  const past = isPastTrip(group);
  const canRequest = group.status === 'open' && !past && seatsLeft(group) > 0;
  const onDark = variant === 'hero';
  const bar = variant === 'bar';
  const card = variant === 'card';
  const state = isApprovedMember ? 'approved' : status;

  const pill = (tone: 'wait' | 'ok' | 'no') =>
    cn(
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
      bar ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
      card && 'w-full rounded-2xl py-3.5',
      tone === 'wait' && (onDark ? 'bg-[#F4B08A]/15 text-[#FBD9C3] border border-[#F4B08A]/35' : 'bg-accent-soft/80 text-accent-text'),
      tone === 'ok' && (onDark ? 'bg-[#2F7D5B]/30 text-[#BFE8D1] border border-[#5FBF8F]/35' : 'bg-[#DDEEE4] text-[#1F5C42]'),
      tone === 'no' && (onDark ? 'bg-[#B42318]/20 text-[#F8C9C2] border border-[#F28B82]/30' : 'bg-[#FDF3F1] border border-[#F2C9C2] text-[#8A1C12]')
    );

  let content: ReactNode;
  if (state === 'approved') {
    const chat = chatStyle(group.chat_link);
    content = (
      <div className={cn('flex gap-2.5', card ? 'flex-col' : 'flex-wrap items-center')}>
        {!bar && (
          <span className={pill('ok')}>
            <PartyPopper className="w-4 h-4" /> You're in!
          </span>
        )}
        {group.chat_link ? (
          <motion.a whileTap={reduced ? undefined : { scale: 0.97 }} href={group.chat_link} target="_blank" rel="noopener noreferrer" className={cn('btn-primary', card && 'w-full', chat.className)}>
            <MessageCircle className="w-4 h-4" /> {bar ? 'Open chat' : chat.label} {!bar && <ExternalLink className="w-3.5 h-3.5" />}
          </motion.a>
        ) : bar ? (
          <span className="badge badge-success">You're in</span>
        ) : (
          <p className={cn('text-xs leading-relaxed', onDark ? 'text-sand/65' : 'text-muted text-center')}>The host hasn't added a chat link yet. Check back soon.</p>
        )}
      </div>
    );
  } else if (state === 'pending') {
    content = (
      <span className={cn(pill('wait'), 'relative')} role="status">
        {/* A single ring pulses out as the request lands */}
        {!reduced && (
          <motion.span
            className="absolute inset-0 rounded-[inherit] border-2 border-[#F4B08A]"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.9, ease: EASE }}
            aria-hidden
          />
        )}
        <Clock className="w-4 h-4 animate-pulse" /> {bar ? 'Request sent' : 'Request sent · waiting for the host'}
      </span>
    );
  } else if (state === 'rejected') {
    content = (
      <div className={cn('flex gap-2.5', card ? 'flex-col' : 'flex-wrap items-center')}>
        {!bar && (
          <span className={pill('no')}>
            <XCircle className="w-4 h-4" /> Request declined
          </span>
        )}
        <Link to="/groups" className={cn('btn-ghost', card && 'w-full', bar && 'shrink-0')}>
          {bar ? 'Other trips' : 'Browse other trips'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  } else {
    const label = isSubmitting
      ? bar
        ? 'Sending…'
        : 'Sending request…'
      : past
        ? 'This trip has ended'
        : !canRequest
          ? 'Group is full'
          : isAuthenticated
            ? 'Request to join'
            : 'Sign in to join';
    content = (
      <motion.button
        whileTap={reduced || !canRequest ? undefined : { scale: 0.97 }}
        onClick={onRequest}
        disabled={!canRequest || isSubmitting}
        className={cn('btn-accent', card && 'w-full !py-4', onDark && 'shadow-[0_14px_30px_-12px_rgba(224,86,31,0.8)]')}
      >
        {isAuthenticated || !canRequest ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        {label}
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={state}
        className={cn(card && 'w-full', bar && 'shrink-0')}
        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
};

/* ─── Seats at a glance ───
   One dot per seat, lighting up in turn. Long trips (more than 16 seats) get a bar instead. */
const SeatStrip = ({ group }: { group: Group }) => {
  const reduced = useReducedMotion();
  const past = isPastTrip(group);
  const left = seatsLeft(group);
  const joined = Math.min(group.current_members, group.max_members);
  const tone = past ? 'bg-sand/50' : left === 0 ? 'bg-[#F28B82]' : left === 1 ? 'bg-[#FFC15E]' : 'bg-[#F4B08A]';
  const summary = past ? 'Trip has ended' : left === 0 ? 'Every seat is taken' : left === 1 ? 'Last seat open!' : `${left} seats open`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="text-sm text-sand/80">
          <span className="font-display text-2xl text-sand tabular-nums mr-1">{joined}</span>of {group.max_members} going
        </p>
        <p className={cn('text-xs font-bold uppercase tracking-[0.12em]', left === 1 && !past ? 'text-[#FFC15E]' : left === 0 && !past ? 'text-[#F8C9C2]' : 'text-sand/60')}>{summary}</p>
      </div>
      {group.max_members <= 16 ? (
        <div className="flex gap-1.5" role="img" aria-label={`${joined} of ${group.max_members} seats taken`}>
          {Array.from({ length: group.max_members }, (_, i) => (
            <motion.span
              key={i}
              className={cn('h-2.5 flex-1 rounded-full', i < joined ? tone : 'bg-white/15')}
              initial={reduced ? false : { opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.7 + i * 0.05 }}
            />
          ))}
        </div>
      ) : (
        <div className="h-2.5 rounded-full bg-white/15 overflow-hidden" role="img" aria-label={`${joined} of ${group.max_members} seats taken`}>
          <motion.div
            className={cn('h-full rounded-full origin-left', tone)}
            style={{ width: `${(joined / Math.max(1, group.max_members)) * 100}%` }}
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.7 }}
          />
        </div>
      )}
    </div>
  );
};

const tile =
  'relative flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.15] border border-white/10 hover:border-white/25 px-2 py-3 text-xs font-semibold text-sand transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#F4B08A]/70';

interface TripHeroPanelProps {
  group: Group;
  destination: string;
  isOrganizer: boolean;
  pendingCount: number;
  onOpenRequests: () => void;
  onOpenCrew: () => void;
  onEdit: () => void;
  /** The visitor's next step (TripPrimaryAction), shown when this isn't the host. */
  primary: ReactNode;
}

/* ─── The hero's action panel ───
   Pulls what used to sit below the fold up next to the title: how full the trip is,
   the visitor's next step, and for the host one-tap tools for requests, crew, edit and chat. */
export const TripHeroPanel = ({ group, destination, isOrganizer, pendingCount, onOpenRequests, onOpenCrew, onEdit, primary }: TripHeroPanelProps) => {
  const reduced = useReducedMotion();
  const past = isPastTrip(group);
  const editable = isTripEditable(group);
  const tap = reduced ? undefined : { scale: 0.96 };

  return (
    <div className="glass-dark w-full max-w-[540px] rounded-[26px] p-4 sm:p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
      {isOrganizer && (
        <p className="flex items-center gap-1.5 text-label !text-[#F4B08A] mb-3">
          <Crown className="w-3.5 h-3.5" /> You're hosting this trip
        </p>
      )}
      <SeatStrip group={group} />

      <div className="mt-4 pt-4 border-t border-white/10">
        {isOrganizer ? (
          <div className={cn('grid gap-2', group.chat_link ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-4')}>
            <motion.button whileTap={tap} onClick={onOpenRequests} className={tile}>
              <UserCheck className="w-4 h-4 text-[#F4B08A]" /> Requests
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" aria-hidden />
                  <span className="relative">{pendingCount}</span>
                </span>
              )}
            </motion.button>
            <motion.button whileTap={tap} onClick={onOpenCrew} className={tile}>
              <Users className="w-4 h-4 text-[#F4B08A]" /> Crew
            </motion.button>
            <motion.button whileTap={tap} onClick={onEdit} title={editWindowLabel(group)} className={cn(tile, !editable && 'opacity-50')} aria-disabled={!editable}>
              <Edit3 className="w-4 h-4 text-[#F4B08A]" /> Edit
            </motion.button>
            {group.chat_link && (
              <motion.a whileTap={tap} href={group.chat_link} target="_blank" rel="noopener noreferrer" className={tile}>
                <MessageCircle className="w-4 h-4 text-[#F4B08A]" /> Chat
              </motion.a>
            )}
            {!past ? <ShareTrip group={group} destination={destination} className={tile} /> : <span className={cn(tile, 'opacity-40')}><CheckCircle className="w-4 h-4" /> Done</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            {primary}
            {!past && <ShareTrip group={group} destination={destination} />}
          </div>
        )}
      </div>
    </div>
  );
};
