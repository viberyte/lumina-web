'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, CalendarDays, Sparkles, BarChart3, Settings, 
  X, Users, Clock, Check, Loader2, MessageCircle, Instagram,
  CheckCircle2, XCircle, DollarSign, PartyPopper
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/partner/bookings', icon: CalendarDays },
  { name: 'Events', href: '/partner/events', icon: Sparkles },
  { name: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/partner/settings', icon: Settings },
];

type Booking = {
  id: number;
  user_id: number;
  event_id: number;
  venue_id: number;
  partner_id: number;
  party_size: number;
  status: string;
  total_amount: number;
  section_name_snapshot: string;
  section_min_spend_snapshot: number;
  payment_method: string;
  special_requests: string;
  confirmation_code: string;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  event_title: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  customer_name: string;
  customer_email: string;
  customer_instagram: string;
  customer_phone: string;
};

export default function PartnerBookingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/partner/bookings', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/partner/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, status: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch('/api/partner/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId, status }),
      });

      if (res.ok) {
        const statusMessages: Record<string, string> = {
          approved: 'Booking approved!',
          declined: 'Booking declined',
          paid: 'Marked as paid!',
        };
        toast.success(statusMessages[status] || 'Status updated', {
          style: { background: '#18181b', color: '#fff', border: 'none' },
        });
        setSelectedBooking(null);
        fetchBookings();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecline = (bookingId: number) => {
    if (confirm('Decline this booking? This action cannot be undone.')) {
      handleUpdateStatus(bookingId, 'declined');
    }
  };

  const handleOpenChat = (booking: Booking) => {
    router.push(`/partner/messages?userId=${booking.user_id}`);
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const formatDate = (dateStr?: string | null) => {
    if (typeof dateStr !== 'string') return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (time?: string | null) => {
    if (typeof time !== 'string') return '';
    if (!time.includes(':')) return time;
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;
    const hour = h % 12 || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10' },
      approved: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      paid: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      declined: { label: 'Declined', color: 'text-red-400', bg: 'bg-red-500/10' },
      cancelled: { label: 'Cancelled', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    };
    return badges[status] || badges.pending;
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  const SidebarNav = () => (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-black hidden md:flex flex-col z-20">
      <div className="p-6 pb-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Lumina <span className="text-zinc-600 font-normal text-sm">Partner</span>
        </Link>
      </div>
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={isActive 
                  ? 'flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium' 
                  : 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors duration-300'
                }
              >
                <Icon size={18} strokeWidth={1.5} />
                <span>{item.name}</span>
                {item.name === 'Bookings' && pendingCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );

  const MobileNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl px-6 py-3 z-30">
      <div className="flex justify-between">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={isActive ? 'flex flex-col items-center py-1 text-white relative' : 'flex flex-col items-center py-1 text-zinc-600 relative'}
            >
              <Icon size={22} strokeWidth={1.5} />
              <span className="text-[10px] mt-1.5">{item.name}</span>
              {item.name === 'Bookings' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" />
      <SidebarNav />

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/partner/dashboard" className="text-zinc-500 text-sm">Back</Link>
          <h1 className="font-semibold text-lg">Bookings</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="px-5 md:px-10 py-6 pt-20 md:pt-10 max-w-4xl">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }} 
            className="mb-10"
          >
            <h1 className="text-3xl font-semibold text-white mb-2">Bookings</h1>
            <p className="text-zinc-500">
              {bookings.length} total · {pendingCount} pending approval
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5, delay: 0.1 }} 
            className="flex gap-2 mb-8 overflow-x-auto pb-2"
          >
            {(['all', 'pending', 'approved', 'paid'] as const).map((f) => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={filter === f 
                  ? 'px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-white transition-colors duration-300 whitespace-nowrap' 
                  : 'px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-300 whitespace-nowrap'
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-2 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-zinc-900/30 rounded-2xl p-12 text-center"
            >
              <PartyPopper size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">No {filter !== 'all' ? filter : ''} bookings yet</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking, idx) => {
                const status = getStatusBadge(booking.status);
                
                return (
                  <motion.div 
                    key={booking.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedBooking(booking)} 
                    className={booking.status === 'pending'
                      ? 'bg-zinc-900/70 rounded-2xl p-5 cursor-pointer hover:bg-zinc-900 transition-colors duration-300 border border-amber-500/20' 
                      : 'bg-zinc-900/40 rounded-2xl p-5 cursor-pointer hover:bg-zinc-900/60 transition-colors duration-300'
                    }
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium">{booking.customer_name || 'Guest'}</h3>
                          {booking.customer_instagram && (
                            <span className="text-zinc-500 text-sm flex items-center gap-1">
                              <Instagram size={12} />
                              @{booking.customer_instagram}
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-sm">
                          {booking.event_title || 'Event'} · {booking.section_name_snapshot || 'Table'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          ${booking.section_min_spend_snapshot || booking.total_amount || 0}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        <span>{formatDate(booking.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTime(booking.event_time)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{booking.party_size} guests</span>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <p className="mt-3 text-xs text-zinc-400 italic">
                        "{booking.special_requests}"
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" 
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedBooking(null); }}
          >
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
              className="bg-zinc-900 rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedBooking.customer_name || 'Guest'}
                  </h2>
                  {selectedBooking.customer_instagram && (
                    <a 
                      href={`https://instagram.com/${selectedBooking.customer_instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm flex items-center gap-1 hover:underline"
                    >
                      <Instagram size={14} />
                      @{selectedBooking.customer_instagram}
                    </a>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)} 
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-5">
                {(() => {
                  const status = getStatusBadge(selectedBooking.status);
                  return (
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${status.bg} ${status.color} text-sm font-medium`}>
                      {selectedBooking.status === 'pending' && <Clock size={14} />}
                      {selectedBooking.status === 'approved' && <Check size={14} />}
                      {selectedBooking.status === 'paid' && <DollarSign size={14} />}
                      {selectedBooking.status === 'declined' && <XCircle size={14} />}
                      {status.label}
                    </span>
                  );
                })()}
              </div>

              {/* Booking Info */}
              <div className="bg-zinc-800/30 rounded-2xl p-5 mb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Event</span>
                  <span className="text-white">{selectedBooking.event_title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Date</span>
                  <span className="text-white">{formatDate(selectedBooking.event_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Time</span>
                  <span className="text-white">{formatTime(selectedBooking.event_time)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Package</span>
                  <span className="text-white">{selectedBooking.section_name_snapshot || 'Table'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Min Spend</span>
                  <span className="text-white font-semibold">
                    ${selectedBooking.section_min_spend_snapshot || selectedBooking.total_amount || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Party Size</span>
                  <span className="text-white">{selectedBooking.party_size} guests</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Confirmation</span>
                  <span className="text-zinc-400 font-mono text-xs">{selectedBooking.confirmation_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Requested</span>
                  <span className="text-zinc-400">{formatDateTime(selectedBooking.created_at)}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-zinc-800/30 rounded-2xl p-5 mb-5 space-y-3">
                <h3 className="text-sm font-medium text-white mb-2">Contact</h3>
                {selectedBooking.customer_email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Email</span>
                    <span className="text-white">{selectedBooking.customer_email}</span>
                  </div>
                )}
                {selectedBooking.customer_phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Phone</span>
                    <span className="text-white">{selectedBooking.customer_phone}</span>
                  </div>
                )}
              </div>

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div className="bg-zinc-800/30 rounded-2xl p-5 mb-5">
                  <h3 className="text-sm font-medium text-white mb-2">Special Requests</h3>
                  <p className="text-zinc-400 text-sm">{selectedBooking.special_requests}</p>
                </div>
              )}

              {/* Actions */}
              {selectedBooking.status === 'pending' && (
                <div className="space-y-3">
                  <button 
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'approved')}
                    disabled={updatingId === selectedBooking.id}
                    className="w-full bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingId === selectedBooking.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Approve Booking
                  </button>
                  <button 
                    onClick={() => handleDecline(selectedBooking.id)}
                    disabled={updatingId === selectedBooking.id}
                    className="w-full bg-zinc-800 text-red-400 py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
              )}

              {selectedBooking.status === 'approved' && (
                <div className="space-y-3">
                  <button 
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'paid')}
                    disabled={updatingId === selectedBooking.id}
                    className="w-full bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingId === selectedBooking.id ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                    Mark as Paid
                  </button>
                  <button 
                    onClick={() => handleOpenChat(selectedBooking)}
                    className="w-full bg-zinc-800 text-white py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Message Guest
                  </button>
                </div>
              )}

              {selectedBooking.status === 'paid' && (
                <div className="bg-emerald-500/10 rounded-2xl p-5 text-center">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-medium">Payment Received</p>
                  {selectedBooking.paid_at && (
                    <p className="text-zinc-500 text-sm mt-1">
                      {formatDateTime(selectedBooking.paid_at)}
                    </p>
                  )}
                </div>
              )}

              {selectedBooking.status === 'declined' && (
                <div className="bg-red-500/10 rounded-2xl p-5 text-center">
                  <XCircle size={32} className="text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 font-medium">Booking Declined</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav />
    </div>
  );
}
