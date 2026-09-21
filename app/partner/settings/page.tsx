'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { LayoutDashboard, CalendarDays, Sparkles, BarChart3, Settings, Check, Building2, Phone, CreditCard, Bell, User, ExternalLink, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/partner/bookings', icon: CalendarDays },
  { name: 'Events', href: '/partner/events', icon: Sparkles },
  { name: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/partner/settings', icon: Settings },
];

function SettingsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [currentTier, setCurrentTier] = useState('claimed');
  
  const [profile, setProfile] = useState({
    venueName: 'The Grand Lounge',
    description: 'Premier nightlife destination in Manhattan',
    address: '123 Main Street, New York, NY 10001',
    phone: '5551234567',
    website: 'https://thegrandlounge.com',
    instagram: 'thegrandlounge',
  });

  const [payments, setPayments] = useState({
    venmo: '',
    zelle: '',
    cashapp: '',
    acceptCash: true,
    stripeConnected: false,
    stripeAccountId: '',
  });

  const [notifications, setNotifications] = useState({
    newBooking: true,
    bookingReminder: true,
    weeklyReport: false,
    marketingEmails: false,
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/partner/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setProfile(prev => ({ ...prev, ...data.settings.profile }));
          setPayments(prev => ({ ...prev, ...data.settings.payments }));
          if (data.settings.subscription?.tier) {
            setCurrentTier(data.settings.subscription.tier);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#payments') {
      setActiveTab('payments');
    }
    
    const stripeSuccess = searchParams.get('stripe');
    if (stripeSuccess === 'success') {
      setPayments(prev => ({ ...prev, stripeConnected: true }));
      setActiveTab('payments');
      toast.success('Stripe connected successfully!', { style: { background: '#18181b', color: '#fff', border: 'none' }, duration: 3000 });
    }

    const upgradeSuccess = searchParams.get('upgrade');
    const upgradeTier = searchParams.get('tier');
    if (upgradeSuccess === 'success' && upgradeTier) {
      setCurrentTier(upgradeTier);
      setActiveTab('billing');
      toast.success(`Upgraded to ${upgradeTier}!`, { style: { background: '#18181b', color: '#fff', border: 'none' }, duration: 3000 });
    }
  }, [searchParams]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/partner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, payments }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Settings saved', { style: { background: '#18181b', color: '#fff', border: 'none' }, duration: 2000 });
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const response = await fetch('/api/partner/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueName: profile.venueName }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to connect Stripe');
        setConnectingStripe(false);
      }
    } catch (error) {
      toast.error('Failed to connect Stripe');
      setConnectingStripe(false);
    }
  };

  const handleUpgrade = async (targetTier: string) => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/partner/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetTier }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start upgrade');
        setUpgrading(false);
      }
    } catch (error) {
      toast.error('Failed to start upgrade');
      setUpgrading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
    }
    return phone;
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'billing', label: 'Billing', icon: Building2 },
  ];

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
      <Toaster position="top-center" />
      <SidebarNav />

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/partner/dashboard" className="text-zinc-500 text-sm">Back</Link>
          <h1 className="font-semibold text-lg">Settings</h1>
          <button onClick={handleSave} disabled={saving} className="text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="px-5 md:px-10 py-6 pt-20 md:pt-10 max-w-3xl">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">Settings</h1>
              <p className="text-zinc-500">Manage your venue</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="hidden md:block bg-white text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors duration-300 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex gap-2 mb-8 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={isActive 
                    ? 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-white transition-colors duration-300' 
                    : 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-300'
                  }
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Building2 size={18} strokeWidth={1.5} className="text-zinc-500" />
                    <h2 className="text-base font-medium text-white">Venue Information</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Venue Name</label>
                      <input
                        type="text"
                        value={profile.venueName}
                        onChange={(e) => setProfile({ ...profile, venueName: e.target.value })}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                        placeholder="Your venue name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Description</label>
                      <textarea
                        value={profile.description}
                        onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                        rows={3}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm resize-none transition-all duration-300"
                        placeholder="Tell customers about your venue..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Address</label>
                      <input
                        type="text"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                        placeholder="123 Main St, New York, NY"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Phone size={18} strokeWidth={1.5} className="text-zinc-500" />
                    <h2 className="text-base font-medium text-white">Contact</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formatPhone(profile.phone)}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                        placeholder="(555) 555-5555"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Website</label>
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                        placeholder="https://yourvenue.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-500 mb-2">Instagram</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                        <input
                          type="text"
                          value={profile.instagram}
                          onChange={(e) => setProfile({ ...profile, instagram: e.target.value.replace('@', '') })}
                          className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                          placeholder="yourvenue"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                
                {/* Stripe Connect - Card Payments */}
                <div className={payments.stripeConnected ? 'bg-emerald-500/5 rounded-2xl p-6' : 'bg-zinc-900/50 rounded-2xl p-6'}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <CreditCard size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-white">Accept Card Payments</h3>
                        <p className="text-zinc-500 text-xs mt-0.5">Powered by Stripe</p>
                      </div>
                    </div>
                    {payments.stripeConnected && (
                      <span className="text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                    )}
                  </div>
                  
                  {payments.stripeConnected ? (
                    <div className="space-y-4">
                      <div className="bg-zinc-800/30 rounded-xl p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-500">Status</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-500">Platform fee</span>
                          <span className="text-white">5%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Payouts</span>
                          <span className="text-white">Automatic (daily)</span>
                        </div>
                      </div>
                      <a 
                        href="https://dashboard.stripe.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 py-3 rounded-xl text-sm font-medium transition-colors duration-300"
                      >
                        Open Stripe Dashboard
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <div>
                      <p className="text-zinc-500 text-sm mb-4">
                        Accept credit cards, debit cards, and Apple Pay. Money goes directly to your bank account.
                      </p>
                      <div className="bg-zinc-800/30 rounded-xl p-4 mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-500">Platform fee</span>
                          <span className="text-white">5% per transaction</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-500">Stripe fee</span>
                          <span className="text-white">2.9% + 30¢</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">You receive</span>
                          <span className="text-emerald-400">~92% of each payment</span>
                        </div>
                      </div>
                      <button
                        onClick={handleConnectStripe}
                        disabled={connectingStripe}
                        className="w-full bg-white text-black py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {connectingStripe ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect with Stripe'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Free Payment Methods */}
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-base font-medium text-white">Free Payment Methods</h2>
                  </div>
                  <p className="text-zinc-600 text-xs mb-5">No fees - customers pay you directly</p>
                  
                  <div className="space-y-4">
                    <div className="bg-zinc-800/30 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-blue-400 font-semibold text-xs">V</span>
                          </div>
                          <span className="text-sm font-medium text-white">Venmo</span>
                        </div>
                        {payments.venmo && <span className="text-emerald-500/80 text-xs">Connected</span>}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                        <input
                          type="text"
                          value={payments.venmo}
                          onChange={(e) => setPayments({ ...payments, venmo: e.target.value.replace('@', '') })}
                          className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                          placeholder="YourVenmoHandle"
                        />
                      </div>
                    </div>

                    <div className="bg-zinc-800/30 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-purple-400 font-semibold text-xs">Z</span>
                          </div>
                          <span className="text-sm font-medium text-white">Zelle</span>
                        </div>
                        {payments.zelle && <span className="text-emerald-500/80 text-xs">Connected</span>}
                      </div>
                      <input
                        type="text"
                        value={payments.zelle}
                        onChange={(e) => setPayments({ ...payments, zelle: e.target.value })}
                        className="w-full bg-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                        placeholder="Email or phone"
                      />
                    </div>

                    <div className="bg-zinc-800/30 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-emerald-400 font-semibold text-xs">$</span>
                          </div>
                          <span className="text-sm font-medium text-white">Cash App</span>
                        </div>
                        {payments.cashapp && <span className="text-emerald-500/80 text-xs">Connected</span>}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">$</span>
                        <input
                          type="text"
                          value={payments.cashapp}
                          onChange={(e) => setPayments({ ...payments, cashapp: e.target.value.replace('$', '') })}
                          className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all duration-300"
                          placeholder="YourCashTag"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => setPayments({ ...payments, acceptCash: !payments.acceptCash })}
                      className="w-full flex items-center justify-between p-5 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-700 rounded-lg flex items-center justify-center">
                          <span className="text-zinc-400 text-sm">$</span>
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">Cash at Door</div>
                          <div className="text-zinc-600 text-xs">Accept cash payments</div>
                        </div>
                      </div>
                      <div className={payments.acceptCash ? 'w-11 h-6 rounded-full bg-white p-0.5' : 'w-11 h-6 rounded-full bg-zinc-700 p-0.5'}>
                        <div className={payments.acceptCash ? 'w-5 h-5 bg-black rounded-full ml-5 transition-all duration-300' : 'w-5 h-5 bg-zinc-500 rounded-full ml-0 transition-all duration-300'} />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell size={18} strokeWidth={1.5} className="text-zinc-500" />
                    <h2 className="text-base font-medium text-white">Notifications</h2>
                  </div>
                  
                  <div className="space-y-2">
                    {[
                      { key: 'newBooking', label: 'New Bookings', desc: 'Get notified when someone books' },
                      { key: 'bookingReminder', label: 'Reminders', desc: 'Reminder before bookings' },
                      { key: 'weeklyReport', label: 'Weekly Report', desc: 'Performance summary' },
                      { key: 'marketingEmails', label: 'Updates', desc: 'Tips and product updates' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800/30 transition-colors duration-300"
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">{item.label}</div>
                          <div className="text-zinc-600 text-xs">{item.desc}</div>
                        </div>
                        <div className={notifications[item.key as keyof typeof notifications] ? 'w-11 h-6 rounded-full bg-white p-0.5' : 'w-11 h-6 rounded-full bg-zinc-700 p-0.5'}>
                          <div className={notifications[item.key as keyof typeof notifications] ? 'w-5 h-5 bg-black rounded-full ml-5 transition-all duration-300' : 'w-5 h-5 bg-zinc-500 rounded-full ml-0 transition-all duration-300'} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                
                {/* Current Plan Status */}
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Current Plan</p>
                      <h2 className="text-2xl font-semibold text-white capitalize">{currentTier}</h2>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentTier === 'elite' ? 'bg-violet-500/20 text-violet-400' :
                      currentTier === 'spotlight' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-zinc-700 text-zinc-400'
                    }`}>
                      {currentTier === 'claimed' ? 'Free' : 'Active'}
                    </div>
                  </div>
                </div>

                {/* Pricing Tiers */}
                <div className="grid gap-4">
                  
                  {/* Claimed - Free */}
                  <div className={`rounded-2xl p-6 ${currentTier === 'claimed' ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-900/30'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Claimed</h3>
                        <p className="text-zinc-500 text-xs mt-1">Basic features to get started</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-semibold text-white">Free</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['Claim your venue', 'Edit venue profile', 'Post basic events', 'Get discovered'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check size={12} className="text-zinc-500" />
                          <span className="text-zinc-500">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {currentTier === 'claimed' && (
                      <div className="text-center text-zinc-500 text-sm py-2">Current Plan</div>
                    )}
                  </div>

                  {/* Spotlight - $25/mo */}
                  <div className={`rounded-2xl p-6 ${currentTier === 'spotlight' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-zinc-900/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Spotlight</h3>
                        <p className="text-zinc-500 text-xs mt-1">Grow your presence</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-semibold text-white">$25</span>
                        <span className="text-zinc-500">/mo</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['Everything in Claimed', 'Event promotion boost', 'Happy Hour placement', 'Daily Specials placement', 'Continue the Night flow', 'Basic analytics'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check size={12} className="text-blue-400" />
                          <span className="text-zinc-400">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {currentTier === 'spotlight' ? (
                      <div className="text-center text-blue-400 text-sm py-2">Current Plan</div>
                    ) : currentTier === 'claimed' ? (
                      <button 
                        onClick={() => handleUpgrade('spotlight')}
                        disabled={upgrading}
                        className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {upgrading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : 'Upgrade to Spotlight'}
                      </button>
                    ) : null}
                  </div>

                  {/* Elite - $44.99/mo */}
                  <div className={`rounded-2xl p-6 ${currentTier === 'elite' ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-zinc-900/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">Elite</h3>
                          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">Popular</span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">Everything you need to succeed</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-semibold text-white">$44.99</span>
                        <span className="text-zinc-500">/mo</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['Everything in Spotlight', 'Table bookings', 'Accept payments', 'VIP section management', 'Advanced analytics', 'Priority placement'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check size={12} className="text-violet-400" />
                          <span className="text-zinc-400">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {currentTier === 'elite' ? (
                      <div className="text-center text-violet-400 text-sm py-2">Current Plan</div>
                    ) : (
                      <button 
                        onClick={() => handleUpgrade('elite')}
                        disabled={upgrading}
                        className="w-full bg-violet-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {upgrading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : 'Upgrade to Elite'}
                      </button>
                    )}
                  </div>

                </div>

                {/* Danger Zone */}
                <div className="bg-zinc-900/30 rounded-2xl p-6">
                  <h2 className="text-sm font-medium text-red-400/80 mb-1">Danger Zone</h2>
                  <p className="text-zinc-600 text-xs mb-4">Once deleted, there is no going back.</p>
                  <button className="text-red-400/80 hover:text-red-400 text-sm font-medium transition-colors duration-300">
                    Delete Account
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

export default function PartnerSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SettingsContent />
    </Suspense>
  );
}
