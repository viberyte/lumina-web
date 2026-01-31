'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Phone, Copy, Check, Shield, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type Guest = {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
};

type BookingDetail = {
  id: string;
  customerName: string;
  customerPhone: string;
  venueName: string;
  eventName: string;
  tableType: string;
  date: string;
  time: string;
  totalAmount: number;
  fundedAmount: number;
  guests: Guest[];
  expiresAt: string;
  status: 'pending' | 'soft_commit' | 'funded' | 'confirmed' | 'expired';
  confidence: 'low' | 'medium' | 'high';
  inviteCode: string;
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Mock data - would come from API
    setBooking({
      id: bookingId,
      customerName: 'Marcus Johnson',
      customerPhone: '5551234567',
      venueName: 'The Grand Lounge',
      eventName: 'NYE Countdown 2026',
      tableType: 'VIP Table',
      date: '2025-12-31',
      time: '22:30',
      totalAmount: 1000,
      fundedAmount: 825,
      guests: [
        { id: 'g1', name: 'Marcus J.', amount: 300, paid: true, paidAt: '2025-12-28T14:30:00' },
        { id: 'g2', name: 'Sarah M.', amount: 175, paid: true, paidAt: '2025-12-28T15:45:00' },
        { id: 'g3', name: 'David K.', amount: 175, paid: true, paidAt: '2025-12-28T16:20:00' },
        { id: 'g4', name: 'Alex R.', amount: 175, paid: true, paidAt: '2025-12-28T17:00:00' },
        { id: 'g5', name: 'Jordan W.', amount: 175, paid: false },
      ],
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      status: 'soft_commit',
      confidence: 'high',
      inviteCode: 'NYE8X2K4',
    });
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(booking.expiresAt).getTime();
      const diff = expires - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const handleCopyLink = () => {
    if (!booking) return;
    navigator.clipboard.writeText(`https://lumina.viberyte.com/book/${booking.inviteCode}`);
    setCopied(true);
    toast.success('Link copied', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    toast.success('Booking confirmed!', { style: { background: '#18181b', color: '#fff', border: 'none' } });
    router.push('/partner/bookings');
  };

  const handleRelease = () => {
    toast('Table released', { style: { background: '#18181b', color: '#71717a', border: 'none' } });
    router.push('/partner/bookings');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (typeof time !== 'string') return ''; const parts = time.split(':'); if (parts.length < 2) return time; const [h, m] = parts.map(Number);
    return (h % 12 || 12) + ':' + m.toString().padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return '(' + phone.slice(0,3) + ') ' + phone.slice(3,6) + '-' + phone.slice(6);
    }
    return phone;
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progressPercent = (booking.fundedAmount / booking.totalAmount) * 100;
  const paidCount = booking.guests.filter(g => g.paid).length;
  const remainingCount = booking.guests.length - paidCount;

  const getStatusLabel = () => {
    if (booking.status === 'funded') return { label: 'Fully Funded', color: 'text-emerald-400 bg-emerald-500/10' };
    if (booking.status === 'soft_commit') return { label: 'Soft Commit', color: 'text-amber-400 bg-amber-500/10' };
    if (booking.status === 'expired') return { label: 'Expired', color: 'text-red-400 bg-red-500/10' };
    return { label: 'Pending', color: 'text-zinc-400 bg-zinc-800' };
  };

  const getConfidenceLabel = () => {
    if (booking.confidence === 'high') return { label: 'High confidence', icon: Shield, color: 'text-emerald-400' };
    if (booking.confidence === 'medium') return { label: 'Medium confidence', icon: AlertCircle, color: 'text-amber-400' };
    return { label: 'Low confidence', icon: AlertCircle, color: 'text-red-400' };
  };

  const status = getStatusLabel();
  const confidence = getConfidenceLabel();
  const ConfidenceIcon = confidence.icon;

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className={`text-xs px-3 py-1.5 rounded-full ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="px-5">
        {/* Table Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1">{booking.tableType}</h1>
          <p className="text-zinc-500">{booking.eventName}</p>
        </motion.div>

        {/* Funding Progress - The Key Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-3xl font-semibold text-white">${booking.fundedAmount}</span>
              <span className="text-zinc-500 text-lg"> / ${booking.totalAmount}</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <ConfidenceIcon size={14} className={confidence.color} />
                <span className={`text-sm ${confidence.color}`}>{confidence.label}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-3 mb-4">
            <motion.div 
              className={progressPercent >= 100 ? 'bg-emerald-500 h-3 rounded-full' : 'bg-white h-3 rounded-full'}
              initial={{ width: 0 }}
              animate={{ width: Math.min(progressPercent, 100) + '%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-zinc-500" />
              <span className="text-sm text-zinc-400">{paidCount} / {booking.guests.length} paid</span>
            </div>
            {remainingCount > 0 && (
              <div className="text-sm text-amber-500">{timeLeft} left</div>
            )}
          </div>
        </motion.div>

        {/* Guest Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <h3 className="text-sm font-medium text-white mb-4">Group ({booking.guests.length})</h3>
          <div className="space-y-3">
            {booking.guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={guest.paid 
                    ? 'w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center' 
                    : 'w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center'
                  }>
                    {guest.paid ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <span className="text-zinc-500 text-xs">{guest.name.split(' ').map(n => n[0]).join('')}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-white">{guest.name}</span>
                    {guest.paid && (
                      <span className="text-emerald-500/80 text-xs ml-2">Paid</span>
                    )}
                    {!guest.paid && (
                      <span className="text-zinc-600 text-xs ml-2">Waiting</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-zinc-400">${guest.amount}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Event Details */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-zinc-400">
              <MapPin size={16} strokeWidth={1.5} />
              <span>{booking.venueName}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Calendar size={16} strokeWidth={1.5} />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Clock size={16} strokeWidth={1.5} />
              <span>{formatTime(booking.time)}</span>
            </div>
          </div>
        </motion.div>

        {/* Host Contact */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/50 rounded-2xl p-5 mb-6"
        >
          <p className="text-zinc-500 text-xs mb-2">Host</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{booking.customerName}</p>
              <p className="text-zinc-500 text-sm">{formatPhone(booking.customerPhone)}</p>
            </div>
            <a 
              href={`tel:${booking.customerPhone}`}
              className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Phone size={18} />
            </a>
          </div>
        </motion.div>

        {/* Invite Link */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          onClick={handleCopyLink}
          className="w-full flex items-center justify-between bg-zinc-900/30 rounded-2xl p-5 mb-8"
        >
          <div className="flex items-center gap-3">
            <Copy size={18} className="text-zinc-500" />
            <div className="text-left">
              <p className="text-sm text-white">Invite link</p>
              <p className="text-zinc-600 text-xs">lumina.viberyte.com/book/{booking.inviteCode}</p>
            </div>
          </div>
          <span className="text-sm text-zinc-500">{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="space-y-3 pb-10"
        >
          {booking.status === 'funded' && (
            <button
              onClick={handleConfirm}
              className="w-full bg-white text-black py-4 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Confirm Booking
            </button>
          )}
          
          {booking.status === 'soft_commit' && (
            <>
              <button
                onClick={handleConfirm}
                className="w-full bg-white text-black py-4 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Accept & Confirm
              </button>
              <p className="text-zinc-600 text-xs text-center">
                ${booking.totalAmount - booking.fundedAmount} still pending · {remainingCount} guest{remainingCount !== 1 ? 's' : ''} haven't paid
              </p>
            </>
          )}

          <button
            onClick={handleRelease}
            className="w-full text-red-400/80 hover:text-red-400 py-3 text-sm font-medium transition-colors"
          >
            Release Table
          </button>
        </motion.div>
      </div>
    </div>
  );
}
