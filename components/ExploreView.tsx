'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, ChevronDown, X, Search, SlidersHorizontal } from 'lucide-react';
import ExploreHeader from '@/components/ExploreHeader';
import VenueModal from '@/components/VenueModal';

interface ExploreViewProps {
  city: string;
  onBack: () => void;
  onFlowExperience: (venue: any) => void;
}

export default function ExploreView({ city: initialCity, onBack, onFlowExperience }: ExploreViewProps) {
  const [mainTab, setMainTab] = useState<'dining' | 'lounges' | 'events'>('dining');
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    price?: string[];
    cuisine?: string[];
    vibe?: string[];
  }>({});
  
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['initial']);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCity]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = entry.target.getAttribute('data-category-id');
            if (categoryId && !visibleCategories.includes(categoryId)) {
              setVisibleCategories(prev => [...prev, categoryId]);
            }
          }
        });
      },
      { rootMargin: '200px' }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [visibleCategories]);

  const loadData = async () => {
    const cacheKey = `venues_${selectedCity}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    const now = Date.now();
    
    if (cached && cacheTime && (now - parseInt(cacheTime)) < 86400000) {
      const cachedData = JSON.parse(cached);
      setVenues(cachedData.venues || []);
      setEvents(cachedData.events || []);
      setLoading(false);
      console.log('📦 Loaded from cache:', cachedData.venues?.length, 'venues');
      return;
    }
    
    setLoading(true);
    try {
      let cityQuery = selectedCity;
      if (selectedCity === 'New York') {
        cityQuery = 'New York,Manhattan,Brooklyn,Queens,Bronx,Harlem,Williamsburg,East Village,West Village,SoHo,Tribeca,Upper East Side,Upper West Side';
      }
      
      const venuesRes = await fetch(`/api/venues?city=${cityQuery}&limit=1000`);
      const venuesData = await venuesRes.json();
      console.log('✅ API returned:', venuesData.venues?.length, 'venues');
      setVenues(venuesData.venues || []);
      setLoading(false);

      const eventsRes = await fetch(`/api/events?city=${cityQuery}`);
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);
      
      localStorage.setItem(cacheKey, JSON.stringify({
        venues: venuesData.venues,
        events: eventsData.events
      }));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
      
      setTimeout(async () => {
        const moreVenuesRes = await fetch(`/api/venues?city=${cityQuery}&limit=2000&offset=1000`);
        const moreVenuesData = await moreVenuesRes.json();
        const allVenues = [...venuesData.venues, ...moreVenuesData.venues];
        setVenues(allVenues);
        console.log('🔄 Lazy loaded total:', allVenues.length, 'venues');
        
        localStorage.setItem(cacheKey, JSON.stringify({
          venues: allVenues,
          events: eventsData.events
        }));
      }, 1000);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const filteredVenues = useMemo(() => {
    let filtered = venues;
    console.log('🔍 Filtering', venues.length, 'total venues');
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.name?.toLowerCase().includes(query) ||
        v.cuisine_primary?.toLowerCase().includes(query) ||
        v.neighborhood?.toLowerCase().includes(query)
      );
    }
    
    if (activeFilters.price?.length) {
      filtered = filtered.filter(v => activeFilters.price!.includes(v.price_tier));
    }
    
    if (activeFilters.cuisine?.length) {
      filtered = filtered.filter(v => activeFilters.cuisine!.includes(v.cuisine_primary));
    }
    
    if (activeFilters.vibe?.length) {
      filtered = filtered.filter(v => {
        const vibeTags = Array.isArray(v.vibe_tags) ? v.vibe_tags : 
          (typeof v.vibe_tags === 'string' ? JSON.parse(v.vibe_tags || '[]') : []);
        return activeFilters.vibe!.some(f => vibeTags.includes(f));
      });
    }
    
    console.log('✅ After filtering:', filtered.length, 'venues');
    return filtered;
  }, [venues, searchQuery, activeFilters]);

  const getCuisines = (v: any) => {
    if (Array.isArray(v.cuisine_primary)) return v.cuisine_primary;
    if (typeof v.cuisine_primary === 'string') {
      try {
        const parsed = JSON.parse(v.cuisine_primary);
        return Array.isArray(parsed) ? parsed : [v.cuisine_primary];
      } catch {
        return [v.cuisine_primary];
      }
    }
    return [];
  };

  const diningCategories = useMemo(() => {
    const dining = filteredVenues.filter(v => v.category === 'dining');
    console.log('🍽️ Dining venues:', dining.length);
    
    return {
      trending: dining.filter(v => v.is_trending).slice(0, 50),
      japanese: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes('japanese'))).slice(0, 50),
      italian: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes('italian'))).slice(0, 50),
      caribbean: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes('caribbean'))).slice(0, 50),
      mexican: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes('mexican'))).slice(0, 50),
      american: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes('american'))).slice(0, 50),
      brunch: dining.filter(v => {
        const tags = Array.isArray(v.vibe_tags) ? v.vibe_tags : 
          (typeof v.vibe_tags === 'string' ? JSON.parse(v.vibe_tags || '[]') : []);
        return tags.includes('brunch');
      }).slice(0, 50),
      dateNight: dining.filter(v => {
        const tags = Array.isArray(v.mood_tags) ? v.mood_tags : 
          (typeof v.mood_tags === 'string' ? JSON.parse(v.mood_tags || '[]') : []);
        return tags.includes('date night');
      }).slice(0, 50),
      soulFood: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("soul") || c.toLowerCase().includes("southern"))).slice(0, 50),
      upscale: dining.filter(v => v.price_tier === "$$$" || v.price_tier === "$$$$").slice(0, 50),
      asian: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("asian") || c.toLowerCase().includes("chinese") || c.toLowerCase().includes("thai") || c.toLowerCase().includes("korean"))).slice(0, 50),
      seafood: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("seafood") || c.toLowerCase().includes("fish"))).slice(0, 50),
      french: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("french"))).slice(0, 50),
      trendy: dining.filter(v => v.is_trending || (v.vibe_tags && JSON.stringify(v.vibe_tags).toLowerCase().includes("trendy"))).slice(0, 50),
      african: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("african") || c.toLowerCase().includes("ethiopian"))).slice(0, 50),
      chinese: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("chinese"))).slice(0, 50),
      thai: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("thai"))).slice(0, 50),
      korean: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("korean"))).slice(0, 50),
      vegan: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("vegan") || c.toLowerCase().includes("vegetarian"))).slice(0, 50),
      pizza: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("pizza"))).slice(0, 50),
      steakhouse: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("steak") || c.toLowerCase().includes("steakhouse"))).slice(0, 50),
      sushi: dining.filter(v => getCuisines(v).some((c: string) => c.toLowerCase().includes("sushi"))).slice(0, 50),
    };
  }, [filteredVenues]);



  const eventCategories = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      all: events.slice(0, 100),
      tonight: events.filter(e => e.date?.startsWith(today)).slice(0, 50),
      thisWeek: events.filter(e => {
        const eventDate = new Date(e.date);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return eventDate >= new Date() && eventDate <= weekFromNow;
      }).slice(0, 50),
      weekend: events.filter(e => {
        const eventDate = new Date(e.date);
        const day = eventDate.getDay();
        return day === 5 || day === 6 || day === 0;
      }).slice(0, 50),
      afrobeats: events.filter(e => 
        e.music_genre?.toLowerCase().includes('afrobeats') || 
        e.music_genre?.toLowerCase().includes('amapiano')
      ).slice(0, 50),
      hiphop: events.filter(e => 
        e.music_genre?.toLowerCase().includes('hip') || 
        e.music_genre?.toLowerCase().includes('r&b')
      ).slice(0, 50),
      latin: events.filter(e => 
        e.music_genre?.toLowerCase().includes('latin') || 
        e.music_genre?.toLowerCase().includes('reggaeton')
      ).slice(0, 50),
      nightlife: events.filter(e => 
        e.music_genre?.toLowerCase().includes('nightlife') || 
        e.venue_name?.toLowerCase().includes('tao')
      ).slice(0, 50),
      upscale: events.filter(e => 
        e.venue_name?.toLowerCase().includes('tao') || 
        e.venue_name?.toLowerCase().includes('lavo') || 
        e.venue_name?.toLowerCase().includes('marquee')
      ).slice(0, 50),
      house: events.filter(e => 
        e.music_genre?.toLowerCase().includes("house") || 
        e.music_genre?.toLowerCase().includes("edm")
      ).slice(0, 50)
    };
  }, [events]);

  const loungeCategories = useMemo(() => {
    const lounges = filteredVenues.filter(v => v.category === 'nightlife' || v.category === 'lounges');
    console.log('🍸 Lounge venues:', lounges.length);

    const getTags = (v: any, field: string) => {
      const val = v[field];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const getSpecialFeatures = (v: any) => {
      if (!v.special_features) return {};
      if (typeof v.special_features === 'object') return v.special_features;
      try { return JSON.parse(v.special_features); } catch { return {}; }
    };

    // Use lounge_type field for primary categorization (from AI enrichment)
    const byLoungeType = (type: string) =>
      lounges.filter(v => v.lounge_type?.toLowerCase().includes(type.toLowerCase())).slice(0, 50);

    return {
      all: lounges.slice(0, 50),
      // Primary lounge types from AI enrichment
      upscale: byLoungeType('upscale-lounge').length > 0
        ? byLoungeType('upscale-lounge')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['elegant', 'upscale', 'sophisticated'].includes(t.toLowerCase()))).slice(0, 50),
      cocktailLounge: byLoungeType('cocktail-lounge').length > 0
        ? byLoungeType('cocktail-lounge')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['cocktail', 'mixology', 'craft cocktails'].includes(t.toLowerCase()))).slice(0, 50),
      speakeasy: byLoungeType('speakeasy').length > 0
        ? byLoungeType('speakeasy')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['speakeasy', 'hidden', 'secret'].includes(t.toLowerCase()))).slice(0, 50),
      hookah: lounges.filter(v => {
        // Check lounge_type first, then special_features
        if (v.lounge_type?.toLowerCase().includes('hookah')) return true;
        const features = getSpecialFeatures(v);
        if (features.has_hookah === true) return true;
        return getTags(v, 'vibe_tags').some((t: string) => ['hookah', 'shisha'].includes(t.toLowerCase()));
      }).slice(0, 50),
      rooftop: [...byLoungeType('rooftop'), ...lounges.filter(v =>
        getTags(v, 'vibe_tags').some((t: string) => ['rooftop', 'outdoor', 'terrace'].includes(t.toLowerCase())) &&
        !v.lounge_type?.toLowerCase().includes('rooftop')
      )].slice(0, 50),
      afrobeats: byLoungeType('afrobeats'),
      jazzLounge: byLoungeType('jazz'),
      wineBar: byLoungeType('wine-bar').length > 0
        ? byLoungeType('wine-bar')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['wine bar', 'wine', 'sommelier'].includes(t.toLowerCase()))).slice(0, 50),
      sportsBar: byLoungeType('sports-bar').length > 0
        ? byLoungeType('sports-bar')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['sports bar', 'sports', 'tv', 'games'].includes(t.toLowerCase()))).slice(0, 50),
      diveBar: byLoungeType('dive-bar'),
      casual: byLoungeType('casual-lounge').length > 0
        ? byLoungeType('casual-lounge')
        : lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['relaxed', 'chill', 'casual'].includes(t.toLowerCase()))).slice(0, 50),
      upscaleClub: byLoungeType('upscale-club'),
      karaokeBar: byLoungeType('karaoke'),
      cigarLounge: byLoungeType('cigar'),
      // Fallback vibe-based categories
      intimate: lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['intimate', 'cozy', 'warm'].includes(t.toLowerCase()))).slice(0, 50),
      lively: lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['lively', 'energetic', 'vibrant'].includes(t.toLowerCase()))).slice(0, 50),
      dateNight: lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['romantic', 'date', 'intimate'].includes(t.toLowerCase()))).slice(0, 50),
      liveMusic: lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['live music', 'band', 'performance'].includes(t.toLowerCase()))).slice(0, 50),
      dj: lounges.filter(v => getTags(v, 'vibe_tags').some((t: string) => ['dj', 'dance', 'club'].includes(t.toLowerCase()))).slice(0, 50),
    };
  }, [filteredVenues]);

  const VenueRow = useCallback(({ categoryId, title, subtitle, venues }: any) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const isVisible = visibleCategories.includes(categoryId);

    useEffect(() => {
      if (rowRef.current && observerRef.current && !isVisible) {
        observerRef.current.observe(rowRef.current);
      }
    }, [isVisible]);

    if (!venues || venues.length === 0) {
      console.log('⚠️ Empty category:', title);
      return null;
    }

    console.log('✅ Rendering category:', title, 'with', venues.length, 'venues');

    return (
      <div ref={rowRef} data-category-id={categoryId} className="mb-8">
        <div className="px-6 mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory hide-scrollbar">
          {isVisible ? venues.map((venue: any) => (
            <div 
              key={venue.id}
              onClick={() => setSelectedVenue(venue)}
              className="flex-shrink-0 w-64 snap-start cursor-pointer group"
            >
              <div className="relative h-80 rounded-2xl overflow-hidden bg-zinc-900 group-hover:scale-105 transition-transform">
                <img 
                  src={venue.professional_photo_url || venue.image_url || '/placeholder.jpg'} 
                  alt={venue.name} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg mb-1">{venue.name}</h3>
                  <p className="text-zinc-300 text-sm">{venue.neighborhood}</p>
                  <p className="text-zinc-400 text-xs mt-1">{venue.cuisine || venue.cuisine_primary} • {venue.price_tier}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="w-full h-80 bg-zinc-900 animate-pulse rounded-2xl" />
          )}
        </div>
      </div>
    );
  }, [visibleCategories]);

  const EventRow = useCallback(({ categoryId, title, subtitle, events }: any) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const isVisible = visibleCategories.includes(categoryId);

    useEffect(() => {
      if (rowRef.current && observerRef.current && !isVisible) {
        observerRef.current.observe(rowRef.current);
      }
    }, [isVisible]);

    if (!events || events.length === 0) return null;

    return (
      <div ref={rowRef} data-category-id={categoryId} className="mb-8">
        <div className="px-6 mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory hide-scrollbar">
          {isVisible ? events.map((event: any) => (
            <div key={event.id} className="group flex-shrink-0 w-72 snap-start">
              <div className="relative h-64 rounded-2xl overflow-hidden bg-zinc-900">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
                <img src={event.image_url || '/placeholder.jpg'} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute top-4 right-4">
                  <div className="bg-violet-600 px-3 py-1 rounded-full text-white text-xs font-semibold">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg mb-1">{event.title}</h3>
                  <p className="text-zinc-300 text-sm mb-3">{event.venue_name}</p>
                  <a
                    href={event.ticket_url || `https://www.google.com/search?q=${encodeURIComponent(event.title + " " + event.venue_name + " tickets")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold text-xs transition-all"
                  >
                    <span>{event.ticket_url ? "Get Tickets" : "Find Tickets"}</span>
                  </a>
                </div>
              </div>
            </div>
          )) : (
            <div className="w-full h-64 bg-zinc-900 animate-pulse rounded-2xl" />
          )}
        </div>
      </div>
    );
  }, [visibleCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading {selectedCity}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <ExploreHeader onBack={onBack} title="Explore" />

      <div className="px-6 pt-6 pb-4 bg-black">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues, cuisines..."
              className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-zinc-500 hover:text-white" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all"
          >
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 pb-4 bg-black">
        <button
          onClick={() => setShowCityModal(true)}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-white text-left flex items-center justify-between transition-all"
        >
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            {selectedCity}
          </span>
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {showCityModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl text-white font-light">Select Location</h2>
              <button
                onClick={() => setShowCityModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => { setSelectedCity('New York'); setShowCityModal(false); }}
                className="w-full p-4 text-left bg-gradient-to-br from-violet-600/10 to-purple-600/10 hover:from-violet-600/20 hover:to-purple-600/20 border border-zinc-800 hover:border-violet-700 rounded-xl transition-all"
              >
                <p className="text-white font-light text-lg mb-1">New York</p>
                <p className="text-zinc-500 text-xs">Manhattan, Brooklyn, Queens, Bronx</p>
              </button>
              
              <button
                onClick={() => { setSelectedCity('New Jersey'); setShowCityModal(false); }}
                className="w-full p-4 text-left bg-gradient-to-br from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-zinc-800 hover:border-emerald-700 rounded-xl transition-all"
              >
                <p className="text-white font-light text-lg mb-1">New Jersey</p>
                <p className="text-zinc-500 text-xs">North, Central, South Jersey</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl text-white font-light">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="text-white font-semibold mb-3">Price Range</h3>
                <div className="flex gap-2 flex-wrap">
                  {['$', '$$', '$$$', '$$$$'].map(price => (
                    <button
                      key={price}
                      onClick={() => {
                        const current = activeFilters.price || [];
                        setActiveFilters({
                          ...activeFilters,
                          price: current.includes(price) 
                            ? current.filter(p => p !== price)
                            : [...current, price]
                        });
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeFilters.price?.includes(price)
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {price}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Cuisine</h3>
                <div className="flex gap-2 flex-wrap">
                  {['Japanese', 'Italian', 'Mexican', 'Caribbean', 'American', 'French'].map(cuisine => (
                    <button
                      key={cuisine}
                      onClick={() => {
                        const current = activeFilters.cuisine || [];
                        setActiveFilters({
                          ...activeFilters,
                          cuisine: current.includes(cuisine)
                            ? current.filter(c => c !== cuisine)
                            : [...current, cuisine]
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeFilters.cuisine?.includes(cuisine)
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Vibe</h3>
                <div className="flex gap-2 flex-wrap">
                  {['rooftop', 'date night', 'chill', 'high energy', 'live music', 'hookah'].map(vibe => (
                    <button
                      key={vibe}
                      onClick={() => {
                        const current = activeFilters.vibe || [];
                        setActiveFilters({
                          ...activeFilters,
                          vibe: current.includes(vibe)
                            ? current.filter(v => v !== vibe)
                            : [...current, vibe]
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeFilters.vibe?.includes(vibe)
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {vibe}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setActiveFilters({});
                  setShowFilters(false);
                }}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white font-semibold transition-all"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-6 mb-6 bg-black">
        {['dining', 'lounges', 'events'].map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab as any)}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              mainTab === tab ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {searchQuery && filteredVenues.length > 0 && (
        <div className="px-6">
          <h2 className="text-white text-xl font-bold mb-4">Search Results ({filteredVenues.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {filteredVenues.slice(0, 20).map((venue: any) => (
              <div 
                key={venue.id}
                onClick={() => setSelectedVenue(venue)}
                className="cursor-pointer group"
              >
                <div className="relative h-48 rounded-xl overflow-hidden bg-zinc-900 group-hover:scale-105 transition-transform">
                  <img 
                    src={venue.professional_photo_url || venue.image_url || '/placeholder.jpg'} 
                    alt={venue.name} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-bold text-sm mb-0.5">{venue.name}</h3>
                    <p className="text-zinc-300 text-xs">{venue.neighborhood}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchQuery && filteredVenues.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-zinc-500">No results found for "{searchQuery}"</p>
        </div>
      )}

      {!searchQuery && mainTab === 'dining' && (
        <div>
          <VenueRow categoryId="trending" title="Trending Now" subtitle="Popular spots this week" venues={diningCategories.trending} />
          <VenueRow categoryId="japanese" title="Japanese" subtitle="Sushi & ramen" venues={diningCategories.japanese} />
          <VenueRow categoryId="italian" title="Italian" subtitle="Pasta & pizza" venues={diningCategories.italian} />
          <VenueRow categoryId="caribbean" title="Caribbean" subtitle="Island flavors" venues={diningCategories.caribbean} />
          <VenueRow categoryId="mexican" title="Mexican" subtitle="Tacos & more" venues={diningCategories.mexican} />
          <VenueRow categoryId="american" title="American" subtitle="Classic American" venues={diningCategories.american} />
          <VenueRow categoryId="brunch" title="Brunch Spots" subtitle="Weekend vibes" venues={diningCategories.brunch} />
          <VenueRow categoryId="date-night" title="Date Night" subtitle="Romantic dining" venues={diningCategories.dateNight} />
          <VenueRow categoryId="soul-food" title="Soul Food" subtitle="Southern comfort" venues={diningCategories.soulFood} />
          <VenueRow categoryId="upscale" title="Upscale Dining" subtitle="Fine dining" venues={diningCategories.upscale} />
          <VenueRow categoryId="asian" title="Asian Cuisine" subtitle="Chinese, Thai, Korean" venues={diningCategories.asian} />
          <VenueRow categoryId="seafood" title="Seafood" subtitle="Fresh catches" venues={diningCategories.seafood} />
          <VenueRow categoryId="french" title="French" subtitle="French cuisine" venues={diningCategories.french} />
          <VenueRow categoryId="trendy" title="Trendy Spots" subtitle="Hot & popular" venues={diningCategories.trendy} />
        </div>
      )}

      {!searchQuery && mainTab === 'lounges' && (
        <div>
          <VenueRow categoryId="all-lounges" title="All Lounges" subtitle="Nightlife spots" venues={loungeCategories.all} />
          <VenueRow categoryId="upscale-lounge" title="Upscale Lounges" subtitle="Elegant & sophisticated" venues={loungeCategories.upscale} />
          <VenueRow categoryId="cocktail-lounge" title="Cocktail Lounges" subtitle="Craft cocktails & mixology" venues={loungeCategories.cocktailLounge} />
          <VenueRow categoryId="hookah" title="Hookah Lounges" subtitle="Shisha & chill vibes" venues={loungeCategories.hookah} />
          <VenueRow categoryId="speakeasy" title="Speakeasies" subtitle="Hidden gems & secret bars" venues={loungeCategories.speakeasy} />
          <VenueRow categoryId="rooftop" title="Rooftop Lounges" subtitle="Views & outdoor vibes" venues={loungeCategories.rooftop} />
          <VenueRow categoryId="wine-bar" title="Wine Bars" subtitle="Wine selections & tastings" venues={loungeCategories.wineBar} />
          <VenueRow categoryId="jazz-lounge" title="Jazz Lounges" subtitle="Live jazz & soul" venues={loungeCategories.jazzLounge} />
          <VenueRow categoryId="afrobeats" title="Afrobeats Lounges" subtitle="Afrobeats & amapiano vibes" venues={loungeCategories.afrobeats} />
          <VenueRow categoryId="sports-bar" title="Sports Bars" subtitle="Games & big screens" venues={loungeCategories.sportsBar} />
          <VenueRow categoryId="dive-bar" title="Dive Bars" subtitle="Casual & local" venues={loungeCategories.diveBar} />
          <VenueRow categoryId="karaoke" title="Karaoke Bars" subtitle="Sing your heart out" venues={loungeCategories.karaokeBar} />
          <VenueRow categoryId="cigar-lounge" title="Cigar Lounges" subtitle="Premium cigars & whiskey" venues={loungeCategories.cigarLounge} />
          <VenueRow categoryId="upscale-club" title="Upscale Clubs" subtitle="VIP nightlife" venues={loungeCategories.upscaleClub} />
          <VenueRow categoryId="casual-lounge" title="Casual Lounges" subtitle="Relaxed & chill" venues={loungeCategories.casual} />
          <VenueRow categoryId="intimate" title="Intimate Vibes" subtitle="Cozy & warm" venues={loungeCategories.intimate} />
          <VenueRow categoryId="date-night-lounge" title="Date Night" subtitle="Romantic vibes" venues={loungeCategories.dateNight} />
          <VenueRow categoryId="live-music" title="Live Music" subtitle="Bands & performances" venues={loungeCategories.liveMusic} />
          <VenueRow categoryId="dj" title="DJ Nights" subtitle="Dance & club" venues={loungeCategories.dj} />
        </div>
      )}

      {!searchQuery && mainTab === 'events' && (
        <div>
          <EventRow categoryId="all" title="All Events" subtitle="Everything coming up" events={eventCategories.all} />
          <EventRow categoryId="thisWeek" title="This Week" subtitle="Next 7 days" events={eventCategories.thisWeek} />
          <EventRow categoryId="weekend" title="Weekend" subtitle="Fri, Sat, Sun" events={eventCategories.weekend} />
          <EventRow categoryId="tonight" title="Tonight" subtitle="Events today" events={eventCategories.tonight} />
          <EventRow categoryId="afrobeats" title="Afrobeats" subtitle="Afrobeats & Amapiano" events={eventCategories.afrobeats} />
          <EventRow categoryId="hiphop" title="Hip-Hop" subtitle="Hip-Hop & R&B" events={eventCategories.hiphop} />
          <EventRow categoryId="latin" title="Latin" subtitle="Latin music" events={eventCategories.latin} />
          <EventRow categoryId="nightlife" title="Nightlife" subtitle="Club nights & parties" events={eventCategories.nightlife} />
          <EventRow categoryId="upscale" title="Upscale Vibes" subtitle="TAO, Lavo & more" events={eventCategories.upscale} />
          <EventRow categoryId="house" title="House/EDM" subtitle="Electronic music" events={eventCategories.house} />
        </div>
      )}

      {selectedVenue && (
        <VenueModal venue={selectedVenue} isOpen={!!selectedVenue} onClose={() => setSelectedVenue(null)} />
      )}

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
