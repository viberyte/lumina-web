'use client';
import { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'premium';
}

export default function SettingsCard({ icon: Icon, title, children, variant = 'default' }: SettingsCardProps) {
  const variants = {
    default: 'bg-zinc-900/50 border-zinc-800',
    danger: 'bg-red-950/20 border-red-900/50',
    premium: 'bg-violet-900/20 border-violet-700/50'
  };

  const titleColors = {
    default: 'text-white',
    danger: 'text-red-400',
    premium: 'text-white'
  };

  const iconColors = {
    default: 'text-violet-400',
    danger: 'text-red-400',
    premium: 'text-violet-400'
  };

  return (
    <div className={`${variants[variant]} border rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
        <h3 className={`${titleColors[variant]} font-medium`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
