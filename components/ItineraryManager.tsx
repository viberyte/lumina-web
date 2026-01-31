'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Share2, Trash2, Edit, Plus, X, ChevronRight } from 'lucide-react';

interface ItineraryItem {
  id: string;
  venue: any;
  date: Date;
  timeSlot?: string;
  notes?: string;
}

interface ItineraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (items: ItineraryItem[]) => void;
}

export default function ItineraryManager({ isOpen, onClose, onShare }: ItineraryManagerProps) {
  const [itineraries, setItineraries] = useState<Record<string, ItineraryItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>('tonight');
  const [editMode, setEditMode] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lumina_itineraries');
    if (saved) {
      setItineraries(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('lumina_itineraries', JSON.stringify(itineraries));
  }, [itineraries]);

  // Get formatted date label
  const getDateLabel = (dateKey: string) => {
    if (dateKey === 'tonight') return "Tonight's Lineup";
    if (dateKey === 'tomorrow') return "Tomorrow's Plans";
    if (dateKey === 'weekend') return "This Weekend";
    
    const date = new Date(dateKey);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Delete venue from itinerary
  const removeVenue = (dateKey: string, venueId: string) => {
    setItineraries(prev => ({
      ...prev,
      [dateKey]: prev[dateKey]?.filter(item => item.id !== venueId) || []
    }));
  };

  // Clear entire date
  const clearDate = (dateKey: string) => {
    setItineraries(prev => {
      const updated = { ...prev };
      delete updated[dateKey];
      return updated;
    });
  };

  // Get all dates with items
  const dateKeys = Object.keys(itineraries).filter(key => itineraries[key]?.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-900 rounded-t-3xl md:rounded-3xl border border-zinc-800/50 shadow-2xl shadow-violet-500/20 overflow-hidden animate-slideUp">
        
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Your Lineups</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Date Tabs */}
          {dateKeys.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              {dateKeys.map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedDate === key
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {getDateLabel(key)}
                  <span className="ml-2 text-xs opacity-75">
                    ({itineraries[key]?.length})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          {dateKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌙</div>
              <p className="text-zinc-400 text-lg mb-2">No lineups yet</p>
              <p className="text-zinc-500 text-sm">Start swiping to build your perfect night</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itineraries[selectedDate]?.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50 hover:border-violet-500/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-violet-400 text-sm font-medium">
                          {item.timeSlot || `Stop ${index + 1}`}
                        </span>
                        {item.venue.viberyte_certified && (
                          <span className="bg-violet-900/30 text-violet-400 text-xs px-2 py-0.5 rounded-full">
                            ✓ Certified
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {item.venue.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {item.venue.neighborhood || item.venue.city}
                        </span>
                        {item.venue.price_tier && (
                          <span>{'$'.repeat(parseInt(item.venue.price_tier))}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeVenue(selectedDate, item.id)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              {itineraries[selectedDate]?.length > 0 && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => onShare(itineraries[selectedDate])}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Lineup
                  </button>
                  
                  <button
                    onClick={() => clearDate(selectedDate)}
                    className="px-6 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
