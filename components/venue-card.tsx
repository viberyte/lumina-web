'use client';
import { useState } from 'react';
import { Star, MapPin, Plus, Check } from 'lucide-react';
import { usePlans } from '@/contexts/PlansContext';

interface VenueCardProps {
  venue: any;
  onClick: () => void;
}

export default function VenueCard({ venue, onClick }: VenueCardProps) {
  const { addToPlan, removeFromPlan, isInPlan } = usePlans();
  const [imageLoaded, setImageLoaded] = useState(false);
  const inPlan = isInPlan(venue.id);

  const handleAddToPlan = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal
    if (inPlan) {
      removeFromPlan(venue.id);
    } else {
      addToPlan(venue);
    }
  };

  const parseArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const vibeTags = parseArray(venue.vibe_tags);
  const primaryVibe = vibeTags[0] || venue.category;

  return (
    <div 
      onClick={onClick}
      className="group relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all duration-300 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative h-48 bg-zinc-900 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
        )}
        
        <img
          src={venue.professional_photo_url || venue.photo || '/placeholder.jpg'}
          alt={venue.name}
          className={`w-full h-full object-cover transition-all duration-500 ${
            imageLoaded ? 'opacity-100 group-hover:scale-110' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Add to Plan Button - Top Right */}
        <button
          onClick={handleAddToPlan}
          className={`absolute top-3 right-3 w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-10 ${
            inPlan 
              ? 'bg-emerald-600 hover:bg-emerald-500' 
              : 'bg-black/60 hover:bg-black/80'
          }`}
        >
          {inPlan ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <Plus className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Rating Badge */}
        {venue.rating && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-white text-sm font-semibold">{venue.rating}</span>
          </div>
        )}

        {/* Vibe Tag */}
        {primaryVibe && (
          <div className="absolute bottom-3 left-3 bg-violet-600/90 backdrop-blur-md px-3 py-1 rounded-full">
            <span className="text-white text-xs font-medium">{primaryVibe}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Venue Name */}
        <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-violet-400 transition-colors">
          {venue.name}
        </h3>

        {/* Info Row */}
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="font-medium">{venue.price_tier || '$$'}</span>
          <span>•</span>
          <span className="line-clamp-1">{venue.cuisine_primary || venue.cuisine || venue.category}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{venue.neighborhood}</span>
        </div>
      </div>
    </div>
  );
}
