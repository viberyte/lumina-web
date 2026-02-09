'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { LayoutDashboard, CalendarDays, Sparkles, BarChart3, Settings, Plus, X, Users, Eye, Music, Clock, MapPin, ChevronRight, Home, Building2, Trash2, Check, Share2, Copy, Link2 } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/partner/bookings', icon: CalendarDays },
  { name: 'Events', href: '/partner/events', icon: Sparkles },
  { name: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/partner/settings', icon: Settings },
];

const GENRES = [
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'house', label: 'House' },
  { id: 'latin', label: 'Latin' },
  { id: 'afrobeats', label: 'Afrobeats' },
  { id: 'rnb', label: 'R&B' },
  { id: 'edm', label: 'EDM' },
  { id: 'reggae', label: 'Reggae' },
  { id: 'live', label: 'Live Music' },
  { id: 'open', label: 'Open Format' },
];

type Section = {
  id: string;
  name: string;
  tableCount: number;
  capacity: number;
  minSpend: number;
  enabled: boolean;
};

type Venue = {
  id: number;
  name: string;
  address: string;
  isHome: boolean;
  sections: Section[];
};

type EventSection = {
  sectionId: string;
  name: string;
  tableCount: number;
  capacity: number;
  minSpend: number;
  enabled: boolean;
};

type Event = {
  id: number;
  title: string;
  venueId: number;
  venueName: string;
  date: string;
  time: string;
  description: string;
  genre: string;
  sections: EventSection[];
  guestListEnabled: boolean;
  guestListPrice: number;
  status: 'draft' | 'published';
  attendees: number;
  views: number;
};

export default function PartnerEventsPage() {
  const pathname = usePathname();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'draft'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showVenueBuilder, setShowVenueBuilder] = useState(false);
  
  const [venues, setVenues] = useState<Venue[]>([
    {
      id: 1,
      name: 'The Grand Lounge',
      address: '123 Main St, New York, NY',
      isHome: true,
      sections: [
        { id: 'vip-1', name: 'VIP Tables', tableCount: 4, capacity: 8, minSpend: 500, enabled: true },
        { id: 'booth-1', name: 'Booths', tableCount: 6, capacity: 6, minSpend: 300, enabled: true },
      ]
    },
    {
      id: 2,
      name: 'Sky Bar NYC',
      address: '456 Broadway, New York, NY',
      isHome: false,
      sections: [
        { id: 'vip-2', name: 'Rooftop VIP', tableCount: 3, capacity: 10, minSpend: 1000, enabled: true },
        { id: 'lounge-2', name: 'Lounge Seating', tableCount: 8, capacity: 4, minSpend: 200, enabled: true },
      ]
    }
  ]);

  const [events, setEvents] = useState<Event[]>([
    {
      id: 1,
      title: 'NYE Countdown 2026',
      venueId: 1,
      venueName: 'The Grand Lounge',
      date: '2025-12-31',
      time: '21:00',
      description: 'Ring in the new year',
      genre: 'hiphop',
      sections: [
        { sectionId: 'vip-1', name: 'VIP Tables', tableCount: 4, capacity: 8, minSpend: 2000, enabled: true },
      ],
      guestListEnabled: true,
      guestListPrice: 50,
      status: 'published',
      attendees: 124,
      views: 892
    },
    {
      id: 2,
      title: 'Latin Fridays',
      venueId: 1,
      venueName: 'The Grand Lounge',
      date: '2025-12-27',
      time: '22:00',
      description: 'Weekly Latin night',
      genre: 'latin',
      sections: [
        { sectionId: 'vip-1', name: 'VIP Tables', tableCount: 4, capacity: 8, minSpend: 500, enabled: true },
      ],
      guestListEnabled: true,
      guestListPrice: 0,
      status: 'published',
      attendees: 45,
      views: 234
    },
  ]);

  const [newVenue, setNewVenue] = useState({ name: '', address: '', sections: [] as Section[] });
  const [newEvent, setNewEvent] = useState({
    venueId: 0,
    title: '',
    date: '',
    time: '',
    description: '',
    genre: '',
    sections: [] as EventSection[],
    guestListEnabled: true,
    guestListPrice: 0,
  });

  useEffect(() => {
    if (showCreateModal || selectedEvent || showVenueBuilder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCreateModal, selectedEvent, showVenueBuilder]);

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'draft') return e.status === 'draft';
    return e.status === 'published';
  });

  const resetCreateForm = () => {
    setNewEvent({ venueId: 0, title: '', date: '', time: '', description: '', genre: '', sections: [], guestListEnabled: true, guestListPrice: 0 });
    setCreateStep(1);
  };

  const handleSelectVenue = (venueId: number) => {
    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      setNewEvent({
        ...newEvent,
        venueId: venue.id,
        sections: venue.sections.map(s => ({ sectionId: s.id, name: s.name, tableCount: s.tableCount, capacity: s.capacity, minSpend: s.minSpend, enabled: true })),
      });
      setCreateStep(2);
    }
  };

  const handleAddSection = () => {
    setNewVenue({ ...newVenue, sections: [...newVenue.sections, { id: 'section-' + Date.now(), name: '', tableCount: 1, capacity: 6, minSpend: 0, enabled: true }] });
  };

  const handleSaveVenue = () => {
    const venue: Venue = { id: Date.now(), name: newVenue.name, address: newVenue.address, isHome: venues.length === 0, sections: newVenue.sections };
    setVenues([...venues, venue]);
    setShowVenueBuilder(false);
    setNewVenue({ name: '', address: '', sections: [] });
    handleSelectVenue(venue.id);
    toast.success('Venue saved', { style: { background: '#18181b', color: '#fff', border: 'none' } });
  };

  const handleCreateEvent = (asDraft: boolean) => {
    const venue = venues.find(v => v.id === newEvent.venueId);
    const event: Event = {
      id: Date.now(),
      title: newEvent.title,
      venueId: newEvent.venueId,
      venueName: venue?.name || '',
      date: newEvent.date,
      time: newEvent.time,
      description: newEvent.description,
      genre: newEvent.genre,
      sections: newEvent.sections.filter(s => s.enabled),
      guestListEnabled: newEvent.guestListEnabled,
      guestListPrice: newEvent.guestListPrice,
      status: asDraft ? 'draft' : 'published',
      attendees: 0,
      views: 0,
    };
    setEvents([event, ...events]);
    setShowCreateModal(false);
    resetCreateForm();
    toast.success(asDraft ? 'Saved as draft' : 'Event published', { style: { background: '#18181b', color: '#fff', border: 'none' } });
  };

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (t: string) => {
    if (typeof t !== 'string') return ''; const parts = t.split(':'); if (parts.length < 2) return t; const [h, m] = parts.map(Number);
    return (h % 12 || 12) + ':' + m.toString().padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
  };

  const generateNightLink = (event: Event) => {
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `https://lumina.viberyte.com/e/${slug}-${event.id}`;
  };

  const copyNightLink = async (event: Event, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = generateNightLink(event);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('NightLink copied!', { style: { background: '#18181b', color: '#fff', border: 'none' }, icon: '🔗' });
    } catch {
      toast.error('Failed to copy', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    }
  };

  const homeVenue = venues.find(v => v.isHome);

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
      <Toaster position="top-center" />
      <SidebarNav />

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/partner/dashboard" className="text-zinc-500 text-sm">Back</Link>
          <h1 className="font-semibold text-lg">Events</h1>
          <button onClick={() => setShowCreateModal(true)} className="text-white text-sm font-medium">New</button>
        </div>
      </header>

      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="px-5 md:px-10 py-6 pt-20 md:pt-10 max-w-4xl">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">Events</h1>
              <p className="text-zinc-500">Create and manage your events</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="hidden md:flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors duration-300">
              <Plus size={16} strokeWidth={2} />
              Create Event
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex gap-2 mb-8">
            {(['all', 'upcoming', 'draft'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-white transition-colors duration-300' : 'px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-300'}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </motion.div>

          {filteredEvents.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/30 rounded-2xl p-12 text-center">
              <p className="text-zinc-500 text-sm mb-4">No events found</p>
              <button onClick={() => setShowCreateModal(true)} className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">Create Event</button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event, idx) => (
                <motion.div 
                  key={event.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedEvent(event)} 
                  className="bg-zinc-900/50 rounded-2xl p-5 cursor-pointer hover:bg-zinc-900/70 transition-colors duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">{event.title}</h3>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <MapPin size={12} strokeWidth={1.5} />
                        <span>{event.venueName}</span>
                      </div>
                    </div>
                    <span className={event.status === 'published' ? 'text-xs text-emerald-400' : 'text-xs text-amber-400'}>
                      {event.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-5 text-xs text-zinc-500 mb-4">
                    <div className="flex items-center gap-1.5"><CalendarDays size={12} /><span>{formatDate(event.date)}</span></div>
                    <div className="flex items-center gap-1.5"><Clock size={12} /><span>{formatTime(event.time)}</span></div>
                    <div className="flex items-center gap-1.5"><Music size={12} /><span>{GENRES.find(g => g.id === event.genre)?.label}</span></div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {event.sections.map((s) => (
                      <span key={s.sectionId} className="text-xs bg-zinc-800/50 text-zinc-400 px-2.5 py-1 rounded-lg">{s.name} ${s.minSpend}</span>
                    ))}
                    {event.guestListEnabled && <span className="text-xs bg-zinc-800/50 text-zinc-400 px-2.5 py-1 rounded-lg">Guest List {event.guestListPrice > 0 ? '$' + event.guestListPrice : 'Free'}</span>}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800/30 flex items-center gap-5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <Users size={12} />
                      <span>{event.attendees} attending</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <Eye size={12} />
                      <span>{event.views} views</span>
                    </div>
                    <button onClick={(e) => copyNightLink(event, e)} className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg">
                      <Link2 size={12} />
                      <span>NightLink</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); resetCreateForm(); } }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-zinc-900 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Create Event</h2>
                  <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((step) => (<div key={step} className={step <= createStep ? 'flex-1 h-1 rounded-full bg-white' : 'flex-1 h-1 rounded-full bg-zinc-800'} />))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <AnimatePresence mode="wait">
                  {createStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      <p className="text-zinc-500 text-sm mb-4">Select a venue</p>
                      {homeVenue && (
                        <button onClick={() => handleSelectVenue(homeVenue.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left">
                          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Home size={20} className="text-emerald-400" /></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{homeVenue.name}</div>
                            <div className="text-xs text-zinc-500">{homeVenue.address}</div>
                          </div>
                          <ChevronRight size={18} className="text-zinc-600" />
                        </button>
                      )}
                      {venues.filter(v => !v.isHome).map((venue) => (
                        <button key={venue.id} onClick={() => handleSelectVenue(venue.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left">
                          <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center"><Building2 size={20} className="text-zinc-400" /></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{venue.name}</div>
                            <div className="text-xs text-zinc-500">{venue.address}</div>
                          </div>
                          <ChevronRight size={18} className="text-zinc-600" />
                        </button>
                      ))}
                      <button onClick={() => setShowVenueBuilder(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors text-left">
                        <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center"><Plus size={20} className="text-zinc-500" /></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">Add New Venue</div>
                          <div className="text-xs text-zinc-600">Create venue with sections</div>
                        </div>
                      </button>
                    </motion.div>
                  )}

                  {createStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <button onClick={() => setCreateStep(1)} className="flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors">
                        <MapPin size={14} />
                        <span>{venues.find(v => v.id === newEvent.venueId)?.name}</span>
                        <span className="text-zinc-700">· Change</span>
                      </button>

                      <div>
                        <label className="block text-sm text-zinc-500 mb-2">Event Title</label>
                        <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all" placeholder="NYE Party 2026" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-zinc-500 mb-2">Date</label>
                          <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" />
                        </div>
                        <div>
                          <label className="block text-sm text-zinc-500 mb-2">Time</label>
                          <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-500 mb-3">Genre</label>
                        <div className="grid grid-cols-3 gap-2">
                          {GENRES.map((g) => (
                            <button key={g.id} onClick={() => setNewEvent({ ...newEvent, genre: g.id })} className={newEvent.genre === g.id ? 'p-2.5 rounded-xl text-xs font-medium bg-white text-black' : 'p-2.5 rounded-xl text-xs font-medium bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 transition-colors'}>{g.label}</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {createStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <p className="text-zinc-500 text-sm">Set pricing for this event</p>
                      
                      {newEvent.sections.map((section, idx) => (
                        <div key={section.sectionId} className="bg-zinc-800/30 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => { const u = [...newEvent.sections]; u[idx].enabled = !u[idx].enabled; setNewEvent({ ...newEvent, sections: u }); }} className={section.enabled ? 'w-6 h-6 rounded-lg bg-white flex items-center justify-center' : 'w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center'}>
                                {section.enabled && <Check size={14} className="text-black" />}
                              </button>
                              <span className={section.enabled ? 'text-sm font-medium text-white' : 'text-sm font-medium text-zinc-600'}>{section.name}</span>
                            </div>
                            <span className="text-xs text-zinc-600">{section.tableCount} tables</span>
                          </div>
                          {section.enabled && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-500">Min spend</span>
                              <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                <input type="number" value={section.minSpend} onChange={(e) => { const u = [...newEvent.sections]; u[idx].minSpend = Number(e.target.value); setNewEvent({ ...newEvent, sections: u }); }} className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="bg-zinc-800/30 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setNewEvent({ ...newEvent, guestListEnabled: !newEvent.guestListEnabled })} className={newEvent.guestListEnabled ? 'w-6 h-6 rounded-lg bg-white flex items-center justify-center' : 'w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center'}>
                              {newEvent.guestListEnabled && <Check size={14} className="text-black" />}
                            </button>
                            <span className={newEvent.guestListEnabled ? 'text-sm font-medium text-white' : 'text-sm font-medium text-zinc-600'}>Guest List</span>
                          </div>
                        </div>
                        {newEvent.guestListEnabled && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500">Price</span>
                            <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                              <input type="number" value={newEvent.guestListPrice} onChange={(e) => setNewEvent({ ...newEvent, guestListPrice: Number(e.target.value) })} className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="0 = Free" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 pt-4 border-t border-zinc-800/30">
                <div className="flex gap-3">
                  {createStep > 1 && <button onClick={() => setCreateStep(createStep - 1)} className="flex-1 bg-zinc-800 text-zinc-300 py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">Back</button>}
                  {createStep === 2 && <button onClick={() => setCreateStep(3)} disabled={!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.genre} className="flex-1 bg-white text-black py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50">Continue</button>}
                  {createStep === 3 && (
                    <>
                      <button onClick={() => handleCreateEvent(true)} className="flex-1 bg-zinc-800 text-zinc-300 py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">Save Draft</button>
                      <button onClick={() => handleCreateEvent(false)} className="flex-1 bg-white text-black py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">Publish</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Venue Builder Modal */}
      <AnimatePresence>
        {showVenueBuilder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowVenueBuilder(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-zinc-900 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 pb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Add Venue</h2>
                  <button onClick={() => setShowVenueBuilder(false)} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Venue Name</label>
                  <input type="text" value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Club XYZ" />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Address</label>
                  <input type="text" value={newVenue.address} onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })} className="w-full bg-zinc-800/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="123 Main St, City" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-zinc-500">Sections</label>
                    <button onClick={handleAddSection} className="text-xs text-white bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">+ Add</button>
                  </div>
                  
                  {newVenue.sections.length === 0 ? (
                    <div className="bg-zinc-800/30 rounded-2xl p-8 text-center">
                      <p className="text-zinc-600 text-sm">No sections yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newVenue.sections.map((s, idx) => (
                        <div key={s.id} className="bg-zinc-800/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <input type="text" value={s.name} onChange={(e) => { const u = [...newVenue.sections]; u[idx].name = e.target.value; setNewVenue({ ...newVenue, sections: u }); }} className="flex-1 bg-zinc-800/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" placeholder="Section name" />
                            <button onClick={() => setNewVenue({ ...newVenue, sections: newVenue.sections.filter((_, i) => i !== idx) })} className="p-2 text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-zinc-600 block mb-1">Tables</label><input type="number" value={s.tableCount} onChange={(e) => { const u = [...newVenue.sections]; u[idx].tableCount = Number(e.target.value); setNewVenue({ ...newVenue, sections: u }); }} className="w-full bg-zinc-800/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" /></div>
                            <div><label className="text-xs text-zinc-600 block mb-1">Capacity</label><input type="number" value={s.capacity} onChange={(e) => { const u = [...newVenue.sections]; u[idx].capacity = Number(e.target.value); setNewVenue({ ...newVenue, sections: u }); }} className="w-full bg-zinc-800/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" /></div>
                            <div><label className="text-xs text-zinc-600 block mb-1">Min $</label><input type="number" value={s.minSpend} onChange={(e) => { const u = [...newVenue.sections]; u[idx].minSpend = Number(e.target.value); setNewVenue({ ...newVenue, sections: u }); }} className="w-full bg-zinc-800/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 pt-4 border-t border-zinc-800/30">
                <button onClick={handleSaveVenue} disabled={!newVenue.name || !newVenue.address} className="w-full bg-white text-black py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50">Save Venue</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-zinc-900 rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedEvent.title}</h2>
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mt-1"><MapPin size={14} /><span>{selectedEvent.venueName}</span></div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-zinc-800/50 rounded-2xl p-4 text-center"><div className="text-2xl font-semibold text-white">{selectedEvent.attendees}</div><div className="text-zinc-600 text-xs">Attending</div></div>
                <div className="bg-zinc-800/50 rounded-2xl p-4 text-center"><div className="text-2xl font-semibold text-white">{selectedEvent.views}</div><div className="text-zinc-600 text-xs">Views</div></div>
              </div>
              
              <div className="bg-zinc-800/30 rounded-2xl p-5 mb-6 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Date</span><span className="text-white">{formatDate(selectedEvent.date)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Time</span><span className="text-white">{formatTime(selectedEvent.time)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Genre</span><span className="text-white">{GENRES.find(g => g.id === selectedEvent.genre)?.label}</span></div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-white mb-3">Sections</h3>
                <div className="space-y-2">
                  {selectedEvent.sections.map((s) => (<div key={s.sectionId} className="flex justify-between bg-zinc-800/30 rounded-xl p-4"><span className="text-sm text-zinc-400">{s.name}</span><span className="text-sm text-white">${s.minSpend} min</span></div>))}
                  {selectedEvent.guestListEnabled && <div className="flex justify-between bg-zinc-800/30 rounded-xl p-4"><span className="text-sm text-zinc-400">Guest List</span><span className="text-sm text-white">{selectedEvent.guestListPrice > 0 ? '$' + selectedEvent.guestListPrice : 'Free'}</span></div>}
                </div>
              </div>
              
              {/* NightLink Share */}
              <div className="bg-zinc-800/30 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">NightLink</h3>
                  <Share2 size={14} className="text-zinc-500" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-800/50 rounded-xl px-4 py-3 mb-3">
                  <Link2 size={14} className="text-zinc-500 flex-shrink-0" />
                  <span className="text-xs text-zinc-400 truncate flex-1">{generateNightLink(selectedEvent)}</span>
                </div>
                <button onClick={() => copyNightLink(selectedEvent)} className="w-full bg-white text-black py-3 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                  <Copy size={14} />
                  Copy NightLink
                </button>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-zinc-800 text-white py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">Edit Event</button>
                <button onClick={() => { setEvents(events.filter(e => e.id !== selectedEvent.id)); setSelectedEvent(null); toast('Event deleted', { style: { background: '#18181b', color: '#71717a', border: 'none' } }); }} className="w-full text-red-400/80 hover:text-red-400 py-2 text-sm font-medium transition-colors">Delete Event</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav />
    </div>
  );
}
