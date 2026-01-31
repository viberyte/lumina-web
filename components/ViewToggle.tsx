'use client';

import { LayoutGrid, Map } from 'lucide-react';

interface ViewToggleProps {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          view === 'list'
            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
            : 'text-white/60 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>List</span>
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          view === 'map'
            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
            : 'text-white/60 hover:text-white'
        }`}
      >
        <Map className="w-4 h-4" />
        <span>Map</span>
      </button>
    </div>
  );
}
