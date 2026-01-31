'use client';
import { useState } from 'react';
import SwipeableVenueCard from './SwipeableVenueCard';
import { RefreshCw } from 'lucide-react';

interface SwipeableStackProps {
  venues: any[];
  title?: string;
  onFlowExperience: (venue: any) => void;
  onRefresh?: () => void;
}

export default function SwipeableStack({ 
  venues, 
  title,
  onFlowExperience,
  onRefresh 
}: SwipeableStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedVenues, setSavedVenues] = useState<any[]>([]);
  
  const handleSwipeLeft = () => {
    if (currentIndex < venues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeRight = (venue: any) => {
    setSavedVenues([...savedVenues, venue]);
    if (currentIndex < venues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeUp = (venue: any) => {
    onFlowExperience(venue);
  };

  if (venues.length === 0) return null;

  return (
    <div className="w-full">
      {/* Header with counter */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div>
          {title && <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>}
          <p className="text-sm text-zinc-400">
            Showing <span className="text-white font-medium">{currentIndex + 1}</span> of{' '}
            <span className="text-white font-medium">{venues.length}</span>
          </p>
        </div>
        
        {onRefresh && currentIndex >= venues.length - 1 && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">New Recs</span>
          </button>
        )}
      </div>

      {/* Swipeable card stack */}
      <div className="relative h-[70vh] w-full">
        {venues.map((venue, index) => (
          <SwipeableVenueCard
            key={venue.id}
            venue={venue}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSwipeUp}
            isActive={index === currentIndex}
          />
        ))}
      </div>

      {/* Saved venues counter */}
      {savedVenues.length > 0 && (
        <div className="mt-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
          <p className="text-violet-200 text-sm text-center">
            ✨ {savedVenues.length} venue{savedVenues.length !== 1 ? 's' : ''} added to your night
          </p>
        </div>
      )}

      {/* End of stack message */}
      {currentIndex >= venues.length - 1 && (
        <div className="mt-4 text-center">
          <p className="text-zinc-400 text-sm">
            That's all! {onRefresh ? 'Tap refresh for more recommendations.' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
