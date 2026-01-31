'use client';
import { useState } from 'react';
import { Calendar, Moon, Sparkles } from 'lucide-react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (selection: { type: 'tonight' | 'weekend' | 'date'; date?: string }) => void;
}

export default function DatePickerModal({ isOpen, onClose, onSelectDate }: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState('');

  if (!isOpen) return null;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get next Friday-Sunday
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSelectTonight = () => {
    onSelectDate({ type: 'tonight' });
  };

  const handleSelectWeekend = () => {
    onSelectDate({ type: 'weekend' });
  };

  const handleSelectCustomDate = () => {
    if (selectedDate) {
      onSelectDate({ type: 'date', date: selectedDate });
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-zinc-950 w-full max-w-md rounded-3xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/20 border-b border-zinc-800 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">🌆 When are you going?</h2>
            <p className="text-zinc-400 text-sm">Choose your night so I can find the perfect spots</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Tonight Option */}
          <button
            onClick={handleSelectTonight}
            className="w-full p-4 bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-600/50 rounded-xl hover:scale-[1.02] transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Moon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">Tonight</h3>
                <p className="text-zinc-400 text-sm">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </button>

          {/* This Weekend Option */}
          <button
            onClick={handleSelectWeekend}
            className="w-full p-4 bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-600/50 rounded-xl hover:scale-[1.02] transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-white font-bold text-lg group-hover:text-violet-400 transition-colors">This Weekend</h3>
                <p className="text-zinc-400 text-sm">{nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(nextFriday.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </button>

          {/* Pick a Date Option */}
          <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-600/50 rounded-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-emerald-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-white font-bold text-lg">Pick a Date</h3>
                <p className="text-zinc-400 text-sm">Choose any future date</p>
              </div>
            </div>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={formatDate(today)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 mb-3"
            />
            
            <button
              onClick={handleSelectCustomDate}
              disabled={!selectedDate}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-semibold transition-all active:scale-95"
            >
              Continue with this date
            </button>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-medium transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
