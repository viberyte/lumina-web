'use client';
import { Sparkles, RefreshCw } from 'lucide-react';

interface RecommendationSummaryProps {
  context: {
    who?: string;
    vibe?: string;
    cuisine?: string;
    musicGenre?: string;
  };
  venueCount: number;
  city: string;
  onViewResults: () => void;
  onChangeVibe: () => void;
}

export default function RecommendationSummary({ 
  context, 
  venueCount, 
  city,
  onViewResults,
  onChangeVibe 
}: RecommendationSummaryProps) {
  
  // Build the "Perfect for" string
  const perfectFor = [
    context.who,
    context.vibe,
    context.cuisine || context.musicGenre
  ].filter(Boolean).join(' • ');

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl">
      {/* Icon Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-medium">Perfect for:</h3>
          <p className="text-zinc-400 text-sm">{perfectFor}</p>
        </div>
      </div>

      {/* Venue Count */}
      <div className="mb-4 py-3 px-4 bg-black/30 rounded-xl border border-zinc-800/50">
        <p className="text-white text-center">
          Found <span className="font-semibold text-violet-400">{venueCount}</span> spots in{' '}
          <span className="font-semibold text-violet-400">{city}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onViewResults}
          className="flex-1 py-3 px-4 bg-white hover:bg-zinc-100 text-black rounded-xl font-medium transition-all transform hover:scale-[1.02]"
        >
          View Results
        </button>
        <button
          onClick={onChangeVibe}
          className="flex items-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-zinc-800 hover:border-zinc-700 text-white rounded-xl font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Change Vibe
        </button>
      </div>

      {/* Additional Info */}
      <p className="mt-4 text-xs text-zinc-600 text-center">
        Curated recommendations based on your preferences
      </p>
    </div>
  );
}
