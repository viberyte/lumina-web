'use client';
import { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';

interface CitySelectorProps {
  onSelectLocation: (city: string, state: string) => void;
}

export default function ModernCitySelector({ onSelectLocation }: CitySelectorProps) {
  const [showRegions, setShowRegions] = useState(false);
  const [selectedState, setSelectedState] = useState<any>(null);
  const [savedLocation, setSavedLocation] = useState<{ city: string; state: string } | null>(null);

  const locations = [
    { 
      name: 'New York', 
      state: 'NY',
      regions: [
        { name: 'Manhattan', value: 'Manhattan' },
        { name: 'Brooklyn', value: 'Brooklyn' },
        { name: 'Queens', value: 'Queens' },
        { name: 'Bronx', value: 'Bronx' }
      ],
      active: true,
      gradient: 'from-violet-600/10 to-purple-600/10'
    },
    { 
      name: 'New Jersey', 
      state: 'NJ',
      regions: [
        { name: 'North Jersey', value: 'Newark,Jersey City,Hoboken' },
        { name: 'Central Jersey', value: 'New Brunswick,Edison' },
        { name: 'South Jersey', value: 'Camden,Cherry Hill' }
      ],
      active: true,
      gradient: 'from-emerald-600/10 to-teal-600/10'
    },
    { name: 'Los Angeles', state: 'CA', regions: [], active: false, comingSoon: true, gradient: 'from-orange-600/10 to-amber-600/10' },
    { name: 'Miami', state: 'FL', regions: [], active: false, comingSoon: true, gradient: 'from-cyan-600/10 to-blue-600/10' },
    { name: 'Atlanta', state: 'GA', regions: [], active: false, comingSoon: true, gradient: 'from-pink-600/10 to-rose-600/10' },
    { name: 'Chicago', state: 'IL', regions: [], active: false, comingSoon: true, gradient: 'from-indigo-600/10 to-blue-600/10' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('lumina_location');
    if (saved) {
      setSavedLocation(JSON.parse(saved));
    }
  }, []);

  const handleStateSelect = (location: any) => {
    if (!location.active) return;
    
    if (location.regions.length === 0) {
      const loc = { city: location.name, state: location.state };
      localStorage.setItem('lumina_location', JSON.stringify(loc));
      onSelectLocation(location.name, location.state);
    } else {
      setSelectedState(location);
      setShowRegions(true);
    }
  };

  const handleRegionSelect = (region: any) => {
    const loc = { city: region.value, state: selectedState.state };
    localStorage.setItem('lumina_location', JSON.stringify(loc));
    onSelectLocation(region.value, selectedState.state);
  };

  const useSavedLocation = () => {
    if (savedLocation) {
      onSelectLocation(savedLocation.city, savedLocation.state);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 blur-3xl bg-violet-500/20 rounded-full"></div>
            <MapPin className="w-16 h-16 text-violet-400 relative mx-auto" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl text-white font-light tracking-tight">Where are you tonight?</h1>
          <p className="text-zinc-500 text-sm font-light">Select your location to discover the best spots</p>
        </div>

        {/* Saved Location */}
        {savedLocation && (
          <button
            onClick={useSavedLocation}
            className="w-full p-5 bg-white/5 hover:bg-white/10 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs text-zinc-500 font-light mb-1">Continue where you left off</p>
                <p className="text-base text-white font-light">{savedLocation.city}, {savedLocation.state}</p>
              </div>
              <MapPin className="w-4 h-4 text-violet-400" />
            </div>
          </button>
        )}

        {/* City Grid */}
        <div className="grid grid-cols-2 gap-3">
          {locations.map((location) => (
            <button
              key={location.name}
              onClick={() => handleStateSelect(location)}
              disabled={!location.active}
              className={`relative overflow-hidden p-8 bg-gradient-to-br ${location.gradient} rounded-2xl transition-all border ${
                location.active
                  ? 'border-zinc-800 hover:border-zinc-700 hover:scale-105'
                  : 'border-zinc-900 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl text-white font-light">{location.name}</h3>
                {location.comingSoon && (
                  <p className="text-xs text-zinc-500 font-light">Coming Soon</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Netflix-Style Region Popup */}
      {showRegions && selectedState && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl text-white font-light">{selectedState.name}</h2>
              <button
                onClick={() => setShowRegions(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Regions List */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedState.regions.map((region: any) => (
                <button
                  key={region.name}
                  onClick={() => handleRegionSelect(region)}
                  className="w-full p-4 text-left bg-white/5 hover:bg-white/10 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all"
                >
                  <p className="text-white font-light">{region.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
