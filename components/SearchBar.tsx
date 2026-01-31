'use client';

import { useState } from 'react';
import { Search, X, Music, Wind, MapPin, Calendar, TrendingUp } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
}

interface SearchFilters {
  type?: 'venues' | 'events' | 'both';
  date?: 'tonight' | 'tomorrow' | 'this-weekend' | 'next-weekend' | 'all';
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'both' | 'venues' | 'events'>('both');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const popularSearches = [
    { icon: Music, text: 'Afrobeats', type: 'music' },
    { icon: Music, text: 'Hip-Hop Party', type: 'event' },
    { icon: Wind, text: 'Hookah Lounge', type: 'venue' },
    { icon: Calendar, text: 'This Weekend Events', type: 'event' },
    { icon: MapPin, text: 'Rooftop Brooklyn', type: 'venue' },
    { icon: TrendingUp, text: 'Halloween Party', type: 'event' },
  ];

  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'tonight', label: 'Tonight' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-weekend', label: 'This Weekend' },
    { value: 'next-weekend', label: 'Next Weekend' },
  ];

  const handleSearch = (searchQuery: string, type?: 'venues' | 'events' | 'both') => {
    setQuery(searchQuery);
    onSearch(searchQuery, {
      type: type || activeTab,
      date: dateFilter as any
    });
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery('');
    setDateFilter('all');
    onSearch('', { type: activeTab, date: 'all' });
  };

  return (
    <div className="space-y-3">
      {/* Type Tabs */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
          {(['both', 'venues', 'events'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveTab(type);
                if (query) handleSearch(query, type);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === type
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {type === 'both' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            if (query || activeTab === 'events') {
              handleSearch(query, activeTab);
            }
          }}
          className="h-9 px-4 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-white/20 transition-all"
        >
          {dateOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-black">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={
            activeTab === 'events'
              ? "Search events... 'halloween party', 'afrobeats night'"
              : activeTab === 'venues'
              ? "Search venues... 'hookah lounge', 'rooftop'"
              : "Search venues & events..."
          }
          className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-white/20 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-50">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Popular Searches</p>
          <div className="space-y-1">
            {popularSearches
              .filter((item) => {
                if (activeTab === 'both') return true;
                if (activeTab === 'venues') return item.type === 'venue' || item.type === 'music';
                if (activeTab === 'events') return item.type === 'event';
                return true;
              })
              .map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(item.text)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <item.icon className="w-4 h-4 text-white/60" />
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white">{item.text}</span>
                  <span className="ml-auto text-xs text-white/30 capitalize">{item.type}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
