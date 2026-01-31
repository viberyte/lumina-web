'use client';
import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Navigation, Sparkles, Star, CheckCircle, DollarSign, TrendingUp, Utensils } from 'lucide-react';

interface FlowDetailViewProps {
  flow: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function FlowDetailView({ flow, isOpen, onClose }: FlowDetailViewProps) {
  const [venueDetails, setVenueDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && flow) {
      loadVenueDetails();
    }
  }, [isOpen, flow]);

  const loadVenueDetails = async () => {
    setLoading(true);
    
    const venueNames = flow.stops.map((stop: any) => stop.name);
    
    try {
      const res = await fetch('/api/venues?search=' + encodeURIComponent(venueNames.join(',')));
      const data = await res.json();
      
      if (data.ok && data.venues) {
        setVenueDetails(data.venues);
      }
    } catch (error) {
      console.error('Error loading venue details:', error);
    }
    
    setLoading(false);
  };

  const getVenueDetails = (venueName: string) => {
    return venueDetails.find(v => 
      v.name?.toLowerCase().includes(venueName.toLowerCase()) ||
      venueName.toLowerCase().includes(v.name?.toLowerCase())
    );
  };

  const estimateCost = (stop: any) => {
    const venue = getVenueDetails(stop.name);
    const type = stop.type?.toLowerCase();
    
    // Use price_tier from database if available
    if (venue?.price_tier) {
      const tier = venue.price_tier;
      if (tier === 1) return type === 'dinner' ? 25 : 15;
      if (tier === 2) return type === 'dinner' ? 45 : 25;
      if (tier === 3) return type === 'dinner' ? 75 : 40;
      if (tier === 4) return type === 'dinner' ? 120 : 60;
    }
    
    // Fallback estimates
    if (type === 'dinner') return 60;
    if (type === 'lounge' || type === 'bar') return 30;
    if (type === 'club') return 40;
    if (type === 'dessert') return 15;
    return 25;
  };

  const totalEstimatedCost = flow?.stops?.reduce((sum: number, stop: any) => sum + estimateCost(stop), 0) || 0;

  if (!isOpen || !flow) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen p-4 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Compact Header */}
          <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-zinc-800 rounded-t-2xl p-4 mb-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">{flow.title}</h2>
                  <p className="text-violet-400 text-xs">{flow.vibe}</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Compact Stats */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800 text-center">
                <p className="text-white font-bold text-sm">{flow.stops.length}</p>
                <p className="text-zinc-500 text-xs">Stops</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800 text-center">
                <p className="text-white font-bold text-sm">~5h</p>
                <p className="text-zinc-500 text-xs">Duration</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800 text-center">
                <p className="text-white font-bold text-sm">{flow.totalTravel}</p>
                <p className="text-zinc-500 text-xs">Travel</p>
              </div>
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-2 border border-green-700/50 text-center">
                <p className="text-green-400 font-bold text-sm">${totalEstimatedCost}</p>
                <p className="text-green-400 text-xs">Budget</p>
              </div>
            </div>
          </div>

          {/* Smaller Venue Cards - 3 Column Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {flow.stops.map((stop: any, idx: number) => {
              const venue = getVenueDetails(stop.name);
              const venueImage = venue?.professional_photos?.[0] || venue?.professional_photo_url;
              const estimatedCost = estimateCost(stop);
              
              return (
                <div key={idx} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500 transition-all group">
                  {/* Compact Image */}
                  <div className="aspect-[4/3] bg-zinc-800 relative overflow-hidden">
                    {venueImage ? (
                      <img 
                        src={venueImage}
                        alt={stop.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <Sparkles className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                    
                    {/* Stop Number */}
                    <div className="absolute top-2 left-2 w-7 h-7 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xs">{idx + 1}</span>
                    </div>

                    {/* Time */}
                    <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">{stop.time}</span>
                    </div>

                    {/* Cost */}
                    <div className="absolute top-2 right-2 bg-green-900/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-green-700/50">
                      <span className="text-green-400 text-xs font-bold">${estimatedCost}</span>
                    </div>

                    {/* Rating if available */}
                    {venue?.rating && (
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-white text-xs font-medium">{venue.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Compact Info */}
                  <div className="p-3">
                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">{stop.name}</h3>
                    <p className="text-zinc-500 text-xs mb-2 line-clamp-1">{stop.neighborhood}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-violet-400 font-medium">{stop.duration}</span>
                      {venue?.price_tier && (
                        <span className="text-zinc-400">{'$'.repeat(venue.price_tier)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Timeline */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-violet-500" />
              Timeline
            </h3>
            
            <div className="space-y-4">
              {flow.stops.map((stop: any, idx: number) => {
                const venue = getVenueDetails(stop.name);
                return (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">{idx + 1}</span>
                      </div>
                      {idx < flow.stops.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gradient-to-b from-violet-600/50 to-transparent mt-1" />
                      )}
                    </div>

                    <div className="flex-1 pb-3">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="text-white font-semibold text-sm">{stop.name}</h4>
                          <p className="text-zinc-500 text-xs">{stop.neighborhood}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 text-sm font-bold">${estimateCost(stop)}</div>
                          <div className="text-violet-400 text-xs">{stop.time}</div>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-xs mb-1 line-clamp-2">{stop.description}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{stop.duration}</span>
                        {venue?.cuisine && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Utensils className="w-3 h-3" />
                              <span>{venue.cuisine}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Budget Breakdown */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="space-y-2">
                {flow.stops.map((stop: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{idx + 1}. {stop.name}</span>
                    <span className="text-green-400 font-medium">${estimateCost(stop)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-white font-semibold">Total Estimated</span>
                  <span className="text-green-400 text-lg font-bold">${totalEstimatedCost}</span>
                </div>
              </div>
              <p className="text-zinc-600 text-xs mt-2 italic">*Based on average spending per venue type</p>
            </div>
          </div>

          {/* Reasoning Card */}
          <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-xl p-4 border border-violet-800/30 mb-4">
            <h3 className="text-violet-400 font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Why This Flow?
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">{flow.reasoning}</p>
          </div>

          {/* Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-800 p-4">
            <div className="max-w-5xl mx-auto flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-all text-sm"
              >
                Back
              </button>
              
              <button className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Book Flow - ${totalEstimatedCost}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
