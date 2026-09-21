'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClaimSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const name = searchParams.get('name');

  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('lumina_partner_session', JSON.stringify({ token }));
    }
  }, [token]);

  const openDashboard = () => {
    window.location.href = 'https://apps.apple.com/app/lumina-nightlife/id6739197728';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </motion.div>
        
        <h1 className="text-2xl font-semibold text-white mb-2">Page Claimed!</h1>
        <p className="text-zinc-400 mb-2">
          Welcome to Viberyte{name ? `, ${decodeURIComponent(name)}` : ''}.
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          Your page is now live. Download the app to manage events, bookings, and more.
        </p>
        
        <button
          onClick={openDashboard}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          Download Viberyte App <ChevronRight size={18} />
        </button>
        
        <p className="text-xs text-zinc-600 mt-6">
          Log in with the same email and password • Powered by Viberyte
        </p>
      </motion.div>
    </div>
  );
}
