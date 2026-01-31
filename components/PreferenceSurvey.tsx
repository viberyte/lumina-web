'use client';
import { useState } from 'react';
import { X, Sparkles, Music, UtensilsCrossed, Cigarette, Users } from 'lucide-react';

interface PreferenceSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (preferences: any) => void;
}

export default function PreferenceSurvey({ isOpen, onClose, onComplete }: PreferenceSurveyProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    age: '',
    gender: '',
    cuisines: [] as string[],
    musicGenres: [] as string[],
    typicalNight: [] as string[],
    hookah: ''
  });

  const cuisineOptions = [
    'Italian', 'Japanese', 'Mexican', 'Caribbean', 'American', 
    'Soul Food', 'French', 'Chinese', 'Thai', 'Mediterranean',
    'Indian', 'Korean', 'Vietnamese', 'Latin American'
  ];

  const musicOptions = [
    'Afrobeats', 'Amapiano', 'Latin', 'Reggaeton', 'Hip-Hop', 
    'R&B', 'House', 'Techno', 'Live Music', 'Jazz', 'Reggae', 'Dancehall'
  ];

  const nightOutOptions = [
    'Solo explorer', 'Date nights', 'Friends', 'Group parties', 'Business dinners'
  ];

  const hookahOptions = [
    'Love hookah lounges', 'Don\'t mind it', 'Prefer smoke-free'
  ];

  const toggleSelection = (field: string, value: string) => {
    const current = preferences[field as keyof typeof preferences] as string[];
    if (current.includes(value)) {
      setPreferences({
        ...preferences,
        [field]: current.filter(v => v !== value)
      });
    } else {
      setPreferences({
        ...preferences,
        [field]: [...current, value]
      });
    }
  };

  const handleSubmit = () => {
    onComplete(preferences);
    onClose();
  };

  const canProceed = () => {
    switch(step) {
      case 1: return preferences.age !== '' && parseInt(preferences.age) >= 18 && preferences.gender !== '';
      case 2: return preferences.hookah !== '';
      case 3: return preferences.cuisines.length >= 3;
      case 4: return preferences.musicGenres.length >= 2;
      case 5: return preferences.typicalNight.length >= 1;
      default: return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-semibold">Set Your Vibe</h2>
                <p className="text-zinc-500 text-sm">Step {step} of 5</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Age & Gender */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-semibold mb-2">How old are you?</h3>
                <p className="text-zinc-400 text-sm mb-4">Must be 18+ to use Lumina</p>
                <input
                  type="number"
                  value={preferences.age}
                  onChange={(e) => setPreferences({ ...preferences, age: e.target.value })}
                  placeholder="Enter your age"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-violet-500" />
                  <h3 className="text-white text-lg font-semibold">Gender</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Prefer not to say'].map(option => (
                    <button
                      key={option}
                      onClick={() => setPreferences({ ...preferences, gender: option })}
                      className={`px-4 py-3 rounded-xl text-sm transition-all ${
                        preferences.gender === option
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Hookah */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cigarette className="w-5 h-5 text-violet-500" />
                <h3 className="text-white text-lg font-semibold">How do you feel about hookah?</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">Helps us pick the right lounges</p>
              <div className="space-y-2">
                {hookahOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => setPreferences({ ...preferences, hookah: option })}
                    className={`w-full px-4 py-4 rounded-xl text-sm text-left transition-all ${
                      preferences.hookah === option
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Cuisines */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="w-5 h-5 text-violet-500" />
                <h3 className="text-white text-lg font-semibold">What cuisines do you love?</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">Select at least 3</p>
              <div className="grid grid-cols-2 gap-2">
                {cuisineOptions.map(cuisine => (
                  <button
                    key={cuisine}
                    onClick={() => toggleSelection('cuisines', cuisine)}
                    className={`px-4 py-3 rounded-xl text-sm transition-all ${
                      preferences.cuisines.includes(cuisine)
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Music */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-5 h-5 text-violet-500" />
                <h3 className="text-white text-lg font-semibold">What music gets you going?</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">Select at least 2</p>
              <div className="grid grid-cols-2 gap-2">
                {musicOptions.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleSelection('musicGenres', genre)}
                    className={`px-4 py-3 rounded-xl text-sm transition-all ${
                      preferences.musicGenres.includes(genre)
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Typical Night */}
          {step === 5 && (
            <div>
              <h3 className="text-white text-lg font-semibold mb-2">How do you usually go out?</h3>
              <p className="text-zinc-400 text-sm mb-6">Select all that apply</p>
              <div className="space-y-2">
                {nightOutOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => toggleSelection('typicalNight', option)}
                    className={`w-full px-4 py-3 rounded-xl text-sm text-left transition-all ${
                      preferences.typicalNight.includes(option)
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-all"
              >
                Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                Complete & Unlock Flow Me ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
