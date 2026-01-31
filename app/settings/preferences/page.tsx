'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Music, Utensils, Wine, Coffee } from 'lucide-react';
import { useState } from 'react';

export default function PreferencesPage() {
  const router = useRouter();
  const [selectedFood, setSelectedFood] = useState(['Italian', 'Japanese']);
  const [selectedMusic, setSelectedMusic] = useState(['Afrobeats', 'R&B']);
  const [selectedVibes, setSelectedVibes] = useState(['Date Night', 'Rooftop']);

  const foodOptions = ['Italian', 'Japanese', 'Mexican', 'Soul Food', 'Caribbean', 'French', 'Asian', 'American', 'Seafood'];
  const musicOptions = ['Afrobeats', 'Hip-Hop', 'R&B', 'House', 'Latin', 'Amapiano', 'Jazz', 'Live Music'];
  const vibeOptions = ['Date Night', 'Rooftop', 'Upscale', 'Chill', 'High Energy', 'Intimate', 'Trendy', 'Hookah'];

  const toggleSelection = (item: string, list: string[], setter: any) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-zinc-900 rounded-full transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-light text-white">Preferences</h1>
            </div>
            <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium text-white transition-all">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Utensils className="w-5 h-5 text-violet-400" />
              <h3 className="text-white font-medium">Food Preferences</h3>
            </div>
            <p className="text-zinc-500 text-sm mb-4">Select your favorite cuisines</p>
            <div className="flex flex-wrap gap-2">
              {foodOptions.map(food => (
                <button
                  key={food}
                  onClick={() => toggleSelection(food, selectedFood, setSelectedFood)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedFood.includes(food)
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {food}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Music className="w-5 h-5 text-violet-400" />
              <h3 className="text-white font-medium">Music Preferences</h3>
            </div>
            <p className="text-zinc-500 text-sm mb-4">What music do you vibe to?</p>
            <div className="flex flex-wrap gap-2">
              {musicOptions.map(music => (
                <button
                  key={music}
                  onClick={() => toggleSelection(music, selectedMusic, setSelectedMusic)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedMusic.includes(music)
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {music}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-violet-400" />
              <h3 className="text-white font-medium">Vibe Preferences</h3>
            </div>
            <p className="text-zinc-500 text-sm mb-4">What's your ideal scene?</p>
            <div className="flex flex-wrap gap-2">
              {vibeOptions.map(vibe => (
                <button
                  key={vibe}
                  onClick={() => toggleSelection(vibe, selectedVibes, setSelectedVibes)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedVibes.includes(vibe)
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wine className="w-5 h-5 text-violet-400" />
              <h3 className="text-white font-medium">Price Range</h3>
            </div>
            <div className="space-y-3">
              {['$', '$$', '$$$', '$$$$'].map(price => (
                <button key={price} className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-500 rounded-xl text-left text-white transition-all flex items-center justify-between">
                  <span>{price}</span>
                  <input type="checkbox" className="w-5 h-5 rounded accent-violet-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
