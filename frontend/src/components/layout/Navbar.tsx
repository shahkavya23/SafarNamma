import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  
  Compass, 
  Users, 
  LogIn, 
  Menu, 
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
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/client';
import type { AppNotification } from '../../types';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [mobileNotifsOpen, setMobileNotifsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Scroll listener for transparent → glass transition
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Groups', path: '/groups', icon: Users },
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
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

  // Get icon and color palette for notification types
  const getNotificationMeta = (type: string) => {
    switch (type) {
      case 'place_approved':
      case 'group_approved':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          badgeClass: 'bg-emerald-100 text-emerald-800',
          badgeText: 'Approved'
        };
      case 'place_rejected':
      case 'group_rejected':
        return {
          icon: XCircle,
          iconColor: 'text-rose-600',
          bgColor: 'bg-rose-50',
          badgeClass: 'bg-rose-100 text-rose-800',
          badgeText: 'Declined'
        };
      case 'place_pending':
      case 'group_pending':
        return {
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          badgeClass: 'bg-amber-100 text-amber-800',
          badgeText: 'Pending'
        };
      case 'group_request_received':
        return {
          icon: UserPlus,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          badgeClass: 'bg-blue-100 text-blue-800',
          badgeText: 'Join Request'
        };
      case 'admin_submission_alert':
        return {
          icon: Shield,
          iconColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
          badgeClass: 'bg-purple-100 text-purple-800',
          badgeText: 'Admin Moderation'
        };
      default:
        return {
          icon: Bell,
          iconColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          badgeClass: 'bg-gray-100 text-gray-800',
          badgeText: 'Update'
        };
    }
  };

  // Handle clicking an individual notification
  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      // Optimistic local state update
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      await notificationsApi.markAsRead(notif.id);
    }
    setIsNotificationsOpen(false);
    setIsMenuOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Handle mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!user?.email) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await notificationsApi.markAllAsRead(user.email, isAdmin);
  };

  // Handle clearing all notifications from database
  const handleClearAll = async () => {
    if (!user?.email) return;
    setNotifications([]);
    setUnreadCount(0);
    await notificationsApi.clearAll(user.email, isAdmin);
  };

  // Handle deleting a single notification from database
  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    const target = notifications.find(n => n.id === notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (target && !target.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    await notificationsApi.deleteNotification(notifId);
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? 'navbar-glass' : 'navbar-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/safarnamma-logo.png" 
              alt="SafarNamma" 
              className="h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md" 
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={cn(
                      "flex items-center gap-2 text-xs uppercase tracking-widest font-bold transition-colors hover:text-[#F59E0B]",
                      isActive ? "text-[#F59E0B]" : "text-gray-300"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-5 border-l border-white/10 pl-6">
              <Link 
                to="/submit" 
                className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-[#F59E0B] transition-colors"
              >
                Submit a Place
              </Link>
              
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  
                  {/* Notification Bell Dropdown */}
                  <div className="relative" ref={notificationsRef}>
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(prev => !prev);
                        setIsProfileOpen(false);
                      }}
                      aria-label="Notifications"
                      className={cn(
                        "relative p-2 rounded-full transition-all focus:outline-none",
                        isNotificationsOpen 
                          ? "bg-[#0D5C63]/10 text-[#0D5C63]" 
                          : "text-gray-600 hover:text-[#0D5C63] hover:bg-gray-100"
                      )}
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Popover Dropdown */}
                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0D5C63]/10 text-[#0D5C63]">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#0D5C63] transition-colors font-medium"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mark all read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAll}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition-colors font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Clear all
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <div className="py-10 px-4 text-center">
                              <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                                <Bell className="w-6 h-6 stroke-1" />
                              </div>
                              <p className="text-sm font-medium text-gray-700">All caught up!</p>
                              <p className="text-xs text-gray-400 mt-1">No updates on places or trip requests yet.</p>
                            </div>
                          ) : (
                            notifications.map((notif) => {
                              const meta = getNotificationMeta(notif.type);
                              const IconComponent = meta.icon;
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className={cn(
                                    "p-3.5 transition-colors cursor-pointer flex gap-3 items-start relative group",
                                    notif.is_read 
                                      ? "bg-white hover:bg-gray-50/80" 
                                      : "bg-emerald-50/30 hover:bg-emerald-50/60"
                                  )}
                                >
                                  {/* Icon */}
                                  <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", meta.bgColor)}>
                                    <IconComponent className={cn("w-4 h-4", meta.iconColor)} />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <p className={cn("text-xs font-semibold truncate", notif.is_read ? "text-gray-800" : "text-gray-900")}>
                                        {notif.title}
                                      </p>
                                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", meta.badgeClass)}>
                                        {meta.badgeText}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                                      {notif.message}
                                    </p>
                                    <div className="flex items-center justify-between mt-1.5">
                                      <span className="text-[11px] text-gray-400">
                                        {formatTimeAgo(notif.created_at)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                                          title="Dismiss notification"
                                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-600 transition-all rounded hover:bg-rose-50"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-[11px] text-[#0D5C63] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                          View <ChevronRight className="w-3 h-3" />
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Unread indicator pip */}
                                  {!notif.is_read && (
                                    <span className="w-2 h-2 rounded-full bg-[#0D5C63] shrink-0 self-center" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer */}
                        {isAdmin && (
                          <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl text-center">
                            <Link
                              to="/admin"
                              onClick={() => setIsNotificationsOpen(false)}
                              className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center justify-center gap-1.5 py-1"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-600" />
                              Open Admin Moderation Hub
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Profile Avatar Button */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(!isProfileOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#0D5C63] transition-colors focus:outline-none"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#F5F0E6] flex items-center justify-center text-[#0D5C63] border-2 border-transparent hover:border-[#0D5C63] transition-all overflow-hidden shadow-sm">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <span className="hidden lg:block">{user?.name?.split(' ')[0]}</span>
                    </button>
                    
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl py-2 border border-gray-100 z-50">
                        <div className="px-4 py-2 border-b border-gray-50 mb-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <Link 
                          to="/profile" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0D5C63] transition-colors"
                        >
                          <UserIcon className="w-4 h-4" />
                          My Profile
                        </Link>
                        {isAdmin && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors font-semibold"
                          >
                            <Shield className="w-4 h-4 text-amber-600" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button 
                          onClick={() => { logout(); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black text-xs uppercase tracking-wider font-bold hover:brightness-110 transition-all shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && (
              <button 
                onClick={() => {
                  setMobileNotifsOpen(!mobileNotifsOpen);
                  setIsMenuOpen(false);
                }}
                className="relative p-2 text-gray-600 hover:text-[#0D5C63]"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
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
              className="p-2 text-gray-600 hover:text-[#0D5C63]"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Notifications Drawer */}
      {mobileNotifsOpen && isAuthenticated && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0D5C63]/10 text-[#0D5C63]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-gray-500 font-medium"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 font-medium"
                >
                  Clear all
                </button>
              )}
              <button onClick={() => setMobileNotifsOpen(false)} className="text-gray-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 mt-2">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">No notifications yet.</p>
            ) : (
              notifications.map((notif) => {
                const meta = getNotificationMeta(notif.type);
                const IconComponent = meta.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      handleNotificationClick(notif);
                      setMobileNotifsOpen(false);
                    }}
                    className={cn(
                      "py-2.5 px-2 flex items-start gap-2.5 rounded-lg active:bg-gray-100",
                      !notif.is_read ? "bg-emerald-50/40" : ""
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", meta.bgColor)}>
                      <IconComponent className={cn("w-3.5 h-3.5", meta.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 truncate">{notif.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{formatTimeAgo(notif.created_at)}</span>
                          <button
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            title="Dismiss notification"
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="block text-sm font-medium text-gray-700 hover:text-[#F59E0B]"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Link 
              to="/submit" 
              className="block text-sm font-medium text-[#0D5C63]"
              onClick={() => setIsMenuOpen(false)}
            >
              Submit a Place
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className="block text-sm font-medium text-[#0D5C63]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Profile
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="block text-sm font-medium text-amber-800 font-semibold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button 
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="block text-sm font-medium text-red-600 text-left w-full"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                to="/login"
                className="block text-sm font-medium text-[#F59E0B]"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

