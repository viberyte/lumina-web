'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { MapPin, Calendar, Clock, Users, Check, Copy, ChevronRight, Loader2, CreditCard, CheckCircle2, Clock3 } from 'lucide-react';
import dynamic from 'next/dynamic';

const StripeCheckout = dynamic(() => import('@/components/StripeCheckout'), { ssr: false });

type Guest = {
  id: number;
  name: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
  is_host: number;
  payment_method?: string;
  verified: number;
};

type PaymentMethods = {
  venmo: string | null;
  zelle: string | null;
  cashapp: string | null;
  cash: boolean;
  card: boolean;
};

type Booking = {
  id: number;
  invite_code: string;
  venue_name: string;
  venue_address: string;
  event_name?: string;
  host_name: string;
  table_type: string;
  booking_date: string;
  booking_time: string;
  total_amount: number;
  funded_amount: number;
  guest_count: number;
  status: string;
  expires_at: string;
  guests: Guest[];
  paymentMethods: PaymentMethods;
  verifiedAmount?: number;
  pendingAmount?: number;
};

export default function GuestBookingPage() {
  const params = useParams();
  const code = params.code as string;
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [currentGuestId, setCurrentGuestId] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [showGuestSelect, setShowGuestSelect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [code]);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/book/${code}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setBooking(data.booking);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!booking || !booking.expires_at) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(booking.expires_at).getTime();
      const diff = expires - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied!', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectGuest = (guestId: number) => {
    setCurrentGuestId(guestId);
    setShowGuestSelect(false);
    setShowPayment(true);
  };

  const handleCardPayment = () => {
    setShowPayment(false);
    setShowStripeCheckout(true);
  };

  const handleStripeSuccess = () => {
    setShowStripeCheckout(false);
    setCurrentGuestId(null);
    toast.success('Payment confirmed!', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    fetchBooking();
  };

  const handleP2PPayment = async (method: string) => {
    if (!currentGuestId || !booking) return;
    
    setPaying(true);
    
    try {
      const res = await fetch(`/api/book/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: currentGuestId, paymentMethod: method }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment submitted! Awaiting venue verification.', { 
          style: { background: '#18181b', color: '#fff', border: 'none' },
          duration: 4000,
        });
        setShowPayment(false);
        setCurrentGuestId(null);
        fetchBooking();
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
    
    setPaying(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h % 12 || 12) + ':' + m.toString().padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="text-white animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Booking not found</h1>
          <p className="text-zinc-500 text-sm">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const verifiedAmount = booking.verifiedAmount || 0;
  const pendingAmount = booking.pendingAmount || 0;
  const verifiedPercent = (verifiedAmount / booking.total_amount) * 100;
  const pendingPercent = (pendingAmount / booking.total_amount) * 100;
  
  const paidCount = booking.guests.filter(g => g.paid).length;
  const remainingCount = booking.guests.length - paidCount;
  const unpaidGuests = booking.guests.filter(g => !g.paid);
  const currentGuest = currentGuestId ? booking.guests.find(g => g.id === currentGuestId) : null;
  const fullyFunded = verifiedAmount >= booking.total_amount;

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <p className="text-zinc-500 text-xs mb-2">You're invited to</p>
          <h1 className="text-2xl font-semibold text-white mb-1">{booking.table_type}</h1>
          {booking.event_name && <p className="text-zinc-400 text-sm">{booking.event_name}</p>}
        </motion.div>

        {/* Venue Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <h2 className="text-lg font-medium text-white mb-3">{booking.venue_name}</h2>
          <div className="space-y-2 text-sm">
            {booking.venue_address && (
              <div className="flex items-center gap-3 text-zinc-400">
                <MapPin size={16} strokeWidth={1.5} />
                <span>{booking.venue_address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-zinc-400">
              <Calendar size={16} strokeWidth={1.5} />
              <span>{formatDate(booking.booking_date)}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Clock size={16} strokeWidth={1.5} />
              <span>{formatTime(booking.booking_time)}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Users size={16} strokeWidth={1.5} />
              <span>{booking.guests.length} guests · Hosted by {booking.host_name}</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-semibold text-white">${booking.funded_amount}</span>
              <span className="text-zinc-500"> / ${booking.total_amount}</span>
            </div>
            {timeLeft && timeLeft !== 'Expired' && (
              <div className="text-right">
                <div className="text-amber-500 text-sm font-medium">{timeLeft}</div>
                <div className="text-zinc-600 text-xs">until hold expires</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
            <div className="h-full flex">
              <motion.div 
                className="bg-emerald-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: Math.min(verifiedPercent, 100) + '%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              <motion.div 
                className="bg-amber-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: Math.min(pendingPercent, 100 - verifiedPercent) + '%' }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-4">
              {verifiedAmount > 0 && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> ${verifiedAmount} verified
                </span>
              )}
              {pendingAmount > 0 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <Clock3 size={12} /> ${pendingAmount} pending
                </span>
              )}
            </div>
            {remainingCount > 0 && (
              <span className="text-zinc-500">{remainingCount} left</span>
            )}
          </div>
        </motion.div>

        {/* Guest List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <h3 className="text-sm font-medium text-white mb-4">Group</h3>
          <div className="space-y-3">
            {booking.guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={
                    guest.paid && guest.verified 
                      ? 'w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center' 
                      : guest.paid 
                        ? 'w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center'
                        : 'w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center'
                  }>
                    {guest.paid && guest.verified ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : guest.paid ? (
                      <Clock3 size={14} className="text-amber-400" />
                    ) : (
                      <span className="text-zinc-500 text-xs font-medium">
                        {guest.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-zinc-400">
                      {guest.name}
                      {guest.is_host ? ' (Host)' : ''}
                    </span>
                    {guest.paid && (
                      <span className={`text-xs ml-2 ${guest.verified ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                        {guest.verified ? 'Verified' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
                <span className={guest.paid ? 'text-sm text-zinc-500' : 'text-sm font-medium text-white'}>
                  ${guest.amount}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pay Button */}
        {unpaidGuests.length > 0 && booking.status !== 'expired' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 mb-6"
          >
            <p className="text-zinc-500 text-xs mb-3 text-center">Select your name to pay</p>
            <button 
              onClick={() => setShowGuestSelect(true)}
              className="w-full bg-black text-white py-4 rounded-xl text-sm font-medium hover:bg-zinc-900 transition-colors duration-300"
            >
              Pay My Share
            </button>
          </motion.div>
        )}

        {/* Fully Funded State */}
        {fullyFunded && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="bg-emerald-500/10 rounded-2xl p-5 mb-6 text-center"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Fully funded!</h3>
            <p className="text-zinc-500 text-sm">The table is secured. See you there.</p>
          </motion.div>
        )}

        {/* Share Link */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          onClick={handleCopyLink}
          className="w-full flex items-center justify-between bg-zinc-900/30 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <Copy size={18} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">Share invite link</span>
          </div>
          <span className="text-sm text-zinc-500">{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>
      </div>

      {/* Guest Select Modal */}
      <AnimatePresence>
        {showGuestSelect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowGuestSelect(false); }}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10"
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
              
              <h3 className="text-lg font-medium text-white mb-4 text-center">Who are you?</h3>

              <div className="space-y-2">
                {unpaidGuests.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectGuest(guest.id)}
                    className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">{guest.name.charAt(0)}</span>
                      </div>
                      <span className="text-white font-medium">{guest.name}</span>
                    </div>
                    <span className="text-white font-medium">${guest.amount}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Method Modal */}
      <AnimatePresence>
        {showPayment && currentGuest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPayment(false); setCurrentGuestId(null); } }}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10"
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
              
              <div className="text-center mb-6">
                <p className="text-zinc-500 text-sm mb-1">Pay your share, {currentGuest.name.split(' ')[0]}</p>
                <p className="text-3xl font-semibold text-white">${currentGuest.amount}</p>
              </div>

              <div className="space-y-3">
                {/* Stripe - Auto-verified */}
                {booking.paymentMethods.card && (
                  <button 
                    onClick={handleCardPayment}
                    disabled={paying}
                    className="w-full flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl p-4 transition-colors duration-300 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <CreditCard size={18} className="text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <span className="text-white font-medium block">Pay with Card</span>
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle2 size={10} /> Instant verification
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-500" />
                  </button>
                )}

                {/* P2P Methods */}
                {booking.paymentMethods.cashapp && (
                  <button 
                    onClick={() => handleP2PPayment('cashapp')}
                    disabled={paying}
                    className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors duration-300 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-400 font-semibold text-sm">$</span>
                      </div>
                      <div className="text-left">
                        <span className="text-white font-medium block">Cash App</span>
                        <span className="text-zinc-500 text-xs">${booking.paymentMethods.cashapp} · Pending verification</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-500" />
                  </button>
                )}

                {booking.paymentMethods.venmo && (
                  <button 
                    onClick={() => handleP2PPayment('venmo')}
                    disabled={paying}
                    className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors duration-300 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-blue-400 font-semibold text-sm">V</span>
                      </div>
                      <div className="text-left">
                        <span className="text-white font-medium block">Venmo</span>
                        <span className="text-zinc-500 text-xs">@{booking.paymentMethods.venmo} · Pending verification</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-500" />
                  </button>
                )}

                {booking.paymentMethods.zelle && (
                  <button 
                    onClick={() => handleP2PPayment('zelle')}
                    disabled={paying}
                    className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors duration-300 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-purple-400 font-semibold text-sm">Z</span>
                      </div>
                      <div className="text-left">
                        <span className="text-white font-medium block">Zelle</span>
                        <span className="text-zinc-500 text-xs">{booking.paymentMethods.zelle} · Pending verification</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-500" />
                  </button>
                )}

                {booking.paymentMethods.cash && (
                  <button 
                    onClick={() => handleP2PPayment('cash')}
                    disabled={paying}
                    className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors duration-300 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                        <span className="text-zinc-400 text-sm">$</span>
                      </div>
                      <div className="text-left">
                        <span className="text-white font-medium block">Pay Cash at Door</span>
                        <span className="text-zinc-500 text-xs">Pending verification</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-500" />
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />
                  <p className="text-zinc-500 text-xs">
                    <span className="text-emerald-400">Card payments</span> are instantly verified. P2P payments require venue verification.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stripe Checkout Modal */}
      <AnimatePresence>
        {showStripeCheckout && currentGuestId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowStripeCheckout(false); setCurrentGuestId(null); } }}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
              
              <StripeCheckout
                bookingCode={code}
                guestId={currentGuestId}
                onSuccess={handleStripeSuccess}
                onCancel={() => { setShowStripeCheckout(false); setCurrentGuestId(null); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
