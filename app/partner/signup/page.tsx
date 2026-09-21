'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Suspense } from 'react';

const TIER_INFO: Record<string, { name: string; price: string; color: string }> = {
  claimed: { name: 'Claimed', price: 'Free', color: 'zinc' },
  spotlight: { name: 'Spotlight', price: '$25/mo', color: 'blue' },
  elite: { name: 'Elite', price: '$44.99/mo', color: 'violet' },
};

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTier, setSelectedTier] = useState('claimed');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    venueName: '',
    venueAddress: '',
  });

  // Read tier from URL parameter
  useEffect(() => {
    const tier = searchParams.get('tier');
    if (tier && TIER_INFO[tier]) {
      setSelectedTier(tier);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/partner/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tier: selectedTier }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // If they selected a paid tier, redirect to upgrade
      if (selectedTier !== 'claimed') {
        // Redirect to upgrade API which will create Stripe checkout
        const upgradeRes = await fetch('/api/partner/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ targetTier: selectedTier }),
        });
        
        const upgradeData = await upgradeRes.json();
        
        if (upgradeData.url) {
          window.location.href = upgradeData.url;
          return;
        }
      }

      router.push('/partner/dashboard?welcome=true');
    } catch (err) {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  const canContinue = step === 1 
    ? form.name && form.email && form.password && form.password.length >= 8
    : form.venueName;

  const tierInfo = TIER_INFO[selectedTier];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Viberyte <span className="text-zinc-600 font-normal text-sm">Partner</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-5 pb-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-white mb-2">
              {step === 1 ? 'Create account' : 'Add your venue'}
            </h1>
            <p className="text-zinc-500">
              {step === 1 ? 'Start your 14-day free trial' : 'Where will you receive bookings?'}
            </p>
          </div>

          {/* Selected Tier Badge */}
          {selectedTier !== 'claimed' && (
            <div className={`mb-6 p-4 rounded-xl border ${
              selectedTier === 'elite' 
                ? 'bg-violet-500/10 border-violet-500/30' 
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Selected plan</p>
                  <p className={`font-semibold ${
                    selectedTier === 'elite' ? 'text-violet-400' : 'text-blue-400'
                  }`}>{tierInfo.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{tierInfo.price}</p>
                  <p className="text-xs text-zinc-500">after trial</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            <div className="flex-1 h-1 rounded-full bg-white" />
            <div className={step >= 2 ? 'flex-1 h-1 rounded-full bg-white' : 'flex-1 h-1 rounded-full bg-zinc-800'} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Your name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                    placeholder="you@venue.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && form.password.length < 8 && (
                    <p className="text-amber-500 text-xs mt-2">Password must be at least 8 characters</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                    placeholder="(555) 555-5555"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Venue or business name</label>
                  <input
                    type="text"
                    value={form.venueName}
                    onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                    className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                    placeholder="The Grand Lounge"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-500 mb-2">Address (optional)</label>
                  <input
                    type="text"
                    value={form.venueAddress}
                    onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
                    className="w-full bg-zinc-900/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-sm transition-all"
                    placeholder="123 Main St, New York, NY"
                  />
                </div>

                <div className={`rounded-2xl p-5 mt-6 ${
                  selectedTier === 'elite' ? 'bg-violet-500/5' :
                  selectedTier === 'spotlight' ? 'bg-blue-500/5' :
                  'bg-emerald-500/5'
                }`}>
                  <h3 className={`text-sm font-medium mb-3 ${
                    selectedTier === 'elite' ? 'text-violet-400' :
                    selectedTier === 'spotlight' ? 'text-blue-400' :
                    'text-emerald-400'
                  }`}>
                    {selectedTier === 'claimed' ? 'Free tier includes:' : `${tierInfo.name} includes:`}
                  </h3>
                  <div className="space-y-2">
                    {selectedTier === 'claimed' ? (
                      ['Claim your venue', 'Edit venue profile', 'Post basic events', 'Get discovered'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                          <Check size={14} className="text-emerald-400" />
                          <span>{feature}</span>
                        </div>
                      ))
                    ) : selectedTier === 'spotlight' ? (
                      ['Everything in Free', 'Event promotion boost', 'Happy Hour placement', 'Continue the Night flow', 'Basic analytics'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                          <Check size={14} className="text-blue-400" />
                          <span>{feature}</span>
                        </div>
                      ))
                    ) : (
                      ['Everything in Spotlight', 'Table bookings', 'Accept payments', 'VIP section management', 'Advanced analytics', 'Priority placement'].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                          <Check size={14} className="text-violet-400" />
                          <span>{feature}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3 mt-6">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-zinc-800 text-zinc-300 py-3.5 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !canContinue}
                className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  selectedTier === 'elite' ? 'bg-violet-500 text-white hover:bg-violet-600' :
                  selectedTier === 'spotlight' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                  'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : step === 1 ? (
                  'Continue'
                ) : selectedTier === 'claimed' ? (
                  'Start Free'
                ) : (
                  'Start 14-Day Trial'
                )}
              </button>
            </div>
          </form>

          {/* Tier Selector */}
          {step === 1 && (
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center mb-4">Select your plan</p>
              <div className="flex gap-2">
                {Object.entries(TIER_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTier(key)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedTier === key
                        ? key === 'elite' ? 'bg-violet-500 text-white' :
                          key === 'spotlight' ? 'bg-blue-500 text-white' :
                          'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {info.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-zinc-600 text-sm mt-8">
            Already have an account?{' '}
            <Link href="/partner/login" className="text-white hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function PartnerSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignupContent />
    </Suspense>
  );
}
