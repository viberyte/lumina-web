'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface SettingsHeaderProps {
  title: string;
  showSave?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
}

export default function SettingsHeader({ title, showSave, onSave, saveLabel = 'Save', saving }: SettingsHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-900">
      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-900 rounded-full transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-light text-white">{title}</h1>
          </div>
          {showSave && onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-all"
            >
              {saving ? 'Saving...' : saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
