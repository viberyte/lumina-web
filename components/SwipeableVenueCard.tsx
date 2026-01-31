'use client';
import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Star, X, Heart, ChevronUp } from 'lucide-react';

interface SwipeableVenueCardProps {
  venue: any;
  onSwipeRight: (venue: any) => void;
  onSwipeLeft: () => void;
  onSwipeUp: (venue: any) => void;
  isActive: boolean;
}

export default function SwipeableVenueCard({ 
  venue, 
  onSwipeRight, 
  onSwipeLeft, 
  onSwipeUp,
  isActive 
}: SwipeableVenueCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateZ = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    
    if (info.offset.y < -swipeThreshold) {
      onSwipeUp(venue);
    } else if (info.offset.x > swipeThreshold) {
      onSwipeRight(venue);
    } else if (info.offset.x < -swipeThreshold) {
      onSwipeLeft();
    }
  };

  const photoUrl = venue.photo_url || venue.professional_photo_url || venue.image_url || null;

  if (!isActive) return null;

  return (
    <motion.div
      style={{ x, y, rotateZ, opacity }}
      drag={isActive}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-4 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Photo */}
        <div className="relative h-full">
          {photoUrl ? (
            <img src={photoUrl} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center">
              <MapPin className="w-24 h-24 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

          {/* Swipe Indicators */}
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-2xl font-bold text-2xl rotate-12 shadow-xl">
            LIKE
          </motion.div>
          <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-2xl font-bold text-2xl -rotate-12 shadow-xl">
            NOPE
          </motion.div>

          {/* Venue Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-3xl font-bold mb-1">{venue.name}</h3>
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span>{venue.neighborhood || venue.city}</span>
                </div>
              </div>
              {venue.rating && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{venue.rating}</span>
                </div>
              )}
            </div>

            {/* Swipe Instructions */}
            <div className="flex items-center justify-center gap-8 mt-6 text-white/60 text-sm">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5" />
                <span>Swipe left to pass</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                <span>Swipe right to save</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronUp className="w-5 h-5" />
                <span>Swipe up for details</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
