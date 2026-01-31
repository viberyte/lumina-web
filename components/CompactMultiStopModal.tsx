'use client';
import { X, Plus, Check, ChevronRight } from 'lucide-react';
import { usePlans } from '@/contexts/PlansContext';

interface CompactMultiStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: any;
  primaryVenue: any;
  onVenueClick: (venueId: number) => void;
}

export default function CompactMultiStopModal({ 
  isOpen, 
  onClose, 
  recommendations, 
  primaryVenue,
  onVenueClick 
}: CompactMultiStopModalProps) {
  const { addToPlan, removeFromPlan, isInPlan, plan } = usePlans();

  if (!isOpen || !recommendations) return null;

  const cards = [
    {
      tier: 'SAFE',
      emoji: '🛡️',
      title: 'Wind Down',
      data: recommendations.safe,
      gradient: 'from-emerald-500/20 via-teal-500/20 to-emerald-600/20',
      accentColor: 'bg-emerald-500'
    },
    {
      tier: 'ELEVATED',
      emoji: '✨',
      title: 'Keep Energy',
      data: recommendations.elevated,
      gradient: 'from-violet-500/20 via-purple-500/20 to-fuchsia-500/20',
      accentColor: 'bg-violet-500'
    },
    {
      tier: 'WILDCARD',
      emoji: '🎲',
      title: 'Turn Up',
      data: recommendations.wildcard,
      gradient: 'from-rose-500/20 via-pink-500/20 to-rose-600/20',
      accentColor: 'bg-rose-500'
    }
  ];

  const handleTogglePlan = (e: React.MouseEvent | React.TouchEvent, card: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const venue = card.data.venue;
    if (isInPlan(venue.id)) {
      removeFromPlan(venue.id);
    } else {
      addToPlan(venue);
    }
  };

  const handleViewDetails = (e: React.MouseEvent | React.TouchEvent, venueId: number) => {
    e.preventDefault();
    e.stopPropagation();
    onVenueClick(venueId);
    onClose();
  };

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Backdrop - POINTER EVENTS NONE */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
        style={{ pointerEvents: 'none' }}
      />

      {/* Modal Content */}
      <div className="relative bg-zinc-950 w-full max-w-6xl rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative border-b border-zinc-800 px-6 py-5 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <button
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="absolute top-5 right-5 w-11 h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 rounded-full flex items-center justify-center transition-all z-20"
            style={{ 
              minWidth: '44px', 
              minHeight: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="pr-16">
            <h2 className="text-2xl font-bold text-white mb-1">🌆 Continue The Vibe</h2>
            <p className="text-sm text-zinc-400">
              From <span className="text-violet-400 font-semibold">{primaryVenue.name}</span>
            </p>
          </div>
        </div>

        {/* 3-Column Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((card) => {
              const inPlan = isInPlan(card.data.venue.id);
              
              return (
                <div
                  key={card.tier}
                  className="group relative bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-zinc-700 overflow-hidden transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Image */}
                  <div className="relative h-52 bg-zinc-800 overflow-hidden">
                    <img
                      src={card.data.venue.photo || '/placeholder.jpg'}
                      alt={card.data.venue.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                    {/* Tier Badge */}
                    <div className={`absolute top-3 left-3 ${card.accentColor} backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2 shadow-lg`}>
                      <span className="text-xl">{card.emoji}</span>
                      <span className="text-white text-sm font-bold">{card.title}</span>
                    </div>

                    {/* Add Button - CRITICAL FIX */}
                    <button
                      onClick={(e) => handleTogglePlan(e, card)}
                      onTouchEnd={(e) => handleTogglePlan(e, card)}
                      className={`absolute top-3 right-3 rounded-full flex items-center justify-center transition-all shadow-lg z-10 ${
                        inPlan
                          ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                          : 'bg-black/70 hover:bg-black/90 active:bg-black'
                      }`}
                      style={{ 
                        minWidth: '44px', 
                        minHeight: '44px',
                        width: '44px',
                        height: '44px',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        position: 'relative',
                        zIndex: 10,
                        pointerEvents: 'auto'
                      }}
                    >
                      {inPlan ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Plus className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-white font-bold text-lg line-clamp-1 mb-1">
                        {card.data.venue.name}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-1">
                        {card.data.venue.cuisine} • {card.data.venue.neighborhood}
                      </p>
                    </div>
                    
                    {/* Reasoning - Condensed */}
                    <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed">
                      {card.data.reasoning}
                    </p>

                    {/* View Details Button */}
                    <button
                      onClick={(e) => handleViewDetails(e, card.data.venue.id)}
                      onTouchEnd={(e) => handleViewDetails(e, card.data.venue.id)}
                      className={`w-full py-3 ${card.accentColor} hover:opacity-90 active:opacity-100 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2`}
                      style={{ 
                        minHeight: '44px',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        pointerEvents: 'auto'
                      }}
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-5 bg-zinc-900/50 flex justify-between items-center">
          <button
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="text-zinc-400 hover:text-white active:text-zinc-200 transition-colors font-medium"
            style={{ 
              minWidth: '44px',
              minHeight: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            Close
          </button>
          <div className="text-zinc-500 text-sm font-medium">
            {plan.length} venue{plan.length !== 1 ? 's' : ''} in plan
          </div>
        </div>
      </div>
    </div>
  );
}
