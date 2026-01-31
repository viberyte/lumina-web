'use client';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    newVenues: true,
    events: true,
    recommendations: true,
    marketing: false
  });

  const toggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}>
      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-medium text-white">Notifications</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="divide-y divide-white/5">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white text-[15px] font-medium">Push Notifications</h3>
                <p className="text-zinc-500 text-[13px] mt-0.5">Get notified about events</p>
              </div>
              <Toggle enabled={settings.pushEnabled} onToggle={() => toggle('pushEnabled')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white text-[15px] font-medium">Email Notifications</h3>
                <p className="text-zinc-500 text-[13px] mt-0.5">Weekly digest and updates</p>
              </div>
              <Toggle enabled={settings.emailEnabled} onToggle={() => toggle('emailEnabled')} />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Notify Me About</h3>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white text-[14px]">New Venues</h4>
                <p className="text-zinc-500 text-[12px] mt-0.5">When new spots are added</p>
              </div>
              <Toggle enabled={settings.newVenues} onToggle={() => toggle('newVenues')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white text-[14px]">Events</h4>
                <p className="text-zinc-500 text-[12px] mt-0.5">Upcoming events for you</p>
              </div>
              <Toggle enabled={settings.events} onToggle={() => toggle('events')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white text-[14px]">Recommendations</h4>
                <p className="text-zinc-500 text-[12px] mt-0.5">Personalized suggestions</p>
              </div>
              <Toggle enabled={settings.recommendations} onToggle={() => toggle('recommendations')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white text-[14px]">Marketing</h4>
                <p className="text-zinc-500 text-[12px] mt-0.5">News and promotions</p>
              </div>
              <Toggle enabled={settings.marketing} onToggle={() => toggle('marketing')} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
