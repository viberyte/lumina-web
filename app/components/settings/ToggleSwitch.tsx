'use client';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}

export default function ToggleSwitch({ enabled, onToggle, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-sm">{label}</p>
        {description && <p className="text-zinc-500 text-xs mt-1">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
          enabled ? 'bg-violet-600' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
