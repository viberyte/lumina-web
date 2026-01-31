'use client';
import { useState, useEffect } from 'react';
import { User, Settings, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    const prefs = localStorage.getItem('lumina_preferences');
    if (prefs) {
      setUserPreferences(JSON.parse(prefs));
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Clean Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-medium text-white">Profile</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        
        {/* Profile Header - Minimal */}
        <div className="flex items-center gap-4 px-5 py-6 bg-white/[0.02] border border-white/5 rounded-3xl">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white text-[17px] font-semibold">Lumina Member</h2>
            <p className="text-zinc-500 text-[13px] mt-0.5">Member since Nov 2025</p>
          </div>
        </div>

        {/* Stats - Clean Grid */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Your Stats</h3>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-zinc-400 text-[14px]">Venues visited</span>
              <span className="text-white text-[14px] font-medium">0</span>
            </div>
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-zinc-400 text-[14px]">Saved flows</span>
              <span className="text-white text-[14px] font-medium">0</span>
            </div>
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-zinc-400 text-[14px]">Favorite cuisine</span>
              <span className="text-white text-[14px] font-medium">—</span>
            </div>
          </div>
        </div>

        {/* Preferences - Simplified */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white text-[15px] font-medium">Preferences</h3>
            <button className="text-violet-400 text-[13px] font-medium hover:text-violet-300">
              Edit
            </button>
          </div>
          
          {userPreferences ? (
            <div className="divide-y divide-white/5">
              <div className="px-5 py-3.5">
                <p className="text-zinc-500 text-[12px] mb-1">Food Preferences</p>
                <p className="text-white text-[14px]">{userPreferences.foodPreferences?.join(', ') || 'Not set'}</p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-zinc-500 text-[12px] mb-1">Music Genres</p>
                <p className="text-white text-[14px]">{userPreferences.musicGenres?.join(', ') || 'Not set'}</p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-zinc-500 text-[12px] mb-1">Vibe Preferences</p>
                <p className="text-white text-[14px]">{userPreferences.vibePreferences?.join(', ') || 'Not set'}</p>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <button className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 rounded-2xl text-white text-[15px] font-medium transition-all active:scale-[0.98]">
                Complete Preferences Survey
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/[0.02] rounded-3xl overflow-hidden border border-white/5">
          <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.04] transition-colors border-b border-white/5">
            <span className="text-white text-[15px]">Dietary Restrictions</span>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
          <button 
            onClick={() => router.push('/settings')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
              <span className="text-white text-[15px]">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* Logout - Separate */}
        <div className="bg-white/[0.02] rounded-3xl overflow-hidden border border-white/5">
          <button className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.03] active:bg-white/[0.04] transition-colors">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-red-400 text-[15px] font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
