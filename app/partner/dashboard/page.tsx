'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CalendarDays, Sparkles, BarChart3, Settings, TrendingUp, Users, Eye, DollarSign, ChevronRight, Clock, MapPin, LogOut, Loader2 } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/partner/bookings', icon: CalendarDays },
  { name: 'Events', href: '/partner/events', icon: Sparkles },
  { name: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/partner/settings', icon: Settings },
];

type Booking = {
  id: number;
  host_name: string;
  table_type: string;
  booking_date: string;
  booking_time: string;
  total_amount: number;
  funded_amount: number;
  guest_count: number;
  status: string;
};

type Venue = {
  id: number;
  name: string;
  subscription_status: string;
  trial_ends_at: string;
};

type Partner = {
  id: number;
  name: string;
  email: string;
};

export default function PartnerDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ todayBookings: 0, weekBookings: 0, monthRevenue: 0, profileViews: 0 });
  const [trialDays, setTrialDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current user
      const meRes = await fetch('/api/partner/auth/me');
      if (!meRes.ok) {
        router.push('/partner/login');
        return;
      }
      const meData = await meRes.json();
      setPartner(meData.partner);
      setStats(meData.stats);

      if (meData.venues && meData.venues.length > 0) {
        const homeVenue = meData.venues.find((v: any) => v.is_home) || meData.venues[0];
        setVenue(homeVenue);

        // Calculate trial days
        if (homeVenue.trial_ends_at) {
          const trialEnd = new Date(homeVenue.trial_ends_at);
          const now = new Date();
          const diff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDays(Math.max(0, diff));
        }

        // Get bookings
        const bookingsRes = await fetch(`/api/partner/bookings?venueId=${homeVenue.id}`);
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/partner/login');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/partner/auth/logout', { method: 'POST' });
    router.push('/partner/login');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (typeof time !== 'string') return ''; const parts = time.split(':'); if (parts.length < 2) return time; const [h, m] = parts.map(Number);
    return (h % 12 || 12) + ':' + m.toString().padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'soft_commit');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'funded');

  const SidebarNav = () => (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-black hidden md:flex flex-col z-20">
      <div className="p-6 pb-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">Viberyte <span className="text-zinc-600 font-normal text-sm">Partner</span></Link>
      </div>
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className={isActive ? 'flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium' : 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors duration-300'}>
                <Icon size={18} strokeWidth={1.5} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-4">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors duration-300 w-full">
          <LogOut size={18} strokeWidth={1.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  const MobileNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl px-6 py-3 z-30">
      <div className="flex justify-between">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className={isActive ? 'flex flex-col items-center py-1 text-white' : 'flex flex-col items-center py-1 text-zinc-600'}>
              <Icon size={22} strokeWidth={1.5} />
              <span className="text-[10px] mt-1.5">{item.name}</span>
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
      <SidebarNav />

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">Viberyte</Link>
          <button onClick={handleLogout} className="text-zinc-500 text-sm">Sign Out</button>
        </div>
      </header>

      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="px-5 md:px-10 py-6 pt-20 md:pt-10 max-w-4xl">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="mb-10">
            <h1 className="text-3xl font-semibold text-white mb-2">Welcome back{partner?.name ? `, ${partner.name.split(' ')[0]}` : ''}</h1>
            <p className="text-zinc-500">{venue?.name || 'Your Venue'}</p>
          </motion.div>

          {/* Trial Banner */}
          {venue?.subscription_status === 'trial' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 rounded-2xl p-5 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium mb-1">Free Trial</p>
                  <p className="text-zinc-500 text-sm">{trialDays} days remaining</p>
                </div>
                <Link href="/partner/settings#billing" className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">
                  Upgrade
                </Link>
              </div>
            </motion.div>
          )}

          {/* Stats Grid */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={16} className="text-zinc-500" />
                <span className="text-zinc-500 text-xs">Today</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats.todayBookings}</p>
              <p className="text-zinc-600 text-xs">bookings</p>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-zinc-500" />
                <span className="text-zinc-500 text-xs">This Week</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats.weekBookings}</p>
              <p className="text-zinc-600 text-xs">bookings</p>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-zinc-500" />
                <span className="text-zinc-500 text-xs">This Month</span>
              </div>
              <p className="text-2xl font-semibold text-white">${stats.monthRevenue.toLocaleString()}</p>
              <p className="text-zinc-600 text-xs">revenue</p>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-zinc-500" />
                <span className="text-zinc-500 text-xs">Views</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats.profileViews}</p>
              <p className="text-zinc-600 text-xs">this month</p>
            </div>
          </motion.div>

          {/* Pending Bookings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-white">Pending Bookings</h2>
              <Link href="/partner/bookings" className="text-zinc-500 text-sm hover:text-white transition-colors flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="bg-zinc-900/30 rounded-2xl p-8 text-center">
                <p className="text-zinc-600 text-sm">No pending bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.slice(0, 5).map((booking) => {
                  const progress = booking.total_amount > 0 ? (booking.funded_amount / booking.total_amount) * 100 : 0;
                  return (
                    <Link key={booking.id} href={`/partner/bookings/${booking.id}`} className="block bg-zinc-900/70 rounded-2xl p-5 hover:bg-zinc-900 transition-colors duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{booking.host_name}</h3>
                          <p className="text-zinc-500 text-sm">{booking.table_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">${booking.funded_amount} / ${booking.total_amount}</p>
                          <p className="text-amber-500/80 text-xs">{booking.status === 'soft_commit' ? 'Soft Commit' : 'Pending'}</p>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3">
                        <div className="bg-white h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1"><CalendarDays size={12} /><span>{formatDate(booking.booking_date)}</span></div>
                        <div className="flex items-center gap-1"><Clock size={12} /><span>{formatTime(booking.booking_time)}</span></div>
                        <div className="flex items-center gap-1"><Users size={12} /><span>{booking.guest_count} guests</span></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Confirmed Bookings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-white">Confirmed</h2>
            </div>

            {confirmedBookings.length === 0 ? (
              <div className="bg-zinc-900/30 rounded-2xl p-8 text-center">
                <p className="text-zinc-600 text-sm">No confirmed bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedBookings.slice(0, 5).map((booking) => (
                  <Link key={booking.id} href={`/partner/bookings/${booking.id}`} className="block bg-zinc-900/40 rounded-2xl p-5 hover:bg-zinc-900/60 transition-colors duration-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium">{booking.host_name}</h3>
                        <p className="text-zinc-500 text-sm">{booking.table_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">${booking.total_amount}</p>
                        <p className="text-emerald-500/80 text-xs">Confirmed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-3">
                      <div className="flex items-center gap-1"><CalendarDays size={12} /><span>{formatDate(booking.booking_date)}</span></div>
                      <div className="flex items-center gap-1"><Clock size={12} /><span>{formatTime(booking.booking_time)}</span></div>
                      <div className="flex items-center gap-1"><Users size={12} /><span>{booking.guest_count} guests</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
