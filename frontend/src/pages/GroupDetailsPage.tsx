import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin,
  CalendarDays,
  Users,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  Clock,
  UserCheck,
  XCircle,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Crown,
  Lock,
  Route,
  Edit3,
  Search,
  Hourglass,
  Wallet,
  Loader2,
} from 'lucide-react';
import type { Group, GroupRequest, Place } from '../types';
import { groupsApi, placesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DetailHero, FactsCard, type Fact } from '../components/detail/DetailHero';
import { SplitHeading } from '../components/motion/SplitHeading';
import { Reveal } from '../components/motion/Reveal';
import { fallbackPhoto } from '../utils/images';
import {
  calendarUrl,
  editWindowLabel,
  groupDestination,
  isPastTrip,
  isStoryUnlocked,
  isTripEditable,
  meetingMapUrl,
  msToDeparture,
  routeStops,
  seatsLeft,
  storyUnlockTime,
  timeToDeparture,
} from '../utils/groups';
import { TripLoadingScreen } from '../components/groups/TripLoadingTips';
import { TRIP_PHOTO, type TripPreview } from '../utils/tripTransition';
import { EditGroupModal } from '../components/groups/EditGroupModal';
import { CrewListModal } from '../components/groups/CrewListModal';
import { ShareTrip } from '../components/groups/ShareTrip';
import { TripJourney } from '../components/groups/TripJourney';
import { DestinationFeature } from '../components/groups/DestinationFeature';
import { JoinSteps } from '../components/groups/JoinSteps';
import { SeatsRing } from '../components/groups/SeatsRing';
import { TripHeroPanel, TripPrimaryAction } from '../components/groups/TripHeroPanel';
import { TripSectionNav, type TripSection } from '../components/groups/TripSectionNav';
import { Chip } from '../components/ui/Chip';
import { cn } from '../utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

type RequestFilter = 'all' | GroupRequest['status'];
const REQUEST_FILTERS: { key: RequestFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Declined' },
];

/** Label and headline that open each section of the page. */
const SectionHead = ({ label, parts }: { label: string; parts: { text: string; accent?: boolean }[] }) => (
  <>
    <Reveal>
      <p className="section-label mb-4">{label}</p>
    </Reveal>
    <SplitHeading className="text-display text-ink mb-7" style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.6rem)' }} parts={parts} />
  </>
);

/* Photo, title, place and host. Also drawn straight from the trip card while the full trip loads,
   so the card's photo has a hero to grow into (utils/tripTransition). */
const TripHero = ({ group, place, actions }: { group: Group; place: Place | null; actions?: ReactNode }) => {
  const past = isPastTrip(group);
  const left = seatsLeft(group);
  const leavesIn = timeToDeparture(group);
  const destination = groupDestination(group, place ?? undefined);
  const stops = routeStops(group.custom_destination);
  const fallback = fallbackPhoto(String(group.id) + destination);
  const photos = [place?.image_url, ...(place?.gallery_images ?? [])].filter((p): p is string => Boolean(p));

  const statusBadge = past ? (
    <span className="badge glass-dark">Completed</span>
  ) : group.status === 'open' && left > 0 ? (
    <span className="badge bg-[#2F7D5B] text-white">Recruiting · {left} {left === 1 ? 'seat' : 'seats'} left</span>
  ) : (
    <span className="badge badge-danger">Group full</span>
  );

  return (
    <DetailHero
      compact
      photos={photos}
      fallback={fallback}
      transitionName={TRIP_PHOTO}
      eyebrow={
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/groups" className="inline-flex items-center gap-1.5 text-label text-sand/70 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> All trips
          </Link>
          {statusBadge}
          {leavesIn && (
            <span className="badge glass-dark">
              <Clock className="w-3 h-3" /> Leaves in {leavesIn}
            </span>
          )}
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
      actions={actions ?? (!past && <ShareTrip group={group} destination={destination} />)}
    />
  );
};

export const GroupDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // The card that opened this page hands over its trip, so the hero can draw before the fetch returns
  const handoff = useLocation().state as TripPreview | null;
  const preview = handoff?.group && String(handoff.group.id) === id ? handoff : null;
  const { user, isAuthenticated } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [place, setPlace] = useState<Place | null>(preview?.place ?? null);
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Requester status ('none' | 'pending' | 'approved' | 'rejected')
  const [myRequestStatus, setMyRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCrewOpen, setIsCrewOpen] = useState(false);
  const [requestQuery, setRequestQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');
  // Requests being saved right now (id → the answer on its way), and the one that last failed
  const [savingRequests, setSavingRequests] = useState<Record<number, 'approved' | 'rejected'>>({});
  const [requestError, setRequestError] = useState<{ id: number; message: string } | null>(null);
  const reduced = useReducedMotion();

  // Re-render so the "leaves in" countdown stays current: every minute, every second in the last hour
  const [, setTick] = useState(0);
  const finalHour = group ? msToDeparture(group) > 0 && msToDeparture(group) < 3_600_000 : false;
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), finalHour ? 1000 : 60_000);
    return () => clearInterval(timer);
  }, [finalHour]);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      // Pass logged-in user email so backend reveals chat_link ONLY if authorized
      const groupData = await groupsApi.getGroupById(id, user?.email);
      if (groupData) {
        setGroup(groupData);

        // The place loads alongside the rest instead of holding the page back; the card usually
        // hands it over already, in which case there is nothing to fetch
        const destId = groupData.destination_id || (groupData as any).place_id;
        if (destId && String(place?.id) !== String(destId)) {
          placesApi.getPlaceById(destId.toString()).then((p) => p && setPlace(p)).catch(() => {});
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
    if (!user || !group || savingRequests[requestId]) return;
    setSavingRequests((saving) => ({ ...saving, [requestId]: newStatus }));
    setRequestError(null);
    try {
      const success = await groupsApi.updateRequestStatus(requestId, newStatus, user.email);
      if (!success) throw new Error();
      // Show the answer on the row straight away; the seat count and the rest catch up behind it
      setRequests((list) => list.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r)));
      fetchDetails();
    } catch (err) {
      console.error('Failed to update status', err);
      setRequestError({ id: requestId, message: `Could not ${newStatus === 'approved' ? 'approve' : 'decline'} this request. Please try again.` });
    } finally {
      setSavingRequests((saving) => {
        const rest = { ...saving };
        delete rest[requestId];
        return rest;
      });
    }
  };

  // Host jumps from the hero to the join requests; the card rings once so the eye lands on it
  const openRequests = () => {
    const el = document.getElementById('trip-requests');
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    el.classList.remove('requests-flash');
    void el.offsetWidth;
    el.classList.add('requests-flash');
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
        {preview ? <TripHero group={preview.group} place={preview.place ?? null} /> : <div className="bg-night h-[480px]" />}
        <TripLoadingScreen />
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

  const date = new Date(group.trip_date);
  const left = seatsLeft(group);
  const past = isPastTrip(group);
  const storyReady = isStoryUnlocked(group);
  const isSameDay = (d: Date) => d.toDateString() === new Date().toDateString();
  const leavesIn = timeToDeparture(group);
  const destination = groupDestination(group, place ?? undefined);
  const stops = routeStops(group.custom_destination);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const requestTerm = requestQuery.trim().toLowerCase();
  const requestCount = (key: RequestFilter) => (key === 'all' ? requests.length : requests.filter((r) => r.status === key).length);
  const shownRequests = requests.filter(
    (r) =>
      (requestFilter === 'all' || r.status === requestFilter) &&
      (!requestTerm || r.user_name?.toLowerCase().includes(requestTerm) || r.user_email?.toLowerCase().includes(requestTerm))
  );

  const msLeft = msToDeparture(group);
  const facts: Fact[] = [
    {
      icon: CalendarDays,
      label: 'When',
      value: date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
      ...(past ? {} : { note: 'Add to calendar', external: calendarUrl(group, destination) }),
    },
    { icon: MapPin, label: 'Meet at', value: group.meeting_area, note: 'Open in Maps', external: meetingMapUrl(group) },
    {
      icon: Hourglass,
      label: past ? 'Status' : 'Leaves in',
      value: <span className="tabular-nums">{timeToDeparture(group, true) ?? 'Trip has left'}</span>,
      accent: !past,
      status: past ? null : msLeft < 2 * 3_600_000 ? { label: 'Boarding soon', tone: 'soon' } : { label: 'On schedule', tone: 'open' },
    },
    {
      icon: Users,
      label: 'Seats',
      value: past ? `${group.current_members} went` : left > 0 ? `${left} ${left === 1 ? 'seat' : 'seats'} open` : 'Group is full',
      ...(group.max_members <= 10
        ? { meter: { level: group.current_members, max: group.max_members, symbol: '●', label: `${group.current_members} of ${group.max_members} seats taken` } }
        : { note: `${group.current_members} of ${group.max_members} going` }),
    },
    ...(group.estimated_cost && group.estimated_cost > 0
      ? [{ icon: Wallet, label: 'Cost', value: `₹${group.estimated_cost.toLocaleString('en-IN')} per person` }]
      : []),
  ];

  const primary = (variant: 'hero' | 'card' | 'bar') => (
    <TripPrimaryAction
      group={group}
      isApprovedMember={isApprovedMember}
      status={myRequestStatus}
      isAuthenticated={isAuthenticated}
      isSubmitting={isSubmittingRequest}
      onRequest={handleRequestToJoin}
      variant={variant}
    />
  );

  const sections = [
    isOrganizer && { id: 'trip-requests', label: 'Requests', badge: pendingCount || undefined },
    group.description?.trim() && { id: 'trip-plan', label: 'The plan' },
    { id: 'trip-journey', label: 'Journey' },
    place && !stops.length && { id: 'trip-place', label: 'The place' },
    !isOrganizer && !past && { id: 'trip-joining', label: 'How to join' },
    group.safety_notes && { id: 'trip-safety', label: 'Safety' },
  ].filter(Boolean) as TripSection[];

  return (
    <div className="w-full bg-sand min-h-screen">
      {/* ── Hero, with the trip's key actions next to the title ── */}
      <TripHero
        group={group}
        place={place}
        actions={
          <TripHeroPanel
            group={group}
            destination={destination}
            isOrganizer={Boolean(isOrganizer)}
            pendingCount={pendingCount}
            onOpenRequests={openRequests}
            onOpenCrew={() => setIsCrewOpen(true)}
            onEdit={() => setIsEditModalOpen(true)}
            primary={primary('hero')}
          />
        }
      />

      {/* ── Key facts ── */}
      <FactsCard facts={facts} />

      {/* ── Linked Curated Itinerary Blueprint ── */}
      {group.itinerary_id && (
        <div className="max-w-7xl mx-auto px-page pt-8">
          <Link
            to={`/itineraries/${group.itinerary_id}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-paper border border-accent/30 p-6 card-shadow-hover transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Route className="w-6 h-6" />
              </span>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold mb-0.5">
                  Curated Route Blueprint Attached
                </p>
                <p className="font-display text-xl text-ink">
                  Explore Full Itinerary & Interactive Map
                </p>
                <p className="text-muted text-xs mt-0.5">
                  See the exact waypoint route, transit modes, and dinner spots.
                </p>
              </div>
            </div>
            <span className="btn-primary text-xs py-2.5 px-5 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
              Open Itinerary ➔
            </span>
          </Link>
        </div>
      )}

      {/* ── Story maker: opens for the crew 90 minutes after the start ── */}
      {(isOrganizer || isApprovedMember) && (storyReady || isSameDay(date)) && (
        <div className="max-w-7xl mx-auto px-page pt-10">
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

      {/* ── Section tabs, stuck under the navbar ── */}
      <TripSectionNav sections={sections} />

      <div className="max-w-7xl mx-auto px-page pt-10 pb-24 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-12 lg:gap-16">
        <div className="min-w-0 space-y-16">
          {/* ═══ Organizer: join requests ═══ */}
          {isOrganizer && (
            <section id="trip-requests" className="scroll-mt-44">
            <Reveal className="card card-shadow p-6 sm:p-8">
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

              {requests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter requests by status">
                  {REQUEST_FILTERS.map(({ key, label }) => (
                    <Chip key={key} group="requests" active={requestFilter === key} onClick={() => setRequestFilter(key)}>
                      {label} <span className="tabular-nums opacity-70">{requestCount(key)}</span>
                    </Chip>
                  ))}
                </div>
              )}

              {requests.length > 0 && (
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={requestQuery}
                    onChange={(e) => setRequestQuery(e.target.value)}
                    placeholder="Search requests by name or email"
                    aria-label="Search join requests by name or email"
                    className="field !pl-11"
                  />
                </div>
              )}

              {requests.length === 0 ? (
                <div className="rounded-2xl bg-sand border border-line p-8 text-center text-sm text-muted">No requests yet. When people ask to join, they'll appear here.</div>
              ) : shownRequests.length === 0 ? (
                <div className="rounded-2xl bg-sand border border-line p-8 text-center text-sm text-muted">
                  {requestTerm ? `No request matches “${requestQuery.trim()}”.` : 'No requests with this status.'}
                </div>
              ) : (
                <ul className="relative space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {shownRequests.map((req) => (
                    <motion.li
                      key={req.id}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-sand border border-line"
                    >
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
                        <div className="shrink-0" aria-busy={Boolean(savingRequests[req.id])}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateRequestStatus(req.id, 'approved')}
                              disabled={Boolean(savingRequests[req.id])}
                              className="btn-primary !py-2 !px-4 !text-xs"
                            >
                              {savingRequests[req.id] === 'approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {savingRequests[req.id] === 'approved' ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleUpdateRequestStatus(req.id, 'rejected')}
                              disabled={Boolean(savingRequests[req.id])}
                              className="btn-ghost !py-2 !px-4 !text-xs hover:!text-[#B42318] hover:!border-[#B42318]/40 disabled:opacity-55 disabled:cursor-not-allowed"
                            >
                              {savingRequests[req.id] === 'rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              {savingRequests[req.id] === 'rejected' ? 'Declining…' : 'Decline'}
                            </button>
                          </div>
                          {requestError?.id === req.id && (
                            <p className="text-xs font-semibold text-[#8A1C12] mt-2" role="alert">
                              {requestError.message}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </Reveal>
            </section>
          )}

          {/* The plan (optional when hosting) */}
          {group.description?.trim() && (
            <section id="trip-plan" className="scroll-mt-44">
              <SectionHead label="The plan" parts={[{ text: "Here's how the" }, { text: 'day goes.', accent: true }]} />
              <Reveal delay={0.1}>
                <p className="text-body text-lg leading-[1.8] whitespace-pre-line max-w-[64ch]">{group.description}</p>
              </Reveal>
            </section>
          )}

          {/* The day, start to finish */}
          <section id="trip-journey" className="scroll-mt-44">
            <SectionHead
              label={stops.length > 1 ? `The journey · ${stops.length} stops` : 'The journey'}
              parts={[{ text: 'From meet-up to' }, { text: 'memories.', accent: true }]}
            />
            <TripJourney group={group} place={place} stops={stops} destination={destination} />
          </section>

          {/* Destination */}
          {place && !stops.length && (
            <section id="trip-place" className="scroll-mt-44">
              <SectionHead label="Where you're headed" parts={[{ text: 'Get to know' }, { text: 'the place.', accent: true }]} />
              <Reveal>
                <DestinationFeature place={place} />
              </Reveal>
            </section>
          )}

          {/* How joining works, with the visitor's own progress */}
          {!isOrganizer && !past && (
            <section id="trip-joining" className="scroll-mt-44">
              <SectionHead label="How joining works" parts={[{ text: 'Three steps to' }, { text: 'your seat.', accent: true }]} />
              <JoinSteps status={isApprovedMember ? 'approved' : myRequestStatus} />
            </section>
          )}

          {/* Safety */}
          {group.safety_notes && (
            <section id="trip-safety" className="scroll-mt-44">
            <Reveal className="rounded-[22px] bg-accent-soft/60 border border-accent/20 p-6 sm:p-7 flex gap-5">
              <span className="w-12 h-12 rounded-2xl bg-paper text-accent-text flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-ink mb-2">Safety & gear</h2>
                <p className="text-body leading-relaxed whitespace-pre-line">{group.safety_notes}</p>
              </div>
            </Reveal>
            </section>
          )}
        </div>

        {/* ── Sticky action card ── */}
        <aside className="lg:sticky lg:top-40 self-start space-y-5">
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
                  {/* Organizer Edit Trip Action */}
                  <div>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className={cn(
                        'btn-ghost w-full !border-line hover:!border-ink text-ink font-semibold flex items-center justify-center gap-2',
                        !isTripEditable(group) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Edit3 className="w-4 h-4 text-accent" />
                      Edit trip settings
                    </button>
                    <p className="text-[11px] text-muted text-center mt-1.5 leading-relaxed">
                      {editWindowLabel(group)}
                    </p>
                  </div>

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
              ) : (
                primary('card')
              )}

              {!isOrganizer && !isApprovedMember && (
                <p className="text-xs text-muted text-center leading-relaxed pt-1 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" /> The chat link unlocks once the host approves you.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="card p-5">
            <div className="flex items-center gap-5">
              <SeatsRing joined={group.current_members} max={group.max_members} />
              <div className="min-w-0">
                <p className="text-label text-muted mb-1.5">Seats</p>
                <p className="font-display text-xl text-ink leading-snug">
                  {past ? 'Trip has ended' : left > 0 ? `${left} ${left === 1 ? 'seat' : 'seats'} open` : 'Every seat is taken'}
                </p>
                <p className="text-sm text-muted mt-1">
                  {group.current_members} of {group.max_members} going
                </p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-line flex items-center gap-4">
              <span className="w-11 h-11 rounded-full bg-[#F4B08A] text-night font-bold flex items-center justify-center shrink-0">
                {group.organizer_name?.charAt(0).toUpperCase() || 'H'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-label text-muted mb-0.5">Your host</p>
                <p className="font-semibold text-ink truncate">
                  {group.organizer_name}
                  {isOrganizer && <span className="text-muted font-normal"> · You</span>}
                </p>
              </div>
              <Crown className="w-4 h-4 text-accent-text shrink-0" />
            </div>
            {isOrganizer && (
              <button onClick={() => setIsCrewOpen(true)} className="btn-ghost w-full mt-5">
                <Users className="w-4 h-4 text-accent" /> Crew list
              </button>
            )}
          </Reveal>
        </aside>
      </div>

      {/* ── Phones: the one next step, always in reach ── */}
      {!past && (
        <>
          <div className="h-20 lg:hidden" aria-hidden />
          <motion.div
            initial={reduced ? false : { y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
            className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-paper/95 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-12px_32px_-20px_rgba(16,42,46,0.45)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-label text-muted truncate">{leavesIn ? `Leaves in ${leavesIn}` : 'Leaving now'}</p>
              <p className="text-sm font-semibold text-ink truncate">{left > 0 ? `${left} ${left === 1 ? 'seat' : 'seats'} open` : 'Group is full'}</p>
            </div>
            {isOrganizer ? (
              <button onClick={openRequests} className="btn-primary shrink-0">
                <UserCheck className="w-4 h-4" /> {pendingCount ? `Review requests (${pendingCount})` : 'Requests'}
              </button>
            ) : (
              primary('bar')
            )}
          </motion.div>
        </>
      )}

      {/* Organizer Edit Modal */}
      {group && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          group={group}
          destinationName={destination}
          onUpdated={(updatedGroup) => {
            setGroup(updatedGroup);
            setActionMessage('Trip details updated.');
          }}
        />
      )}

      {/* Organizer crew list */}
      {isOrganizer && (
        <CrewListModal
          isOpen={isCrewOpen}
          onClose={() => setIsCrewOpen(false)}
          group={group}
          onChanged={(updatedGroup) => {
            setGroup(updatedGroup);
            // The removed person's request is now rejected; reload so the join-requests list shows it
            fetchDetails();
          }}
        />
      )}
    </div>
  );
};
