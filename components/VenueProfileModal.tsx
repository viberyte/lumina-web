'use client';
import { useState, useRef, useEffect } from 'react';
import { X, MapPin, Star, Phone, Globe, DollarSign, Clock, Calendar } from 'lucide-react';
import CustomVideoPlayer from './CustomVideoPlayer';

interface VenueProfileModalProps {
  venue: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function VenueProfileModal({ venue, isOpen, onClose }: VenueProfileModalProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 150) {
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        style={{ opacity: isDragging ? 1 - dragY / 500 : 1 }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-zinc-950 w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm pt-3 pb-2">
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Hero Section */}
        <div className="relative">
          {venue.video_url ? (
            <CustomVideoPlayer 
              videoUrl={venue.video_url}
              posterUrl={venue.photo_url}
              className="h-80"
            />
          ) : venue.photo_url ? (
            <div className="relative h-80">
              <img 
                src={venue.photo_url}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="h-80 bg-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600">No Image</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-3xl font-bold text-white">{venue.name}</h1>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                <span className="text-white font-semibold">{venue.google_rating || '4.5'}</span>
              </div>
              <span className="text-zinc-500">•</span>
              <span className="text-white font-medium">{venue.price_tier || '$$'}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-white">{venue.cuisine_primary}</span>
            </div>

            <div className="flex items-center gap-2 text-zinc-400">
              <MapPin className="w-4 h-4" />
              <span>{venue.neighborhood}, {venue.city}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button className="py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-all">
              Reserve
            </button>
            <button className="py-3 bg-zinc-900 border border-zinc-800 hover:border-violet-500 rounded-xl font-semibold transition-all">
              Directions
            </button>
            <button className="py-3 bg-zinc-900 border border-zinc-800 hover:border-violet-500 rounded-xl font-semibold transition-all">
              Share
            </button>
          </div>

          {/* About Section */}
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-xl font-bold text-white">About</h3>
            <p className="text-zinc-400 leading-relaxed">
              {venue.bio || venue.description || 'No description available.'}
            </p>
          </div>

          {/* Vibe Tags */}
          {venue.vibe_tags && (
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="text-xl font-bold text-white">🏷️ Vibe</h3>
              <div className="flex flex-wrap gap-2">
                {JSON.parse(venue.vibe_tags || '[]').map((tag: string, i: number) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-violet-900/30 border border-violet-700/50 rounded-full text-violet-300 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Set My Budget */}
          <div className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-2xl animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Set My Budget</h3>
                <p className="text-sm text-emerald-300">Get personalized meal under $25</p>
              </div>
            </div>
            <button className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Generate Budget Meal
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-xl font-bold text-white">📍 Contact & Hours</h3>
            <div className="space-y-2">
              {venue.phone && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Phone className="w-5 h-5" />
                  <a href={`tel:${venue.phone}`} className="hover:text-violet-400 transition-colors">
                    {venue.phone}
                  </a>
                </div>
              )}
              {venue.website && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Globe className="w-5 h-5" />
                  <a 
                    href={venue.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-violet-400 transition-colors truncate"
                  >
                    {venue.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
