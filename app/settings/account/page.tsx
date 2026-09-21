'use client';
import { useState } from 'react';
import { User, Mail, MapPin, Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-medium text-white">Account</h1>
            <button onClick={() => setEditMode(!editMode)} className="text-violet-400 text-sm font-medium">
              {editMode ? 'Save' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        
        {/* Profile Photo */}
        <div className="flex justify-center py-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            {editMode && (
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-900 border-2 border-black rounded-full flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Personal Information</h3>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-5 py-3.5">
              <label className="text-zinc-500 text-[12px] block mb-1.5">Full Name</label>
              <input disabled={!editMode} defaultValue="Viberyte Member" className="w-full bg-transparent text-white text-[14px] disabled:opacity-70 outline-none" />
            </div>
            <div className="px-5 py-3.5">
              <label className="text-zinc-500 text-[12px] block mb-1.5">Username</label>
              <input disabled={!editMode} defaultValue="@luminamember" className="w-full bg-transparent text-white text-[14px] disabled:opacity-70 outline-none" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Contact Information</h3>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-5 py-3.5">
              <label className="text-zinc-500 text-[12px] block mb-1.5">Email</label>
              <input disabled={!editMode} type="email" defaultValue="member@lumina.app" className="w-full bg-transparent text-white text-[14px] disabled:opacity-70 outline-none" />
            </div>
            <div className="px-5 py-3.5">
              <label className="text-zinc-500 text-[12px] block mb-1.5">Phone</label>
              <input disabled={!editMode} type="tel" placeholder="Add phone" className="w-full bg-transparent text-white text-[14px] disabled:opacity-70 outline-none placeholder-zinc-600" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3.5">
            <label className="text-zinc-500 text-[12px] block mb-1.5">Primary City</label>
            <select disabled={!editMode} className="w-full bg-transparent text-white text-[14px] disabled:opacity-70 outline-none">
              <option>New York City</option>
              <option>Brooklyn</option>
              <option>Queens</option>
            </select>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-white text-[15px] font-medium">Account Details</h3>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-5 py-3.5 flex justify-between">
              <span className="text-zinc-400 text-[14px]">Member Since</span>
              <span className="text-white text-[14px]">November 2025</span>
            </div>
            <div className="px-5 py-3.5 flex justify-between">
              <span className="text-zinc-400 text-[14px]">Account Type</span>
              <span className="text-violet-400 text-[14px] font-medium">Premium</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-500/20">
            <h3 className="text-red-400 text-[15px] font-medium">Danger Zone</h3>
          </div>
          <div className="p-5">
            <p className="text-zinc-400 text-[13px] mb-3">Once you delete your account, there is no going back.</p>
            <button className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-[14px] font-medium transition-colors">
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
