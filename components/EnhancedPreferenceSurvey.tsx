'use client';
import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface EnhancedPreferenceSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (preferences: any) => void;
}

export default function EnhancedPreferenceSurvey({ isOpen, onClose, onComplete }: EnhancedPreferenceSurveyProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    // Step 1: Basic Info
    ageRange: '',
    datingStatus: '',
    profession: '',
    
    // Step 2: Food
    favoriteCuisines: [] as string[],
    dietaryRestrictions: [] as string[],
    budgetRange: '',
    
    // Step 3: Music & Vibes
    musicGenres: [] as string[],
    venueTypes: [] as string[],
    atmosphere: [] as string[],
    
    // Step 4: Business Values
    businessSupport: [] as string[],
    
    // Step 5: Social
    typicalGroupSize: '',
    preferredTiming: [] as string[],
    occasions: [] as string[]
  });

  const totalSteps = 5;

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: string, item: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: (prev[key as keyof typeof prev] as string[]).includes(item)
        ? (prev[key as keyof typeof prev] as string[]).filter(i => i !== item)
        : [...(prev[key as keyof typeof prev] as string[]), item]
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    onComplete(preferences);
    onClose();
  };

  if (!isOpen) return null;

  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const datingStatuses = ['Single', 'Dating', 'In a relationship', 'Married', 'Prefer not to say'];
  const professions = ['Tech', 'Finance', 'Creative', 'Healthcare', 'Education', 'Entrepreneur', 'Student', 'Other'];
  
  const cuisines = ['Italian', 'Japanese', 'Mexican', 'Caribbean', 'Soul Food', 'French', 'Chinese', 'Thai', 'Indian', 'Mediterranean', 'American', 'Korean'];
  const dietary = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'No Restrictions'];
  const budgets = ['$ (Under $20)', '$$ ($20-40)', '$$$ ($40-75)', '$$$$ ($75+)'];
  
  const musicGenres = ['Hip-Hop', 'R&B', 'Afrobeats', 'Amapiano', 'House', 'Techno', 'Latin', 'Reggaeton', 'Reggae', 'Jazz', 'Live Bands', 'Top 40'];
  const venueTypes = ['Lounges', 'Nightclubs', 'Rooftop Bars', 'Wine Bars', 'Dive Bars', 'Speakeasies', 'Beach Clubs', 'Sports Bars'];
  const atmospheres = ['Intimate', 'Energetic', 'Laid-back', 'Upscale', 'Casual', 'Romantic', 'Social', 'Quiet'];
  
  const businessSupport = [
    'Black-owned',
    'Latina/Latino-owned',
    'Asian-owned',
    'LGBTQ+-owned',
    'Women-owned',
    'Veteran-owned',
    'Family-owned',
    'Minority-owned',
    'Local businesses',
    'No preference'
  ];
  
  const groupSizes = ['Solo', '2 people (date/friend)', '3-4 people', '5-8 people', '9+ people (large group)'];
  const timings = ['Weekday evenings', 'Weekend nights', 'Brunch/Day', 'Late night (after 11pm)', 'Happy hour'];
  const occasions = ['Date night', 'Friends hangout', 'Business meeting', 'Celebration', 'Special occasion', 'Casual outing'];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-zinc-950 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl text-white font-light">Build Your Profile</h2>
              <p className="text-zinc-500 text-sm mt-1">Step {step} of {totalSteps}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-medium mb-4">Let's get to know you</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Age Range</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ageRanges.map(age => (
                        <button
                          key={age}
                          onClick={() => updatePreference('ageRange', age)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.ageRange === age
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Relationship Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {datingStatuses.map(status => (
                        <button
                          key={status}
                          onClick={() => updatePreference('datingStatus', status)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.datingStatus === status
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Profession</label>
                    <div className="grid grid-cols-3 gap-2">
                      {professions.map(prof => (
                        <button
                          key={prof}
                          onClick={() => updatePreference('profession', prof)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.profession === prof
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {prof}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Food Preferences */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-medium mb-4">Food Preferences</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Favorite Cuisines (select all that apply)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {cuisines.map(cuisine => (
                        <button
                          key={cuisine}
                          onClick={() => toggleArrayItem('favoriteCuisines', cuisine)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.favoriteCuisines.includes(cuisine)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Dietary Restrictions</label>
                    <div className="grid grid-cols-3 gap-2">
                      {dietary.map(diet => (
                        <button
                          key={diet}
                          onClick={() => toggleArrayItem('dietaryRestrictions', diet)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.dietaryRestrictions.includes(diet)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {diet}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Typical Budget Per Person</label>
                    <div className="grid grid-cols-2 gap-2">
                      {budgets.map(budget => (
                        <button
                          key={budget}
                          onClick={() => updatePreference('budgetRange', budget)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.budgetRange === budget
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {budget}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Music & Vibes */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-medium mb-4">Music & Atmosphere</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Music Genres (select all that apply)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {musicGenres.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleArrayItem('musicGenres', genre)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.musicGenres.includes(genre)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Venue Types</label>
                    <div className="grid grid-cols-3 gap-2">
                      {venueTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => toggleArrayItem('venueTypes', type)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.venueTypes.includes(type)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Preferred Atmosphere</label>
                    <div className="grid grid-cols-3 gap-2">
                      {atmospheres.map(atm => (
                        <button
                          key={atm}
                          onClick={() => toggleArrayItem('atmosphere', atm)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.atmosphere.includes(atm)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {atm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Business Values */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-medium mb-4">Support Your Values</h3>
                <p className="text-zinc-400 text-sm mb-4">What types of businesses do you prefer to support?</p>
                
                <div className="grid grid-cols-2 gap-2">
                  {businessSupport.map(value => (
                    <button
                      key={value}
                      onClick={() => toggleArrayItem('businessSupport', value)}
                      className={`px-4 py-3 rounded-xl text-sm font-light transition-all flex items-center justify-between ${
                        preferences.businessSupport.includes(value)
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span>{value}</span>
                      {preferences.businessSupport.includes(value) && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Social Preferences */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg font-medium mb-4">Social Preferences</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Typical Group Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {groupSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => updatePreference('typicalGroupSize', size)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.typicalGroupSize === size
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Preferred Times (select all that apply)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {timings.map(time => (
                        <button
                          key={time}
                          onClick={() => toggleArrayItem('preferredTiming', time)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.preferredTiming.includes(time)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block">Common Occasions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {occasions.map(occ => (
                        <button
                          key={occ}
                          onClick={() => toggleArrayItem('occasions', occ)}
                          className={`px-4 py-3 rounded-xl text-sm font-light transition-all ${
                            preferences.occasions.includes(occ)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {occ}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-6">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl font-light transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-light transition-all flex items-center justify-center gap-2"
            >
              {step === totalSteps ? 'Complete' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
