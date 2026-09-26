import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  CalendarDays,
  Users,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  MessageCircle,
  ExternalLink,
  Clock,
  UserCheck,
  XCircle,
  Send,
  Trash2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Crown,
  Lock,
  PartyPopper,
  Route,
} from 'lucide-react';
import type { Group, GroupRequest, Place } from '../types';
import { groupsApi, placesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DetailHero, FactsCard } from '../components/detail/DetailHero';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal, RevealItem } from '../components/motion/Reveal';
import { PlaceCard } from '../components/places/PlaceCard';
import { fallbackPhoto } from '../utils/images';
import { groupDestination, isPastTrip, isStoryUnlocked, routeStops, seatsLeft, storyUnlockTime } from '../utils/groups';
import { cn } from '../utils/cn';

export const GroupDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Requester status ('none' | 'pending' | 'approved' | 'rejected')
  const [myRequestStatus, setMyRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchDetails = async () => {
    if (!id) return;
    try {
      // Pass logged-in user email so backend reveals chat_link ONLY if authorized
      const groupData = await groupsApi.getGroupById(id, user?.email);
      if (groupData) {
        setGroup(groupData);

        // Fetch corresponding place info
        const destId = groupData.destination_id || (groupData as any).place_id;
        if (destId) {
          const placeData = await placesApi.getPlaceById(destId.toString());
          if (placeData) setPlace(placeData);
        }

        // Check if current user is organizer
        const isOrganizer = user && user.email.toLowerCase() === groupData.organizer_email.toLowerCase();

        if (isOrganizer) {
          // Load requests for organizer to review
          const reqs = await groupsApi.getRequests(Number(id), user.email);
          setRequests(reqs);
        } else if (user) {
          if (groupData.user_request_status) {
            setMyRequestStatus(groupData.user_request_status as any);
          } else if (groupData.chat_link) {
            setMyRequestStatus('approved');
          } else {
            setMyRequestStatus('none');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching group details', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Handle Request to Join
  const handleRequestToJoin = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (!group) return;

    setIsSubmittingRequest(true);
    setActionMessage('');
    try {
      await groupsApi.requestToJoin(Number(group.id), user.name, user.email);
      setMyRequestStatus('pending');
      setActionMessage('Request sent. The host will review it soon.');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rejected')) {
        setMyRequestStatus('rejected');
      } else if (msg.toLowerCase().includes('pending')) {
        setMyRequestStatus('pending');
      } else {
        alert(msg || 'Failed to send request.');
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Organizer approves or rejects a request
  const handleUpdateRequestStatus = async (requestId: number, newStatus: 'approved' | 'rejected') => {
    if (!user || !group) return;
    try {
      const success = await groupsApi.updateRequestStatus(requestId, newStatus, user.email);
      if (success) {
        // Re-fetch requests and group to refresh member count and status
        await fetchDetails();
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Organizer cancels & deletes the travel group
  const handleDeleteGroup = async () => {
    if (!user || !group) return;
    setDeleteError('');

    const confirmed = window.confirm('Are you sure you want to cancel and delete this group trip? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await groupsApi.deleteGroup(Number(group.id), user.email);
      navigate('/groups');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete group.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-sand min-h-screen">
        <div className="bg-night h-[600px]" />
        <div className="max-w-7xl mx-auto px-page -mt-24 space-y-8">
          <div className="skeleton h-28 w-full rounded-[28px]" />
          <div className="grid lg:grid-cols-[1fr_380px] gap-14">
            <div className="space-y-4">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-3/4" />
            </div>
            <div className="skeleton h-80 rounded-[26px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="w-full bg-sand min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24">
        <p className="section-label">Trip not found</p>
        <h1 className="text-display text-ink mt-5 mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
          This trip has <span className="accent-word">left the station.</span>
        </h1>
        <p className="text-muted mb-10 max-w-md">It may have been cancelled or removed. There are more trips waiting to be joined.</p>
        <Link to="/groups" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to all trips
        </Link>
      </div>
    );
  }

  const isOrganizer = user && user.email.toLowerCase() === group.organizer_email.toLowerCase();
  const isApprovedMember = !isOrganizer && (myRequestStatus === 'approved' || Boolean(group.chat_link));
  const isWhatsApp = group.chat_link?.includes('whatsapp.com') || group.chat_link?.includes('wa.me');
  const isTelegram = group.chat_link?.includes('t.me') || group.chat_link?.includes('telegram.me');

  const date = new Date(group.trip_date);
  const left = seatsLeft(group);
  const past = isPastTrip(group);
  const storyReady = isStoryUnlocked(group);
  const isSameDay = (d: Date) => d.toDateString() === new Date().toDateString();
  const fill = Math.min(100, Math.round((group.current_members / Math.max(1, group.max_members)) * 100));
  const destination = groupDestination(group, place ?? undefined);
  const stops = routeStops(group.custom_destination);
  const fallback = fallbackPhoto(String(group.id) + destination);
  const photos = [place?.image_url, ...(place?.gallery_images ?? [])].filter((p): p is string => Boolean(p));
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const facts = [
    { icon: CalendarDays, label: 'When', value: date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) },
    { icon: MapPin, label: 'Meet at', value: group.meeting_area },
    { icon: Users, label: 'Group', value: `${group.current_members} of ${group.max_members} going` },
  ];

  const statusBadge = past ? (
    <span className="badge glass-dark">Completed</span>
  ) : group.status === 'open' && left > 0 ? (
    <span className="badge bg-[#2F7D5B] text-white">Recruiting · {left} {left === 1 ? 'seat' : 'seats'} left</span>
  ) : (
    <span className="badge badge-danger">Group full</span>
  );

  return (
    <div className="w-full bg-sand min-h-screen">
      {/* ── Hero ── */}
      <DetailHero
        photos={photos}
        fallback={fallback}
        eyebrow={
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/groups" className="inline-flex items-center gap-1.5 text-label text-sand/70 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> All trips
            </Link>
            {statusBadge}
          </div>
        }
        title={<SplitHeading as="h1" onMount delay={0.1} className="text-display text-sand" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.75rem)' }} parts={[{ text: group.title }]} />}
        meta={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#D8DEDA]">
            <span className="flex items-center gap-2">
              {stops.length ? <Route className="w-4 h-4 text-[#F4B08A]" /> : <MapPin className="w-4 h-4 text-[#F4B08A]" />}
              {place && !stops.length ? (
                <Link to={`/places/${place.id}`} className="text-sand font-semibold hover:underline underline-offset-4">
                  {destination}
                </Link>
              ) : (
                <span className="text-sand font-semibold">{stops.length ? `${stops.length}-stop route` : destination}</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#F4B08A] text-night text-xs font-bold flex items-center justify-center">{group.organizer_name?.charAt(0).toUpperCase() || 'H'}</span>
              Hosted by <span className="text-sand font-semibold">{group.organizer_name}</span>
            </span>
          </div>
        }
        actions={
          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm text-sand/80 mb-2">
              <span>
                {group.current_members} of {group.max_members} seats taken
              </span>
              <span className="font-semibold text-sand">{fill}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-[width] duration-1000" style={{ width: `${fill}%` }} />
            </div>
          </div>
        }
      />

      {/* ── Key facts ── */}
      <FactsCard facts={facts} />

      {/* ── Story maker: opens for the crew 90 minutes after the start ── */}
      {(isOrganizer || isApprovedMember) && (storyReady || isSameDay(date)) && (
        <div className="max-w-7xl mx-auto px-page pt-12">
          {storyReady ? (
            <Link
              to={`/groups/${group.id}/story`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-night text-sand p-6 sm:p-8 card-shadow-hover"
            >
              <div>
                <p className="section-label !text-[#F4B08A] mb-2">Trip done?</p>
                <p className="font-display text-2xl sm:text-3xl">Make your Instagram story in seconds.</p>
                <p className="text-[#C9D2CE] text-sm mt-1.5">Add a photo or two for each place. We’ll design it and write the caption.</p>
              </div>
              <span className="btn-accent shrink-0 self-start sm:self-auto">
                <Sparkles className="w-4 h-4" /> Make your story
              </span>
            </Link>
          ) : (
            <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-sm text-body flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-text shrink-0" />
              Story maker opens at{' '}
              <span className="font-semibold text-ink">{storyUnlockTime(group).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>. Come back after
              the trip to turn your photos into an Instagram story.
            </p>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-page pt-24 pb-28 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-14 lg:gap-20">
        <div className="min-w-0 space-y-20">
          {/* The plan */}
          <section>
            <Reveal>
              <p className="section-label mb-5">The plan</p>
            </Reveal>
            <SplitHeading className="text-display text-ink mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }} parts={[{ text: "Here's how the" }, { text: 'day goes.', accent: true }]} />
            <Reveal delay={0.1}>
              <p className="text-body text-lg leading-[1.8] whitespace-pre-line max-w-[64ch]">{group.description}</p>
            </Reveal>
          </section>

          {/* Route */}
          {stops.length > 0 && (
            <section>
              <Reveal>
                <p className="section-label mb-8">The route · {stops.length} stops</p>
              </Reveal>
              <Reveal stagger={0.1} as="div" className="relative">
                <span className="absolute left-[19px] top-6 bottom-6 border-l-2 border-dashed border-line-strong" aria-hidden />
                {[{ label: group.meeting_area, meet: true }, ...stops.map((s) => ({ label: s, meet: false }))].map((stop, i, arr) => (
                  <RevealItem key={i} className="relative flex items-start gap-5 pb-7 last:pb-0">
                    <span
                      className={cn(
                        'relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        stop.meet ? 'bg-sand border-2 border-ink text-ink' : i === arr.length - 1 ? 'bg-accent text-white' : 'bg-ink text-sand'
                      )}
                    >
                      {stop.meet ? <MapPin className="w-4 h-4" /> : i}
                    </span>
                    <div className="card px-5 py-4 flex-1">
                      <p className="text-label text-muted mb-0.5">{stop.meet ? 'Meeting point' : i === arr.length - 1 ? 'Final stop' : `Stop ${i}`}</p>
                      <p className="font-display text-xl text-ink">{stop.label}</p>
                    </div>
                  </RevealItem>
                ))}
              </Reveal>
            </section>
          )}

          {/* Safety */}
          {group.safety_notes && (
            <Reveal as="section" className="rounded-[26px] bg-accent-soft/60 border border-accent/20 p-7 flex gap-5">
              <span className="w-12 h-12 rounded-2xl bg-paper text-accent-text flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-display text-2xl text-ink mb-2">Safety & gear</h2>
                <p className="text-body leading-relaxed">{group.safety_notes}</p>
              </div>
            </Reveal>
          )}

          {/* ═══ Organizer: join requests ═══ */}
          {isOrganizer && (
            <Reveal as="section" className="card card-shadow p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-ink text-sand flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <h2 className="font-display text-2xl text-ink">Join requests</h2>
                </div>
                <span className="badge bg-stone text-ink">{pendingCount ? `${pendingCount} waiting` : 'Host view'}</span>
              </div>
              <p className="text-sm text-muted mb-6">Approving someone shows them the group chat link straight away.</p>

              {requests.length === 0 ? (
                <div className="rounded-2xl bg-sand border border-line p-8 text-center text-sm text-muted">No requests yet. When people ask to join, they'll appear here.</div>
              ) : (
                <ul className="space-y-3">
                  {requests.map((req) => (
                    <li key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-sand border border-line">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-full bg-sage-soft text-sage-text font-bold flex items-center justify-center shrink-0">{req.user_name?.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{req.user_name}</p>
                          <p className="text-xs text-muted truncate">{req.user_email}</p>
                        </div>
                        <span
                          className={cn(
                            'badge ml-1',
                            req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-amber'
                          )}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleUpdateRequestStatus(req.id, 'approved')} className="btn-primary !py-2 !px-4 !text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleUpdateRequestStatus(req.id, 'rejected')} className="btn-ghost !py-2 !px-4 !text-xs hover:!text-[#B42318] hover:!border-[#B42318]/40">
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          )}

          {/* Destination */}
          {place && !stops.length && (
            <section>
              <Reveal>
                <p className="section-label mb-6">Where you're headed</p>
              </Reveal>
              <Reveal className="max-w-sm">
                <PlaceCard place={place} />
              </Reveal>
            </section>
          )}
        </div>

        {/* ── Sticky action card ── */}
        <aside className="lg:sticky lg:top-28 self-start space-y-5">
          <Reveal className="rounded-[26px] bg-paper border border-line card-shadow-hover overflow-hidden">
            {/* Ticket header */}
            <div className="bg-ink text-sand p-6 flex items-center gap-5">
              <div className="w-16 rounded-2xl bg-white/10 flex flex-col items-center py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sand/60">{date.toLocaleDateString('en-IN', { month: 'short' })}</span>
                <span className="font-display text-3xl leading-none my-0.5">{date.getDate()}</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sand/60">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              </div>
              <div className="min-w-0">
                <p className="text-label text-sand/60 mb-1">{date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} departure</p>
                <p className="font-display text-xl leading-snug line-clamp-2">{stops.length ? stops.join(' → ') : destination}</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {actionMessage && (
                <div className="bg-[#DDEEE4] text-[#1F5C42] p-3.5 rounded-2xl text-sm flex items-center gap-2" role="status">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {actionMessage}
                </div>
              )}

              {/* Case 1: The user is the Organizer */}
              {isOrganizer ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-accent-soft text-accent-text p-3.5 text-sm font-semibold flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" /> You're hosting this trip
                  </div>
                  {group.chat_link && (
                    <a href={group.chat_link} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                      <MessageCircle className="w-4 h-4" /> Open group chat <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Organizer delete action with 2-hour cooldown notice */}
                  <div className="pt-3 mt-2 border-t border-line">
                    <button onClick={handleDeleteGroup} disabled={isDeleting} className="btn-ghost w-full !text-[#B42318] !border-[#B42318]/30 hover:!bg-[#F8DEDA]/50">
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting trip…' : 'Cancel & delete trip'}
                    </button>

                    {deleteError && (
                      <div className="mt-3 p-3 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-xs text-[#8A1C12] flex items-start gap-2" role="alert">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{deleteError}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">Hosts can delete a trip 2 hours after creating it, so plans stay stable for people who joined.</p>
                  </div>
                </div>
              ) : isApprovedMember ? (
                /* Case 2: Approved: reveal the WhatsApp / Telegram link */
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#DDEEE4] text-[#1F5C42] p-3.5 text-sm font-semibold flex items-center justify-center gap-2">
                    <PartyPopper className="w-4 h-4" /> You're in! The host approved you.
                  </div>
                  {group.chat_link ? (
                  <a
                    href={group.chat_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('btn-primary w-full', isWhatsApp && '!bg-[#1EA952] hover:!bg-[#178C44]', isTelegram && '!bg-[#0088cc] hover:!bg-[#0077b5]')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {isWhatsApp ? 'Join WhatsApp group' : isTelegram ? 'Join Telegram chat' : 'Open group chat'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  ) : (
                    <p className="text-xs text-muted text-center leading-relaxed">The host hasn't added a group chat link yet. Check back soon.</p>
                  )}
                </div>
              ) : myRequestStatus === 'pending' ? (
                /* Case 3: Request pending */
                <div className="rounded-2xl bg-accent-soft/70 text-accent-text py-4 px-4 font-semibold text-sm flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" /> Request sent · waiting for the host
                </div>
              ) : myRequestStatus === 'rejected' ? (
                /* Case 4: Request declined */
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#FDF3F1] border border-[#F2C9C2] p-4 text-center">
                    <p className="flex items-center justify-center gap-2 text-[#8A1C12] font-semibold text-sm">
                      <XCircle className="w-4 h-4" /> Your request was declined
                    </p>
                    <p className="text-xs text-[#8A1C12]/80 mt-1.5 leading-relaxed">The host couldn't fit you on this trip. There are others to join.</p>
                  </div>
                  <Link to="/groups" className="btn-ghost w-full">
                    Browse other trips <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                /* Case 5: Anyone else: request to join */
                <button onClick={handleRequestToJoin} disabled={group.status !== 'open' || isSubmittingRequest || past} className="btn-accent w-full !py-4">
                  <Send className="w-4 h-4" />
                  {isSubmittingRequest ? 'Sending request…' : past ? 'This trip has ended' : group.status === 'open' ? 'Request to join' : 'Group is full'}
                </button>
              )}

              {!isOrganizer && !isApprovedMember && (
                <p className="text-xs text-muted text-center leading-relaxed pt-1 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" /> The chat link unlocks once the host approves you.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="card p-5">
            <p className="text-label text-muted mb-3">Seats</p>
            <div className="flex flex-wrap gap-1.5" aria-label={`${group.current_members} of ${group.max_members} seats taken`}>
              {Array.from({ length: Math.min(group.max_members, 30) }).map((_, i) => (
                <span key={i} className={cn('w-6 h-6 rounded-lg', i < group.current_members ? 'bg-ink' : 'bg-stone border border-line')} />
              ))}
            </div>
            <p className="text-sm text-body mt-3">
              {past ? 'This trip has ended.' : left > 0 ? `${left} ${left === 1 ? 'seat' : 'seats'} still open.` : 'Every seat is taken.'}
            </p>
          </Reveal>
        </aside>
      </div>
    </div>
  );
};
