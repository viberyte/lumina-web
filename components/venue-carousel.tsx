'use client';
import { useState, useRef } from 'react';
import { Heart, MapPin, Star, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

interface Venue {
  id: number;
  name: string;
  neighborhood?: string;
  rating?: number;
  photo_url?: string;
  professional_photo_url?: string;
  image_url?: string;
  photos?: string[];
  professional_photos?: string | string[];
  address?: string;
  price_range?: string;
  price_tier?: string;
  bio?: string;
}

interface VenueCarouselProps {
  venues: Venue[];
  title?: string;
  onFlowExperience?: (venue: Venue) => void;
}

export default function VenueCarousel({ venues, title = "Recommendations", onFlowExperience }: VenueCarouselProps) {
  const [liked, setLiked] = useState<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const toggleLike = (id: number) => {
    setLiked(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getPhotoUrl = (venue: Venue): string | null => {
    if (venue.photo_url) return venue.photo_url;
    if (venue.professional_photos) {
      try {
        const photos = typeof venue.professional_photos === 'string' 
          ? JSON.parse(venue.professional_photos) 
          : venue.professional_photos;
        if (Array.isArray(photos) && photos.length > 0) return photos[0];
      } catch (e) {}
    }
    if (venue.photos && Array.isArray(venue.photos) && venue.photos.length > 0) {
      return venue.photos[0];
    }
    if (venue.professional_photo_url) return venue.professional_photo_url;
    if (venue.image_url) return venue.image_url;
    return null;
  };

  const getPriceDisplay = (venue: Venue) => {
    const priceRange = venue.price_range || venue.price_tier;
    if (!priceRange) return null;
    
    const price = priceRange.toLowerCase();
    if (price.includes('$$$$')) return { text: '$$$$', color: 'text-yellow-400' };
    if (price.includes('$$$')) return { text: '$$$', color: 'text-green-400' };
    if (price.includes('$$')) return { text: '$$', color: 'text-green-400' };
    if (price.includes('$')) return { text: '$', color: 'text-green-400' };
    
    return { text: priceRange, color: 'text-zinc-400' };
  };

  return (
    <div className="my-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-6">
        <h3 className="text-xl font-light text-white">{title}</h3>
        <span className="text-zinc-500 text-sm font-light">{venues.length} spots</span>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Scrollable Row */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {venues.map((venue) => {
            const photoUrl = getPhotoUrl(venue);
            const priceInfo = getPriceDisplay(venue);
            
            return (
              <div
                key={venue.id}
                className="flex-shrink-0 w-72 snap-start"
              >
                <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all group/card">
                  {/* Image */}
                  <div className="relative h-48">
                    {photoUrl ? (
                      <img src={photoUrl} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Price Badge */}
                    {priceInfo && (
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className={`text-xs font-medium ${priceInfo.color}`}>{priceInfo.text}</span>
                      </div>
                    )}

                    {/* Like Button */}
                    <button
                      onClick={() => toggleLike(venue.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-4 h-4 ${liked.includes(venue.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>

                    {/* Rating */}
                    {venue.rating && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-xs font-medium">{venue.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h4 className="text-white font-medium text-base mb-1 line-clamp-1">{venue.name}</h4>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-3">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{venue.neighborhood || 'Manhattan'}</span>
                    </div>

                    {/* Bio */}
                    {venue.bio && (
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-3">
                        {venue.bio}
                      </p>
                    )}

                    <button
                      onClick={() => onFlowExperience?.(venue)}
                      className="w-full py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/50 text-white rounded-lg text-sm font-light transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
