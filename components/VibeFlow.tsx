'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface VibeFlowProps {
  city: string;
  onComplete: (preferences: VibePreferences) => void;
  onBack?: () => void;
}

export interface VibePreferences {
  city: string;
  who: string;
  vibe: string;
  cuisine?: string;
  music?: string;
}

export default function VibeFlow({ city, onComplete, onBack }: VibeFlowProps) {
  const [step, setStep] = useState<'who' | 'vibe' | 'cuisine' | 'music'>('who');
  const [preferences, setPreferences] = useState<Partial<VibePreferences>>({
    city,
  });

  const whoOptions = [
    { 
      value: 'date', 
      label: 'Date Night', 
      subtitle: 'Romantic and intimate',
      gradient: 'from-rose-600/20 via-pink-600/20 to-fuchsia-600/20'
    },
    { 
      value: 'business', 
      label: 'Business', 
      subtitle: 'Professional setting',
      gradient: 'from-slate-600/20 via-zinc-600/20 to-gray-600/20'
    },
    { 
      value: 'solo', 
      label: 'Solo Vibes', 
      subtitle: 'Me, myself, and I',
      gradient: 'from-violet-600/20 via-purple-600/20 to-indigo-600/20'
    },
    { 
      value: 'friends', 
      label: 'Friends', 
      subtitle: 'Group night out',
      gradient: 'from-orange-600/20 via-amber-600/20 to-yellow-600/20'
    },
  ];

  const vibeOptions = [
    { 
      value: 'dinner', 
      label: 'Dinner', 
      subtitle: 'Fine dining experience',
      gradient: 'from-emerald-600/20 via-green-600/20 to-teal-600/20',
      hasCuisine: true,
      hasMusic: true
    },
    { 
      value: 'lounge', 
      label: 'Lounge', 
      subtitle: 'Relaxed atmosphere',
      gradient: 'from-blue-600/20 via-cyan-600/20 to-sky-600/20',
      hasCuisine: false,
      hasMusic: true
    },
    { 
      value: 'attraction', 
      label: 'Attraction', 
      subtitle: 'Experience something new',
      gradient: 'from-purple-600/20 via-violet-600/20 to-fuchsia-600/20',
      hasCuisine: false,
      hasMusic: false
    },
    { 
      value: 'cafe', 
      label: 'Cafe', 
      subtitle: 'Coffee and conversation',
      gradient: 'from-amber-600/20 via-orange-600/20 to-red-600/20',
      hasCuisine: false,
      hasMusic: false
    },
    { 
      value: 'events', 
      label: 'Events', 
      subtitle: 'Live entertainment',
      gradient: 'from-pink-600/20 via-rose-600/20 to-red-600/20',
      hasCuisine: false,
      hasMusic: true
    },
  ];

  const cuisineOptions = [
    { value: 'soul-food', label: 'Soul Food', subtitle: 'Southern comfort', gradient: 'from-orange-600/20 to-amber-600/20' },
    { value: 'italian', label: 'Italian', subtitle: 'Pasta, pizza, amore', gradient: 'from-green-600/20 to-red-600/20' },
    { value: 'indian', label: 'Indian', subtitle: 'Spices and curry', gradient: 'from-orange-600/20 to-yellow-600/20' },
    { value: 'latin', label: 'Latin', subtitle: 'Bold flavors', gradient: 'from-red-600/20 to-yellow-600/20' },
    { value: 'american', label: 'American', subtitle: 'Classic favorites', gradient: 'from-blue-600/20 to-red-600/20' },
    { value: 'caribbean', label: 'Caribbean', subtitle: 'Island vibes', gradient: 'from-green-600/20 to-yellow-600/20' },
    { value: 'asian', label: 'Asian', subtitle: 'Diverse flavors', gradient: 'from-red-600/20 to-orange-600/20' },
    { value: 'mediterranean', label: 'Mediterranean', subtitle: 'Fresh and light', gradient: 'from-blue-600/20 to-green-600/20' },
    { value: 'ethiopian', label: 'Ethiopian', subtitle: 'Injera and spice', gradient: 'from-yellow-600/20 to-red-600/20' },
    { value: 'japanese', label: 'Japanese', subtitle: 'Sushi and ramen', gradient: 'from-red-600/20 to-pink-600/20' },
    { value: 'french', label: 'French', subtitle: 'Fine dining', gradient: 'from-blue-600/20 to-violet-600/20' },
    { value: 'spanish', label: 'Spanish', subtitle: 'Tapas and paella', gradient: 'from-red-600/20 to-yellow-600/20' },
    { value: 'not-sure', label: 'Not Sure Yet', subtitle: 'Show me everything', gradient: 'from-violet-600/20 to-fuchsia-600/20' },
  ];

  const getMusicOptions = () => {
    const who = preferences.who;

    if (who === 'date') {
      return [
        { value: 'rnb', label: 'R&B', subtitle: 'Smooth and soulful', gradient: 'from-rose-600/20 to-pink-600/20' },
        { value: 'jazz', label: 'Jazz', subtitle: 'Sophisticated vibes', gradient: 'from-purple-600/20 to-violet-600/20' },
        { value: 'latin', label: 'Latin', subtitle: 'Salsa, bachata, reggaeton', gradient: 'from-orange-600/20 to-red-600/20' },
        { value: 'live', label: 'Live Music', subtitle: 'Intimate performances', gradient: 'from-blue-600/20 to-cyan-600/20' },
        { value: 'skip', label: 'Skip', subtitle: 'No preference', gradient: 'from-zinc-600/20 to-gray-600/20' },
      ];
    }

    if (who === 'business') {
      return [
        { value: 'ambient', label: 'Ambient', subtitle: 'Soft background', gradient: 'from-slate-600/20 to-zinc-600/20' },
        { value: 'jazz', label: 'Jazz', subtitle: 'Professional setting', gradient: 'from-purple-600/20 to-violet-600/20' },
        { value: 'classical', label: 'Classical', subtitle: 'Refined atmosphere', gradient: 'from-indigo-600/20 to-blue-600/20' },
        { value: 'quiet', label: 'Quiet', subtitle: 'Easy conversation', gradient: 'from-zinc-600/20 to-gray-600/20' },
        { value: 'skip', label: 'Skip', subtitle: 'No preference', gradient: 'from-zinc-600/20 to-gray-600/20' },
      ];
    }

    if (who === 'solo') {
      return [
        { value: 'afrobeats', label: 'Afrobeats', subtitle: 'Vibrant energy', gradient: 'from-orange-600/20 to-amber-600/20' },
        { value: 'hip-hop', label: 'Hip-Hop', subtitle: 'Urban classics', gradient: 'from-violet-600/20 to-purple-600/20' },
        { value: 'house', label: 'House', subtitle: 'Electronic beats', gradient: 'from-cyan-600/20 to-blue-600/20' },
        { value: 'chill', label: 'Chill', subtitle: 'Relaxed vibes', gradient: 'from-teal-600/20 to-green-600/20' },
        { value: 'skip', label: 'Skip', subtitle: 'No preference', gradient: 'from-zinc-600/20 to-gray-600/20' },
      ];
    }

    if (who === 'friends') {
      return [
        { value: 'afrobeats', label: 'Afrobeats', subtitle: 'Dance all night', gradient: 'from-orange-600/20 to-amber-600/20' },
        { value: 'hip-hop', label: 'Hip-Hop', subtitle: 'Turn up', gradient: 'from-violet-600/20 to-purple-600/20' },
        { value: 'latin', label: 'Latin', subtitle: 'Reggaeton, salsa', gradient: 'from-red-600/20 to-pink-600/20' },
        { value: 'dancehall', label: 'Dancehall', subtitle: 'Caribbean vibes', gradient: 'from-green-600/20 to-emerald-600/20' },
        { value: 'house', label: 'House/EDM', subtitle: 'Club bangers', gradient: 'from-blue-600/20 to-cyan-600/20' },
        { value: 'soca', label: 'Soca', subtitle: 'Carnival energy', gradient: 'from-yellow-600/20 to-orange-600/20' },
        { value: 'skip', label: 'Skip', subtitle: 'No preference', gradient: 'from-zinc-600/20 to-gray-600/20' },
      ];
    }

    return [
      { value: 'afrobeats', label: 'Afrobeats', subtitle: 'African rhythms', gradient: 'from-orange-600/20 to-amber-600/20' },
      { value: 'hip-hop', label: 'Hip-Hop', subtitle: 'Urban classics', gradient: 'from-violet-600/20 to-purple-600/20' },
      { value: 'latin', label: 'Latin', subtitle: 'Reggaeton, salsa', gradient: 'from-red-600/20 to-pink-600/20' },
      { value: 'rnb', label: 'R&B', subtitle: 'Smooth soul', gradient: 'from-rose-600/20 to-pink-600/20' },
      { value: 'skip', label: 'Skip', subtitle: 'No preference', gradient: 'from-zinc-600/20 to-gray-600/20' },
    ];
  };

  const handleBack = () => {
    if (step === 'music') {
      // If came from dinner, go back to cuisine
      if (preferences.vibe === 'dinner') {
        setStep('cuisine');
      } else {
        setStep('vibe');
      }
    } else if (step === 'cuisine') {
      setStep('vibe');
    } else if (step === 'vibe') {
      setStep('who');
    } else if (onBack) {
      onBack();
    }
  };

  const handleWhoSelect = (who: string) => {
    setPreferences(prev => ({ ...prev, who }));
    setStep('vibe');
  };

  const handleVibeSelect = (vibe: string) => {
    const selectedVibe = vibeOptions.find(v => v.value === vibe);
    setPreferences(prev => ({ ...prev, vibe }));
    
    // If dinner, go to cuisine
    if (selectedVibe?.hasCuisine) {
      setStep('cuisine');
    } 
    // If has music, go to music
    else if (selectedVibe?.hasMusic) {
      setStep('music');
    } 
    // Otherwise complete
    else {
      onComplete({ ...preferences, vibe } as VibePreferences);
    }
  };

  const handleCuisineSelect = (cuisine: string) => {
    setPreferences(prev => ({ ...prev, cuisine }));
    
    // Check if this vibe has music step
    const selectedVibe = vibeOptions.find(v => v.value === preferences.vibe);
    if (selectedVibe?.hasMusic) {
      setStep('music');
    } else {
      onComplete({ ...preferences, cuisine } as VibePreferences);
    }
  };

  const handleMusicSelect = (music: string) => {
    const finalPrefs = { ...preferences, music: music === 'skip' ? undefined : music } as VibePreferences;
    onComplete(finalPrefs);
  };

  const getQuestion = () => {
    if (step === 'who') return 'Who are you with tonight?';
    if (step === 'vibe') return 'What is the vibe?';
    if (step === 'cuisine') return 'What cuisine are you craving?';
    if (step === 'music') return 'What is your music atmosphere?';
  };

  const getCurrentOptions = () => {
    if (step === 'who') return whoOptions;
    if (step === 'vibe') return vibeOptions;
    if (step === 'cuisine') return cuisineOptions;
    if (step === 'music') return getMusicOptions();
    return [];
  };

  const handleSelect = (value: string) => {
    if (step === 'who') handleWhoSelect(value);
    else if (step === 'vibe') handleVibeSelect(value);
    else if (step === 'cuisine') handleCuisineSelect(value);
    else if (step === 'music') handleMusicSelect(value);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(217, 70, 239, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
        />
      </div>

      <button
        onClick={handleBack}
        className="absolute top-6 left-6 z-20 p-3 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur-sm border border-zinc-800 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl w-full relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'who' ? 'bg-violet-500' : 'bg-zinc-700'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'vibe' ? 'bg-violet-500' : 'bg-zinc-700'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'cuisine' ? 'bg-violet-500' : 'bg-zinc-700'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'music' ? 'bg-violet-500' : 'bg-zinc-700'}`} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-light text-white">
              {getQuestion()}
            </h2>

            <p className="text-zinc-400 text-lg">{city}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {getCurrentOptions().map((option, index) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(option.value)}
                  className="group relative overflow-hidden bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-violet-500/50 transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative space-y-2">
                    <h3 className="text-xl font-light text-white">{option.label}</h3>
                    <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      {option.subtitle}
                    </p>
                  </div>

                  <div className="absolute bottom-4 right-4 text-zinc-600 group-hover:text-violet-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
