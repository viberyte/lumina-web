'use client';
import { RefreshCw, User, Settings } from 'lucide-react';

interface SophisticatedHeaderProps {
  city: string;
  mode: 'settings' | 'chat' | 'vibes';
  onModeChange: (mode: 'settings' | 'chat' | 'vibes') => void;
  onRefresh: () => void;
  onSettingsClick: () => void;
}

export default function SophisticatedHeader({
  city,
  mode,
  onModeChange,
  onRefresh,
  onSettingsClick
}: SophisticatedHeaderProps) {
  
  const getIndicatorPosition = () => {
    if (mode === 'settings') return 'left-[8.33%]';
    if (mode === 'chat') return 'left-1/2 -translate-x-1/2';
    return 'left-[75%]';
  };

  return (
    <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-zinc-900">
      <div className="px-6 py-4">
        {/* Top Row */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-white text-2xl font-extralight tracking-wider">Vibe</h1>
            <p className="text-zinc-600 text-xs font-light mt-0.5">{city}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onSettingsClick}
              className="p-2.5 hover:bg-white/5 rounded-full transition-all"
            >
              <User className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
            </button>
            <button 
              onClick={onRefresh}
              className="p-2.5 hover:bg-white/5 rounded-full transition-all"
            >
              <RefreshCw className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Toggle Bar */}
        <div className="relative">
          {/* Background track */}
          <div className="h-0.5 bg-zinc-800/50 rounded-full" />
          
          {/* Animated indicator */}
          <div 
            className={`absolute top-0 h-0.5 w-16 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out ${getIndicatorPosition()}`}
          />
          
          {/* Tab labels */}
          <div className="flex justify-between items-center pt-3">
            <button
              onClick={() => onModeChange('settings')}
              className={`transition-colors flex items-center gap-1.5 ${
                mode === 'settings' ? 'text-white' : 'text-zinc-600'
              }`}
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onModeChange('chat')}
              className={`text-sm font-light transition-colors ${
                mode === 'chat' ? 'text-white' : 'text-zinc-600'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onModeChange('vibes')}
              className={`text-sm font-light transition-colors ${
                mode === 'vibes' ? 'text-white' : 'text-zinc-600'
              }`}
            >
              Vibes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
