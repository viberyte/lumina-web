'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, CalendarDays, Sparkles, BarChart3, Settings, TrendingUp, TrendingDown, DollarSign, Eye, Calendar, Users } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/partner/bookings', icon: CalendarDays },
  { name: 'Events', href: '/partner/events', icon: Sparkles },
  { name: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/partner/settings', icon: Settings },
];

export default function PartnerAnalyticsPage() {
  const pathname = usePathname();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const stats = {
    totalRevenue: 12450,
    revenueChange: 23,
    totalBookings: 156,
    bookingsChange: 18,
    profileViews: 4892,
    viewsChange: 45,
    conversionRate: 3.2,
    conversionChange: -2,
  };

  const revenueData = [
    { label: 'Week 1', value: 2400 },
    { label: 'Week 2', value: 3100 },
    { label: 'Week 3', value: 2800 },
    { label: 'Week 4', value: 4150 },
  ];

  const topEvents = [
    { name: 'NYE Countdown 2026', bookings: 124, revenue: 6200 },
    { name: 'Latin Fridays', bookings: 45, revenue: 2250 },
    { name: 'Saturday Night Live', bookings: 38, revenue: 1900 },
    { name: 'Sunday Brunch', bookings: 28, revenue: 1400 },
  ];

  const bookingTypes = [
    { type: 'VIP Table', percentage: 35 },
    { type: 'Guest List', percentage: 40 },
    { type: 'Bottle Service', percentage: 14 },
    { type: 'General', percentage: 11 },
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.value));

  const SidebarNav = () => (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-black hidden md:flex flex-col z-20">
      <div className="p-6 pb-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">Lumina <span className="text-zinc-600 font-normal text-sm">Partner</span></Link>
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

  return (
    <div className="min-h-screen bg-black text-white">
      <SidebarNav />

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/partner/dashboard" className="text-zinc-500 text-sm">Back</Link>
          <h1 className="font-semibold text-lg">Analytics</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="px-5 md:px-10 py-6 pt-20 md:pt-10 max-w-5xl">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">Analytics</h1>
              <p className="text-zinc-500">Track your performance</p>
            </div>
            <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={timeRange === range 
                    ? 'px-4 py-2 rounded-lg text-xs font-medium bg-zinc-800 text-white transition-colors duration-300' 
                    : 'px-4 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-300'
                  }
                >
                  {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                <DollarSign size={14} strokeWidth={1.5} />
                <span>Revenue</span>
              </div>
              <div className="text-3xl font-semibold text-white">${stats.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={12} className="text-emerald-500/80" />
                <span className="text-emerald-500/80 text-xs">+{stats.revenueChange}%</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                <Calendar size={14} strokeWidth={1.5} />
                <span>Bookings</span>
              </div>
              <div className="text-3xl font-semibold text-white">{stats.totalBookings}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={12} className="text-emerald-500/80" />
                <span className="text-emerald-500/80 text-xs">+{stats.bookingsChange}%</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                <Eye size={14} strokeWidth={1.5} />
                <span>Profile Views</span>
              </div>
              <div className="text-3xl font-semibold text-white">{stats.profileViews.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={12} className="text-emerald-500/80" />
                <span className="text-emerald-500/80 text-xs">+{stats.viewsChange}%</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                <Users size={14} strokeWidth={1.5} />
                <span>Conversion</span>
              </div>
              <div className="text-3xl font-semibold text-white">{stats.conversionRate}%</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown size={12} className="text-red-500/80" />
                <span className="text-red-500/80 text-xs">{stats.conversionChange}%</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-zinc-900/50 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-6">Revenue Over Time</h2>
            <div className="flex items-end gap-4 h-48">
              {revenueData.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <div className="text-xs text-zinc-500">${(data.value / 1000).toFixed(1)}k</div>
                  <div className="w-full bg-zinc-800 rounded-lg" style={{ height: (data.value / maxRevenue) * 100 + '%' }} />
                  <span className="text-xs text-zinc-600">{data.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-zinc-900/50 rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-5">Top Events</h2>
              <div className="space-y-4">
                {topEvents.map((event, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{event.name}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">{event.bookings} bookings</div>
                    </div>
                    <div className="text-sm font-medium text-white">${event.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-zinc-900/50 rounded-2xl p-6">
              <h2 className="text-lg font-medium text-white mb-5">Booking Types</h2>
              <div className="space-y-5">
                {bookingTypes.map((type, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">{type.type}</span>
                      <span className="text-xs text-zinc-600">{type.percentage}%</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-1.5">
                      <div className="bg-zinc-600 h-1.5 rounded-full" style={{ width: type.percentage + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
