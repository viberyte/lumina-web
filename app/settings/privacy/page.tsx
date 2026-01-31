'use client';
import { useState } from 'react';
import { ArrowLeft, Download, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    locationSharing: true,
    activityTracking: true,
    personalizedAds: false
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
            <h1 className="text-lg font-medium text-white">Privacy & Data</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="divide-y divide-white/5">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white text-[15px] font-medium">Location Sharing</h3>
                <p className="text-zinc-500 text-[13px] mt-0.5">Help us find nearby venues</p>
              </div>
              <Toggle enabled={settings.locationSharing} onToggle={() => toggle('locationSharing')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white text-[15px] font-medium">Activity Tracking</h3>
                <p className="text-zinc-500 text-[13px] mt-0.5">Improve recommendations</p>
              </div>
              <Toggle enabled={settings.activityTracking} onToggle={() => toggle('activityTracking')} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white text-[15px] font-medium">Personalized Ads</h3>
                <p className="text-zinc-500 text-[13px] mt-0.5">Show relevant promotions</p>
              </div>
              <Toggle enabled={settings.personalizedAds} onToggle={() => toggle('personalizedAds')} />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Your Data</h3>
          </div>
          <div className="divide-y divide-white/5">
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
              <span className="text-white text-[14px]">Download Your Data</span>
              <Download className="w-4 h-4 text-zinc-500" />
            </button>
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
              <span className="text-white text-[14px]">View Privacy Policy</span>
              <Lock className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-500/20">
            <h3 className="text-red-400 text-[15px] font-medium">Delete All Data</h3>
          </div>
          <div className="p-5">
            <p className="text-zinc-400 text-[13px] mb-3">Permanently remove all your data from Lumina</p>
            <button className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-[14px] font-medium transition-colors">
              Delete All My Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
