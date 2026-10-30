import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  CheckCheck,
  Trash2,
  ChevronRight,
  X,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/client';
import type { AppNotification } from '../../types';
import { hasPhotoHero } from '../../utils/routes';
import { setScrollLocked } from '../../hooks/useLenis';
import { NavRoad, LOGO_HEIGHT } from './NavRoad';

const EASE = [0.22, 1, 0.36, 1] as const;

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [mobileNotifsOpen, setMobileNotifsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const desktopRightRef = useRef<HTMLDivElement>(null);
  const mobileRightRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState(0);

  // The navbar road ends just before the right-hand controls
  useEffect(() => {
    const els = [desktopRightRef.current, mobileRightRef.current].filter(Boolean) as HTMLElement[];
    const measure = () => setRightWidth(Math.max(0, ...els.map((el) => el.offsetWidth)));
    const ro = new ResizeObserver(measure);
    els.forEach((el) => ro.observe(el));
    measure();
    return () => ro.disconnect();
  }, []);

  // Scroll listener: the pill turns to sandstone glass once the page moves
  useEffect(() => {
    // Read the position once per frame and only touch state when it crosses the line
    let frame = 0;
    let last: boolean | null = null;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 60;
      if (next !== last) setIsScrolled((last = next));
    };
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  // Close menus on navigation
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setMobileNotifsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setScrollLocked(isMenuOpen);
    return () => setScrollLocked(false);
  }, [isMenuOpen]);

  // Over a dark photo hero (and not yet scrolled) the bar uses light text
  const onPhoto = hasPhotoHero(location.pathname) && !isScrolled && !isMenuOpen;

  const navLinks = [
    { name: 'Explore', path: '/explore' },
    ...(isAdmin ? [{ name: 'Itineraries', path: '/itineraries' }] : []),
    { name: 'Groups', path: '/groups' },
    { name: 'Submit a place', path: '/submit' },
  ];

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.email) return;
    try {
      const data = await notificationsApi.getNotifications(user.email, isAdmin);
      const visibleNotifications = data.notifications || [];
      setNotifications(visibleNotifications);
      setUnreadCount(visibleNotifications.filter(notification => !notification.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [isAuthenticated, user?.email, isAdmin]);

  // Initial load and periodic 12-second polling for real-time updates
  useEffect(() => {
    fetchNotifications();
    if (!isAuthenticated) return;
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [fetchNotifications, isAuthenticated]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format relative timestamps
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'Yesterday';
      return `${diffInDays}d ago`;
    } catch {
      return '';
    }
  };

  // Icon and colours per notification type
  const getNotificationMeta = (type: string) => {
    switch (type) {
      case 'place_approved':
      case 'group_approved':
        return { icon: CheckCircle2, iconColor: 'text-[#2F7D5B]', bgColor: 'bg-[#DDEEE4]', badgeClass: 'bg-[#DDEEE4] text-[#2F7D5B]', badgeText: 'Approved' };
      case 'place_rejected':
      case 'group_rejected':
        return { icon: XCircle, iconColor: 'text-[#B42318]', bgColor: 'bg-[#F8DEDA]', badgeClass: 'bg-[#F8DEDA] text-[#B42318]', badgeText: 'Declined' };
      case 'place_pending':
      case 'group_pending':
        return { icon: Clock, iconColor: 'text-accent-text', bgColor: 'bg-accent-soft', badgeClass: 'bg-accent-soft text-accent-text', badgeText: 'Pending' };
      case 'group_request_received':
        return { icon: UserPlus, iconColor: 'text-sage-text', bgColor: 'bg-sage-soft', badgeClass: 'bg-sage-soft text-sage-text', badgeText: 'Join request' };
      case 'admin_submission_alert':
        return { icon: Shield, iconColor: 'text-ink', bgColor: 'bg-stone', badgeClass: 'bg-stone text-ink', badgeText: 'Moderation' };
      default:
        return { icon: Bell, iconColor: 'text-muted', bgColor: 'bg-stone', badgeClass: 'bg-stone text-muted', badgeText: 'Update' };
    }
  };

  // Handle clicking an individual notification
  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await notificationsApi.markAsRead(notif.id);
    }
    setIsNotificationsOpen(false);
    setIsMenuOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.email) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await notificationsApi.markAllAsRead(user.email, isAdmin);
  };

  const handleClearAll = async () => {
    if (!user?.email) return;
    setNotifications([]);
    setUnreadCount(0);
    await notificationsApi.clearAll(user.email, isAdmin);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    const target = notifications.find(n => n.id === notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (target && !target.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    await notificationsApi.deleteNotification(notifId);
  };

  const notificationList = (compact: boolean) =>
    notifications.length === 0 ? (
      <div className="py-10 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-stone text-muted flex items-center justify-center mx-auto mb-3">
          <Bell className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-ink">You're all caught up</p>
        <p className="text-xs text-muted mt-1">Updates on your places and trip requests show up here.</p>
      </div>
    ) : (
      notifications.map((notif) => {
        const meta = getNotificationMeta(notif.type);
        const IconComponent = meta.icon;
        return (
          <div
            key={notif.id}
            onClick={() => {
              handleNotificationClick(notif);
              if (compact) setMobileNotifsOpen(false);
            }}
            className={cn(
              'px-4 py-3.5 transition-colors cursor-pointer flex gap-3 items-start relative group',
              notif.is_read ? 'hover:bg-sand' : 'bg-accent-soft/40 hover:bg-accent-soft/70'
            )}
          >
            <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', meta.bgColor)}>
              <IconComponent className={cn('w-4 h-4', meta.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={cn('text-[13px] font-semibold truncate', notif.is_read ? 'text-body' : 'text-ink')}>{notif.title}</p>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0', meta.badgeClass)}>{meta.badgeText}</span>
              </div>
              <p className="text-xs text-muted leading-snug line-clamp-2">{notif.message}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-muted">{formatTimeAgo(notif.created_at)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteNotification(e, notif.id)}
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                    className={cn('p-1 text-muted hover:text-[#B42318] transition-all rounded', !compact && 'opacity-0 group-hover:opacity-100')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!compact && (
                    <span className="text-[11px] text-accent-text font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      View <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!notif.is_read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 self-center" />}
          </div>
        );
      })
    );

  const notificationActions = (
    <div className="flex items-center gap-3">
      {unreadCount > 0 && (
        <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors font-semibold">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </button>
      )}
      {notifications.length > 0 && (
        <button onClick={handleClearAll} className="flex items-center gap-1 text-xs text-muted hover:text-[#B42318] transition-colors font-semibold">
          <Trash2 className="w-3.5 h-3.5" /> Clear all
        </button>
      )}
    </div>
  );

  const dropdownMotion = reduced
    ? {}
    : { initial: { opacity: 0, y: -8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.98 }, transition: { duration: 0.22, ease: EASE } };

  const iconButton = cn(
    'relative w-10 h-10 rounded-full flex items-center justify-center transition-colors',
    onPhoto ? 'text-sand hover:bg-white/15' : 'text-ink hover:bg-ink/[0.06]'
  );

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 sm:px-5" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div
        className={cn(
          'nav-pill relative mx-auto rounded-full transition-[max-width,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isScrolled || !hasPhotoHero(location.pathname) || isMenuOpen ? 'nav-pill-scrolled max-w-5xl' : 'max-w-6xl'
        )}
      >
        {/* The road out of the N of Namma, with a jeep that tracks page progress */}
        <NavRoad logoLeft={16} barHeight={68} endInset={rightWidth + 22} />

        <div className="relative z-10 flex justify-between items-center h-[68px] pl-4 pr-2.5">
          <Link to="/" className="group shrink-0" aria-label="SafarNamma home">
            <img
              src="/images/logo-360.webp"
              alt="SafarNamma"
              width={360}
              height={240}
              style={{ height: LOGO_HEIGHT }}
              className="w-auto object-contain drop-shadow-[0_2px_6px_rgba(14,31,34,0.25)] transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-[1.04]"
            />
          </Link>

          {/* Desktop links with a sliding underline */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    'relative px-4 py-2 text-[13px] font-semibold tracking-wide transition-colors',
                    onPhoto ? (isActive ? 'text-white' : 'text-sand/80 hover:text-white') : isActive ? 'text-ink' : 'text-body hover:text-ink'
                  )}
                >
                  {link.name}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-4 right-4 -bottom-0.5 h-[2px] rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div ref={desktopRightRef} className="hidden md:flex items-center gap-1.5">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(prev => !prev);
                      setIsProfileOpen(false);
                    }}
                    aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                    aria-expanded={isNotificationsOpen}
                    className={iconButton}
                  >
                    <Bell className="w-[18px] h-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        {...dropdownMotion}
                        className="absolute right-0 mt-3 w-96 origin-top-right bg-paper rounded-3xl card-shadow-hover border border-line overflow-hidden z-50"
                      >
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-semibold text-ink">Notifications</span>
                            {unreadCount > 0 && <span className="badge badge-amber">{unreadCount} new</span>}
                          </div>
                          {notificationActions}
                        </div>
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-line" data-lenis-prevent>
                          {notificationList(false)}
                        </div>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setIsNotificationsOpen(false)}
                            className="flex items-center justify-center gap-1.5 py-3 border-t border-line text-xs font-bold text-ink hover:bg-sand transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" /> Open moderation hub
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotificationsOpen(false);
                    }}
                    aria-expanded={isProfileOpen}
                    className={cn(
                      'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-[13px] font-semibold transition-colors',
                      onPhoto ? 'text-sand hover:bg-white/15' : 'text-ink hover:bg-ink/[0.06]'
                    )}
                  >
                    <span className="w-9 h-9 rounded-full bg-accent-soft text-accent-text flex items-center justify-center font-bold overflow-hidden ring-2 ring-white/60">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </span>
                    <span className="hidden lg:block max-w-[8rem] truncate" title={user?.name}>
                      {user?.name?.split(' ')[0]}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        {...dropdownMotion}
                        className="absolute right-0 mt-3 w-60 origin-top-right bg-paper rounded-3xl card-shadow-hover border border-line py-2 z-50"
                      >
                        <div className="px-4 py-2.5 border-b border-line mb-1">
                          <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                          <p className="text-xs text-muted truncate">{user?.email}</p>
                        </div>
                        <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:bg-sand hover:text-ink transition-colors">
                          <UserIcon className="w-4 h-4" /> My profile
                        </Link>
                        {isAdmin && (
                          <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-accent-text hover:bg-sand transition-colors">
                            <Shield className="w-4 h-4" /> Admin dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => { logout(); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#B42318] hover:bg-[#F8DEDA]/50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn-primary !py-2.5 !px-5 !text-[13px] ml-1" style={onPhoto ? { background: 'var(--color-sand)', color: 'var(--color-ink)' } : undefined}>
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </Link>
            )}
          </div>

          {/* Mobile controls */}
          <div ref={mobileRightRef} className="md:hidden flex items-center gap-1">
            {isAuthenticated && (
              <button
                onClick={() => {
                  setMobileNotifsOpen(!mobileNotifsOpen);
                  setIsMenuOpen(false);
                }}
                aria-label="Notifications"
                className={iconButton}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setMobileNotifsOpen(false);
              }}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              className={iconButton}
            >
              <span className="relative w-5 h-3.5 block">
                <span className={cn('absolute left-0 right-0 h-[2px] rounded-full bg-current transition-all duration-300', isMenuOpen ? 'top-1.5 rotate-45' : 'top-0')} />
                <span className={cn('absolute left-0 right-0 h-[2px] rounded-full bg-current transition-all duration-300', isMenuOpen ? 'top-1.5 -rotate-45' : 'top-3')} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile notifications drawer */}
      <AnimatePresence>
        {mobileNotifsOpen && isAuthenticated && (
          <motion.div {...dropdownMotion} className="md:hidden mx-auto max-w-6xl mt-2 rounded-3xl border border-line bg-paper card-shadow-hover overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
              <span className="font-display font-semibold text-ink">Notifications</span>
              <div className="flex items-center gap-2">
                {notificationActions}
                <button onClick={() => setMobileNotifsOpen(false)} className="text-muted hover:text-ink p-1" aria-label="Close notifications">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-line" data-lenis-prevent>
              {notificationList(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 -z-10 bg-sand pt-28 px-6 pb-10 flex flex-col"
          >
            <motion.ul
              className="flex flex-col gap-1"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
            >
              {[{ name: 'Home', path: '/' }, ...navLinks, ...(isAuthenticated ? [{ name: 'My profile', path: '/profile' }] : [])].map((link) => (
                <motion.li
                  key={link.path}
                  variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                >
                  <Link
                    to={link.path}
                    className="flex items-center justify-between py-3 border-b border-line font-display text-[2rem] leading-tight text-ink"
                  >
                    {link.name}
                    <ArrowUpRight className="w-6 h-6 text-accent" />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>

            <div className="mt-auto flex flex-col gap-3">
              {isAdmin && (
                <Link to="/admin" className="btn-ghost w-full">
                  <Shield className="w-4 h-4" /> Admin dashboard
                </Link>
              )}
              {isAuthenticated ? (
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="btn-ghost w-full !text-[#B42318]">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              ) : (
                <Link to="/login" className="btn-primary w-full">
                  <LogIn className="w-4 h-4" /> Sign in
                </Link>
              )}
              <Link to="/submit" className="btn-accent w-full">
                <Plus className="w-4 h-4" /> Share a hidden gem
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
