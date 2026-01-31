'use client';

import { Calendar, MapPin, Clock, Music, ExternalLink, Ticket } from 'lucide-react';
import Image from 'next/image';

interface EventCardProps {
  event: {
    id: number;
    name: string;
    venue: string;
    date: string;
    time: string;
    address?: string;
    description?: string;
    musicGenres?: string;
    coverCharge?: string;
    photoUrl?: string;
    ticketUrl?: string;
  };
  onSelect?: (event: any) => void;
}

export default function EventCard({ event, onSelect }: EventCardProps) {
  const musicGenres = event.musicGenres ? event.musicGenres.split(',').map(g => g.trim()) : [];
  
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div
      className="group relative bg-white/5 border border-white/10 hover:border-violet-500/50 rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={() => onSelect?.(event)}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
      
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 overflow-hidden">
        {event.photoUrl ? (
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Date Badge */}
        <div className="absolute top-3 left-3 bg-violet-500 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-2 text-center">
          <div className="text-xs font-medium text-white/80">
            {eventDate.toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="text-xl font-bold text-white">
            {eventDate.getDate()}
          </div>
        </div>

        {/* Cover Charge */}
        {event.coverCharge && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full">
            <span className="text-sm font-semibold text-white">{event.coverCharge}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-violet-300 transition-colors">
          {event.name}
        </h3>

        <div className="flex items-center gap-2 text-white/60">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{event.venue}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/80">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-violet-400" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-fuchsia-400" />
            <span>{event.time}</span>
          </div>
        </div>

        {musicGenres.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Music className="w-4 h-4 text-violet-400" />
            {musicGenres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs rounded-full">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Always Show Book Button */}
        
          href={event.ticketUrl || `https://www.google.com/search?q=${encodeURIComponent(event.name + ' ' + event.venue + ' tickets')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40"
        >
          <Ticket className="w-4 h-4" />
          <span>{event.ticketUrl ? 'Get Tickets' : 'Find Tickets'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
