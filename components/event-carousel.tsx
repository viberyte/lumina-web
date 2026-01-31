'use client';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Music, ExternalLink } from 'lucide-react';

interface EventCarouselProps {
  events: any[];
  title: string;
}


export default function EventCarousel({ events, title }: EventCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!events || events.length === 0) return null;

  const nextEvent = () => setCurrentIndex((prev) => (prev + 1) % events.length);
  const prevEvent = () => setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);

  const currentEvent = events[currentIndex];
  const eventImage = currentEvent.image_url || currentEvent.cover_image_url || getPlaceholderImage(currentEvent);

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-light">{title}</h2>

      <div className="relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
        <div className="relative h-64 bg-zinc-800">
          <img 
            src={eventImage} 
            alt={currentEvent.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to default if image fails to load
              e.currentTarget.src = '/placeholders/default-event.jpg';
            }}
          />
          {/* Add overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {events.length > 1 && (
            <>
              <button onClick={prevEvent} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm group z-10">
                <ChevronLeft className="w-6 h-6 group-hover:animate-pulse" />
              </button>
              <button onClick={nextEvent} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm group z-10">
                <ChevronRight className="w-6 h-6 group-hover:animate-pulse" />
              </button>
            </>
          )}
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm z-10">
            {currentIndex + 1} / {events.length}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-2xl font-light text-white mb-3">{currentEvent.name}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>{currentEvent.date}</span>
                {currentEvent.time && <span>• {currentEvent.time}</span>}
              </div>
              {currentEvent.venue_name && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin className="w-4 h-4" />
                  <span>{currentEvent.venue_name}</span>
                </div>
              )}
              {currentEvent.music_genre && (
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-400">{currentEvent.music_genre}</span>
                </div>
              )}
            </div>
          </div>
          {currentEvent.ticket_url && (
            <a href={currentEvent.ticket_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-light transition-all">
              Get Tickets
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
