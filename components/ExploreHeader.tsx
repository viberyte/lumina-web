'use client';
import { ArrowLeft } from 'lucide-react';

interface ExploreHeaderProps {
  onBack: () => void;
  title: string;
}

export default function ExploreHeader({ onBack, title }: ExploreHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-zinc-900">
      <div className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">{title}</h1>
      </div>
    </div>
  );
}
