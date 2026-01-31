'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Users, Copy, Share2, MessageCircle, Check, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type GuestSplit = {
  id: string;
  name: string;
  amount: number;
};

export default function SplitBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  
  const [step, setStep] = useState(1);
  const [guestCount, setGuestCount] = useState(4);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [guests, setGuests] = useState<GuestSplit[]>([]);
  const [hostAmount, setHostAmount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Mock booking data
  const booking = {
    id: bookingId,
    venueName: 'The Grand Lounge',
    eventName: 'NYE Countdown 2026',
    tableType: 'VIP Table',
    date: '2025-12-31',
    time: '22:30',
    totalAmount: 1000,
  };

  const totalAmount = booking.totalAmount;
  const equalSplit = Math.ceil(totalAmount / guestCount);

  const handleGuestCountChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(12, guestCount + delta));
    setGuestCount(newCount);
  };

  const handleContinueToSplit = () => {
    if (splitType === 'equal') {
      const split = Math.ceil(totalAmount / guestCount);
      const newGuests: GuestSplit[] = [];
      for (let i = 0; i < guestCount - 1; i++) {
        newGuests.push({ id: `g${i}`, name: '', amount: split });
      }
      setGuests(newGuests);
      setHostAmount(totalAmount - (split * (guestCount - 1)));
    } else {
      const split = Math.ceil(totalAmount / guestCount);
      const newGuests: GuestSplit[] = [];
      for (let i = 0; i < guestCount - 1; i++) {
        newGuests.push({ id: `g${i}`, name: '', amount: split });
      }
      setGuests(newGuests);
      setHostAmount(split);
    }
    setStep(2);
  };

  const handleGuestAmountChange = (id: string, amount: number) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, amount: Math.max(0, amount) } : g));
  };

  const handleGuestNameChange = (id: string, name: string) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  };

  const guestTotal = guests.reduce((sum, g) => sum + g.amount, 0);
  const remaining = totalAmount - hostAmount - guestTotal;
  const isBalanced = remaining === 0;

  const handleCreateInvite = async () => {
    setCreating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const code = 'NYE' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteCode(code);
    setCreating(false);
    setStep(3);
  };

  const inviteUrl = `https://lumina.viberyte.com/book/${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Link copied!', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareiMessage = () => {
    const text = `You're invited to ${booking.tableType} at ${booking.venueName}! Pay your share: ${inviteUrl}`;
    window.open(`sms:&body=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = `You're invited to ${booking.tableType} at ${booking.venueName}! Pay your share: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={s <= step ? 'w-8 h-1 rounded-full bg-white' : 'w-8 h-1 rounded-full bg-zinc-800'} />
            ))}
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Booking Summary */}
      <div className="px-5 mb-6">
        <div className="bg-zinc-900/50 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">{booking.tableType}</h2>
              <p className="text-zinc-500 text-sm">{booking.venueName} · {formatDate(booking.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-white">${booking.totalAmount}</p>
              <p className="text-zinc-500 text-xs">minimum</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Guest Count */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5"
          >
            <h1 className="text-2xl font-semibold text-white mb-2">Split with friends</h1>
            <p className="text-zinc-500 mb-8">How many people are splitting?</p>

            <div className="bg-zinc-900/50 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-zinc-500" />
                  <span className="text-white font-medium">Total guests</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleGuestCountChange(-1)}
                    disabled={guestCount <= 2}
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-2xl font-semibold text-white w-8 text-center">{guestCount}</span>
                  <button
                    onClick={() => handleGuestCountChange(1)}
                    disabled={guestCount >= 12}
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Equal split</span>
                  <span className="text-white font-medium">${equalSplit} each</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => setSplitType('equal')}
                className={splitType === 'equal'
                  ? 'w-full flex items-center justify-between p-4 rounded-xl bg-white text-black'
                  : 'w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 text-white hover:bg-zinc-900 transition-colors'
                }
              >
                <div>
                  <div className="font-medium">Split equally</div>
                  <div className={splitType === 'equal' ? 'text-zinc-600 text-xs' : 'text-zinc-500 text-xs'}>Everyone pays the same</div>
                </div>
                {splitType === 'equal' && <Check size={18} />}
              </button>

              <button
                onClick={() => setSplitType('custom')}
                className={splitType === 'custom'
                  ? 'w-full flex items-center justify-between p-4 rounded-xl bg-white text-black'
                  : 'w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 text-white hover:bg-zinc-900 transition-colors'
                }
              >
                <div>
                  <div className="font-medium">Custom amounts</div>
                  <div className={splitType === 'custom' ? 'text-zinc-600 text-xs' : 'text-zinc-500 text-xs'}>Set different amounts per person</div>
                </div>
                {splitType === 'custom' && <Check size={18} />}
              </button>
            </div>

            <button
              onClick={handleContinueToSplit}
              className="w-full bg-white text-black py-4 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* Step 2: Set Amounts */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5"
          >
            <h1 className="text-2xl font-semibold text-white mb-2">Set amounts</h1>
            <p className="text-zinc-500 mb-6">Customize how much each person pays</p>

            {/* Balance indicator */}
            <div className={isBalanced 
              ? 'bg-emerald-500/10 rounded-xl p-4 mb-6' 
              : 'bg-amber-500/10 rounded-xl p-4 mb-6'
            }>
              <div className="flex justify-between text-sm">
                <span className={isBalanced ? 'text-emerald-400' : 'text-amber-400'}>
                  {isBalanced ? 'Balanced' : remaining > 0 ? `$${remaining} remaining` : `$${Math.abs(remaining)} over`}
                </span>
                <span className={isBalanced ? 'text-emerald-400' : 'text-amber-400'}>
                  ${hostAmount + guestTotal} / ${totalAmount}
                </span>
              </div>
            </div>

            {/* Host amount */}
            <div className="bg-zinc-900/50 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <span className="text-black font-semibold text-sm">You</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">You (Host)</div>
                    <div className="text-zinc-500 text-xs">Pays first</div>
                  </div>
                </div>
              </div>
              {splitType === 'custom' ? (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    value={hostAmount}
                    onChange={(e) => setHostAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-medium focus:outline-none focus:ring-1 focus:ring-zinc-700"
                  />
                </div>
              ) : (
                <div className="text-2xl font-semibold text-white">${hostAmount}</div>
              )}
            </div>

            {/* Guest amounts */}
            <div className="space-y-3 mb-6">
              {guests.map((guest, idx) => (
                <div key={guest.id} className="bg-zinc-900/50 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-400 font-medium text-sm">{idx + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(e) => handleGuestNameChange(guest.id, e.target.value)}
                      placeholder={`Guest ${idx + 1}`}
                      className="flex-1 bg-transparent text-white font-medium focus:outline-none placeholder-zinc-600"
                    />
                  </div>
                  {splitType === 'custom' ? (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={guest.amount}
                        onChange={(e) => handleGuestAmountChange(guest.id, Number(e.target.value))}
                        className="w-full bg-zinc-800/50 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-medium focus:outline-none focus:ring-1 focus:ring-zinc-700"
                      />
                    </div>
                  ) : (
                    <div className="text-xl font-semibold text-white">${guest.amount}</div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateInvite}
              disabled={!isBalanced || creating}
              className="w-full bg-white text-black py-4 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating invite...
                </>
              ) : (
                'Create Invite Link'
              )}
            </button>
          </motion.div>
        )}

        {/* Step 3: Share */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Invite created!</h1>
              <p className="text-zinc-500">Share with your group to collect payments</p>
            </div>

            {/* Link preview */}
            <div className="bg-zinc-900/50 rounded-2xl p-5 mb-6">
              <p className="text-zinc-500 text-xs mb-2">Invite link</p>
              <p className="text-white font-medium text-sm break-all">{inviteUrl}</p>
            </div>

            {/* Share options */}
            <div className="space-y-3 mb-8">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between bg-white text-black p-4 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Copy size={18} />
                  <span>Copy Link</span>
                </div>
                {copied && <Check size={18} />}
              </button>

              <button
                onClick={handleShareiMessage}
                className="w-full flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-900 text-white p-4 rounded-xl font-medium transition-colors"
              >
                <MessageCircle size={18} />
                <span>Share via iMessage</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-900 text-white p-4 rounded-xl font-medium transition-colors"
              >
                <Share2 size={18} />
                <span>Share via WhatsApp</span>
              </button>
            </div>

            {/* Progress preview */}
            <div className="bg-zinc-900/50 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Payment progress</h3>
              <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                <div className="bg-white h-2 rounded-full w-0" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">$0 / ${totalAmount}</span>
                <span className="text-zinc-500">0 of {guestCount} paid</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/partner/bookings')}
              className="w-full text-zinc-500 hover:text-white py-4 text-sm font-medium transition-colors mt-6"
            >
              View in Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
