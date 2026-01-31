'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Ticket } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  date: string;
  time?: string;
  displayDate?: string;
  description?: string;
  ticketUrl?: string;
  venue?: {
    name?: string;
    professional_photo_url?: string;
    image_url?: string;
  };
  photo_url?: string;
}

interface EventsCarouselProps {
  events: Event[];
  title: string;
  subtitle?: string;
}

export default function EventsCarousel({ events, title, subtitle }: EventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (!events || events.length === 0) return null;

  return (
    <div className="relative py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Scrollable Events */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {events.map((event) => {
          const eventPhoto = event.photo_url || event.venue?.professional_photo_url || event.venue?.image_url;
          const venueName = event.venue?.name;
          
          const eventDate = new Date(event.date);
          const monthStr = eventDate.toLocaleDateString('en-US', { month: 'short' });
          const dayStr = eventDate.getDate();

          return (
            <div
              key={event.id}
              className="group relative flex-shrink-0 w-[300px] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all duration-300"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10 pointer-events-none" />

              {/* Image */}
              <div className="relative h-44 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20">
                {eventPhoto ? (
                  <img
                    src={eventPhoto}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-white/20" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Date Badge */}
                <div className="absolute top-3 right-3 bg-violet-500 rounded-xl px-3 py-1.5 text-center">
                  <div className="text-xs text-white/80">{monthStr}</div>
                  <div className="text-lg font-bold text-white">{dayStr}</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h3 className="text-white font-semibold text-base line-clamp-2 group-hover:text-violet-300 transition-colors">
                  {event.name}
                </h3>

                {venueName && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm line-clamp-1">{venueName}</span>
                  </div>
                )}

                {event.time && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{event.time}</span>
                  </div>
                )}

                {/* Get Tickets Button - Always Visible */}
                <a
                  href={event.ticketUrl || `https://www.google.com/search?q=${encodeURIComponent(event.name + ' ' + (venueName || '') + ' tickets')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>{event.ticketUrl ? 'Get Tickets' : 'Find Tickets'}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
