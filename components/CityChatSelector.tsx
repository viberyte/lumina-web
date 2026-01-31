'use client';
import { useState, useMemo } from 'react';
import { MapPin, ChevronRight, Bell, CheckCircle, Search, X } from 'lucide-react';

interface CityChatSelectorProps {
  onSelectCity: (city: string, state: string) => void;
}

const ALL_CITIES_DATA = [
  { name: 'Manhattan', state: 'New York', status: 'active', areas: 3 },
  { name: 'Brooklyn', state: 'New York', status: 'active', areas: 2 },
  { name: 'Hoboken', state: 'New Jersey', status: 'active', areas: 1 },
  { name: 'Miami', state: 'Florida', status: 'coming', year: '2026 Q1' },
  { name: 'Los Angeles', state: 'California', status: 'coming', year: '2026 Q2' },
  { name: 'Atlanta', state: 'Georgia', status: 'coming', year: '2026 Q2' },
  { name: 'Chicago', state: 'Illinois', status: 'coming', year: '2026 Q3' },
];

const ACTIVE_CITIES = ALL_CITIES_DATA.filter(c => c.status === 'active');
const COMING_SOON = ALL_CITIES_DATA.filter(c => c.status === 'coming');

export default function CityChatSelector({ onSelectCity }: CityChatSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [notifyFor, setNotifyFor] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('lumina_city_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const handleNotifyMe = (cityName: string) => {
    const newNotifyFor = notifyFor.includes(cityName)
      ? notifyFor.filter(c => c !== cityName)
      : [...notifyFor, cityName];
    
    setNotifyFor(newNotifyFor);
    localStorage.setItem('lumina_city_notifications', JSON.stringify(newNotifyFor));
  };

  const filteredCities = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return ALL_CITIES_DATA.filter(city => 
      city.name.toLowerCase().includes(term) || city.state.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm]);

  const renderCard = (city: typeof ALL_CITIES_DATA[0]) => {
    const isNotifying = notifyFor.includes(city.name);
    
    if (city.status === 'active') {
      return (
        <button
          key={city.name}
          onClick={() => onSelectCity(city.name, city.state)}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 border border-zinc-800 hover:border-violet-500 hover:bg-white/10 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-light text-lg">{city.name}</h3>
              <p className="text-zinc-500 text-xs">{city.state}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>
      );
    }

    return (
      <div
        key={city.name}
        className="w-full flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-zinc-600" />
          </div>
          <div className="text-left">
            <h3 className="text-zinc-400 font-light text-lg">{city.name}</h3>
            <p className="text-zinc-600 text-xs">{city.state} • {city.year}</p>
          </div>
        </div>
        <button
          onClick={() => handleNotifyMe(city.name)}
          className={`px-3 py-1.5 rounded-lg text-xs font-light border transition-all ${
            isNotifying
              ? 'bg-violet-600/20 border-violet-500 text-violet-400'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          {isNotifying ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" />
              Notified
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Bell className="w-3 h-3" />
              Notify Me
            </span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-black/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-zinc-800 max-h-[85vh] flex flex-col">
      {/* Fixed Header */}
      <div className="p-6 border-b border-zinc-800/50">
        <h2 className="text-2xl font-light text-white mb-1">Select Location</h2>
        <p className="text-zinc-500 text-sm">Choose your city to explore venues</p>
      </div>

      {/* Search Bar - Fixed */}
      <div className="px-6 py-4 border-b border-zinc-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cities..."
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {searchTerm && filteredCities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-zinc-500 text-xs mb-3">Search Results</p>
            {filteredCities.map(renderCard)}
          </div>
        ) : searchTerm && filteredCities.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No cities found</p>
            <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Cities */}
            <div>
              <p className="text-zinc-500 text-xs mb-3 uppercase tracking-wider">Available Now</p>
              <div className="space-y-2">
                {ACTIVE_CITIES.map(renderCard)}
              </div>
            </div>

            {/* Coming Soon */}
            <div>
              <p className="text-zinc-500 text-xs mb-3 uppercase tracking-wider">Coming Soon</p>
              <div className="space-y-2">
                {COMING_SOON.map(renderCard)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
