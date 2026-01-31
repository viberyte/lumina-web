'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Navigation, Sparkles, Plus, Check } from 'lucide-react';
import { usePlans } from '@/contexts/PlansContext';

interface NetflixMultiStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: any;
  primaryVenue: any;
  onVenueClick: (venueId: number) => void;
}

export default function NetflixMultiStopModal({ 
  isOpen, 
  onClose, 
  recommendations, 
  primaryVenue,
  onVenueClick 
}: NetflixMultiStopModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { addToPlan, removeFromPlan, isInPlan, plan } = usePlans();

  if (!isOpen || !recommendations) return null;

  const cards = [
    {
      tier: 'SAFE',
      emoji: '🛡️',
      title: 'Wind Down',
      subtitle: 'Easy, cozy, smooth ending',
      data: recommendations.safe,
      bgGradient: 'from-emerald-500 to-teal-600',
      accentColor: 'emerald'
    },
    {
      tier: 'ELEVATED',
      emoji: '✨',
      title: 'Keep The Energy',
      subtitle: 'Fun but refined, good vibes',
      data: recommendations.elevated,
      bgGradient: 'from-violet-500 to-purple-600',
      accentColor: 'violet'
    },
    {
      tier: 'WILDCARD',
      emoji: '🎲',
      title: 'Turn It Up',
      subtitle: 'High energy, spontaneous',
      data: recommendations.wildcard,
      bgGradient: 'from-rose-500 to-pink-600',
      accentColor: 'rose'
    }
  ];

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNext();
    }
    if (touchStart - touchEnd < -75) {
      handlePrev();
    }
  };

  const togglePlan = (card: any) => {
    const venue = card.data.venue;
    if (isInPlan(venue.id)) {
      removeFromPlan(venue.id);
    } else {
      addToPlan(venue);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="relative border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="text-center pr-12">
            <h1 className="text-3xl font-bold text-white mb-2">🌆 Your Night, Curated</h1>
            <p className="text-zinc-400">
              Based on <span className="text-violet-400 font-semibold">{primaryVenue.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Card Carousel */}
      <div 
        className="flex-1 flex items-center justify-center p-6 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-2xl w-full relative">
          {/* Navigation Arrows - Desktop */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full items-center justify-center transition-all active:scale-95 z-10"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {currentIndex < cards.length - 1 && (
            <button
              onClick={handleNext}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full items-center justify-center transition-all active:scale-95 z-10"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Card */}
          <div 
            className="bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl transition-all duration-500"
            style={{
              transform: `scale(${isOpen ? 1 : 0.9})`,
            }}
          >
            {/* Hero Image */}
            <div className="relative h-80 bg-zinc-900">
              <img
                src={currentCard.data.venue.photo || '/placeholder.jpg'}
                alt={currentCard.data.venue.name}
                className="w-full h-full object-cover"
              />
              
              <div className={`absolute inset-0 bg-gradient-to-t ${currentCard.bgGradient} opacity-40`} />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

              {/* Badge */}
              <div className="absolute top-6 left-6">
                <div className={`bg-${currentCard.accentColor}-600/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2`}>
                  <span className="text-2xl">{currentCard.emoji}</span>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{currentCard.tier}</p>
                    <p className="text-white/80 text-xs">{currentCard.title}</p>
                  </div>
                </div>
              </div>

              {/* Travel Time */}
              <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-3 py-2 rounded-full flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span className="text-white text-sm font-medium">{currentCard.data.travelTime}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{currentCard.data.venue.name}</h2>
                <div className="flex items-center gap-3 text-zinc-400">
                  <span>{currentCard.data.venue.cuisine}</span>
                  <span>•</span>
                  <span>{currentCard.data.venue.price_tier || '$$'}</span>
                  <span>•</span>
                  <span>{currentCard.data.venue.neighborhood}</span>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white text-lg leading-relaxed mb-2">
                      "{currentCard.data.reasoning}"
                    </p>
                    <p className="text-zinc-500 text-sm">
                      💡 {currentCard.data.proTip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => togglePlan(currentCard)}
                  className={`py-4 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    isInPlan(currentCard.data.venue.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {isInPlan(currentCard.data.venue.id) ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added to Plan
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add to Plan
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    onVenueClick(currentCard.data.venue.id);
                    onClose();
                  }}
                  className="py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold transition-all active:scale-95"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-3 mt-8">
            {cards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentIndex 
                    ? 'w-8 h-2 bg-violet-500' 
                    : 'w-2 h-2 bg-zinc-700 hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>

          <p className="text-center text-zinc-500 text-sm mt-4">
            {currentIndex + 1} of {cards.length}
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentIndex(0)}
            className="py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold transition-all active:scale-95"
          >
            Start Over
          </button>

          <button
            onClick={onClose}
            className="py-4 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Done ({plan.length} in plan)
          </button>
        </div>
      </div>
    </div>
  );
}
