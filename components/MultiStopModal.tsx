'use client';
import { useState } from 'react';
import { X, Navigation, Sparkles } from 'lucide-react';

interface MultiStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: any;
  onVenueClick: (venueId: number) => void;
}

export default function MultiStopModal({ isOpen, onClose, recommendations, onVenueClick }: MultiStopModalProps) {
  if (!isOpen || !recommendations) return null;

  const cards = [
    {
      tier: 'SAFE',
      emoji: '🛡️',
      subtitle: 'Easy, cozy, smooth ending',
      data: recommendations.safe,
      bgColor: 'from-emerald-600/20 to-emerald-900/20',
      borderColor: 'border-emerald-600/50',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-500'
    },
    {
      tier: 'ELEVATED',
      emoji: '✨',
      subtitle: 'Fun but refined, good vibes',
      data: recommendations.elevated,
      bgColor: 'from-violet-600/20 to-violet-900/20',
      borderColor: 'border-violet-600/50',
      buttonColor: 'bg-violet-600 hover:bg-violet-500'
    },
    {
      tier: 'WILDCARD',
      emoji: '🎲',
      subtitle: 'Turn the night up, spontaneous',
      data: recommendations.wildcard,
      bgColor: 'from-rose-600/20 to-rose-900/20',
      borderColor: 'border-rose-600/50',
      buttonColor: 'bg-rose-600 hover:bg-rose-500'
    }
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-zinc-950 w-full max-w-4xl rounded-3xl border border-zinc-800 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 p-6">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="text-center pr-12">
            <h2 className="text-3xl font-bold text-white mb-2">🌆 Continue The Vibe</h2>
            <p className="text-zinc-400">Pick your energy level for the rest of the night</p>
          </div>
        </div>

        {/* 🔄 VERTICAL GRID - Cards stack vertically */}
        <div className="p-6 space-y-6">
          {cards.map((card) => (
            <div
              key={card.tier}
              className={`relative bg-gradient-to-br ${card.bgColor} border ${card.borderColor} rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-200`}
            >
              {/* COMPACT HORIZONTAL LAYOUT */}
              <div className="flex gap-4 p-4">
                {/* Left: Image (Smaller) */}
                <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-900">
                  <img
                    src={card.data.venue.photo || '/placeholder.jpg'}
                    alt={card.data.venue.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Travel Time Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span className="text-white text-xs font-medium">{card.data.travelTime}</span>
                  </div>
                </div>

                {/* Right: Content */}
                <div className="flex-1 min-w-0">
                  {/* Tier Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{card.emoji}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{card.tier}</h3>
                      <p className="text-zinc-400 text-xs">{card.subtitle}</p>
                    </div>
                  </div>

                  {/* Venue Info */}
                  <h4 className="text-white font-bold text-base mb-1">{card.data.venue.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                    <span>{card.data.venue.neighborhood}</span>
                    <span>•</span>
                    <span>{card.data.venue.price_tier || '$$'}</span>
                  </div>

                  {/* AI Reasoning */}
                  <div className="bg-black/30 rounded-lg p-2.5 border border-white/10 mb-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <p className="text-zinc-300 text-xs leading-relaxed">
                        {card.data.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Pro Tip */}
                  <p className="text-zinc-500 text-xs mb-3">
                    💡 {card.data.proTip}
                  </p>

                  {/* View Button */}
                  <button
                    onClick={() => {
                      onVenueClick(card.data.venue.id);
                      onClose();
                    }}
                    className={`w-full py-2.5 ${card.buttonColor} text-white font-semibold rounded-lg transition-all active:scale-95`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-6 bg-zinc-900/50">
          <p className="text-center text-zinc-500 text-sm">
            💫 All recommendations are in the same neighborhood
          </p>
        </div>
      </div>
    </div>
  );
}
