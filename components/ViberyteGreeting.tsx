'use client';
import { useState, useEffect } from 'react';
import { MapPin, Sparkles, Info, ChevronRight } from 'lucide-react';

interface ViberyteGreetingProps {
  onReady: (location: string) => void;
  isReturningUser: boolean;
  userName?: string;
}

export default function ViberyteGreeting({ onReady, isReturningUser, userName }: ViberyteGreetingProps) {
  const [step, setStep] = useState<'greeting' | 'location' | 'ready'>('greeting');
  const [location, setLocation] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userName || '';
    
    if (!isReturningUser) {
      return "Hey, I'm Viberyte 🌙✨";
    }
    
    if (hour < 12) return `Early bird! What's good ${name}?`;
    if (hour < 17) return `Afternoon vibes ${name} 👋`;
    if (hour < 20) return `What's the move tonight ${name}?`;
    return `Late night energy ${name} 🌙`;
  };

  // Auto-detect location
  const detectLocation = async () => {
    setDetecting(true);
    
    // Try to get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Here you'd reverse geocode to get city
          // For now, we'll simulate
          setTimeout(() => {
            setLocation('Manhattan');
            setDetecting(false);
          }, 1500);
        },
        () => {
          setDetecting(false);
        }
      );
    } else {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (step === 'location') {
      detectLocation();
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {step === 'greeting' && (
          <div className="text-center animate-fadeIn">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-3xl" />
              <Sparkles className="w-20 h-20 text-violet-500 mx-auto relative animate-pulse" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-4">
              {getGreeting()}
            </h1>
            
            {!isReturningUser && (
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                I'm your friend who knows where to go.
                What's the move tonight?
              </p>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => setStep('location')}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-medium shadow-lg shadow-violet-500/25 hover:scale-105 transition-transform"
              >
                Let's find spots
              </button>
              
              {!isReturningUser && (
                <button
                  onClick={() => {
                    // Show more info
                    alert('Tell me more clicked - would show info modal');
                  }}
                  className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-medium hover:bg-zinc-800 transition-colors"
                >
                  Tell me more
                </button>
              )}
            </div>
            
            {!isReturningUser && (
              <p className="text-zinc-600 text-xs mt-6">
                Beta access • No ads, just real spots
              </p>
            )}
          </div>
        )}
        
        {step === 'location' && (
          <div className="text-center animate-fadeIn">
            <div className="relative inline-block mb-6">
              <MapPin className="w-16 h-16 text-violet-500 mx-auto" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Where you at tonight?
            </h2>
            
            {detecting ? (
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2 text-violet-400">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-ping" />
                  <span>Detecting location...</span>
                </div>
              </div>
            ) : location ? (
              <div className="mb-8">
                <p className="text-zinc-400 mb-4">I see you're in</p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-white text-xl font-semibold">📍 {location}</p>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => onReady(location)}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium"
                  >
                    Find spots nearby
                  </button>
                  <button
                    onClick={() => {
                      // Show city selector
                      alert('Would show city selector');
                    }}
                    className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium"
                  >
                    Somewhere else
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={detectLocation}
                  className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  Use my location
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-black text-zinc-500">or pick a city</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onReady('New York City')}
                    className="py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl hover:border-violet-500 transition-colors"
                  >
                    🗽 NYC
                  </button>
                  <button
                    onClick={() => onReady('Miami')}
                    className="py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl hover:border-violet-500 transition-colors"
                  >
                    🌴 Miami
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
