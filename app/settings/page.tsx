'use client';
import { useRouter } from 'next/navigation';
import { User, Bell, Shield, Heart, ChevronRight, ArrowLeft, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  const settingsSections = [
    {
      id: 'account',
      icon: User,
      title: 'Account',
      description: 'Profile and personal info',
      path: '/settings/account'
    },
    {
      id: 'preferences',
      icon: Heart,
      title: 'Preferences',
      description: 'Customize recommendations',
      path: '/settings/preferences'
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Alerts and updates',
      path: '/settings/notifications'
    },
    {
      id: 'privacy',
      icon: Shield,
      title: 'Privacy & Data',
      description: 'Your data controls',
      path: '/settings/privacy'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Simplified Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-medium text-white">Settings</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">
        
        {/* Clean List - iOS Style */}
        <div className="mt-4 bg-white/[0.02] rounded-3xl overflow-hidden border border-white/5">
          {settingsSections.map((section, index) => {
            const Icon = section.icon;
            const isLast = index === settingsSections.length - 1;
            
            return (
              <button
                key={section.id}
                onClick={() => router.push(section.path)}
                className="w-full group"
              >
                <div className={`
                  px-5 py-4 flex items-center gap-4
                  hover:bg-white/[0.03] active:bg-white/[0.04]
                  transition-colors
                  ${!isLast ? 'border-b border-white/5' : ''}
                `}>
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white text-[15px] font-medium">{section.title}</h3>
                    <p className="text-zinc-500 text-[13px] mt-0.5">{section.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Sign Out - Separate Section */}
        <div className="mt-4 bg-white/[0.02] rounded-3xl overflow-hidden border border-white/5">
          <button className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] active:bg-white/[0.04] transition-colors">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-red-400 text-[15px] font-medium">Sign Out</h3>
            </div>
          </button>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-xs">Lumina v2.0</p>
          <p className="text-zinc-700 text-xs mt-1">© 2025 Viberyte</p>
        </div>
      </div>
    </div>
  );
}
