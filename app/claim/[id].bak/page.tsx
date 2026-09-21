'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, Loader2, MapPin, Star } from 'lucide-react';

export default function ClaimVenuePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id;
  
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  useEffect(() => {
    fetchVenue();
  }, [venueId]);

  const fetchVenue = async () => {
    try {
      const res = await fetch(`/api/venues/${venueId}`);
      if (!res.ok) throw new Error('Venue not found');
      const data = await res.json();
      
      if (data.partner_id) {
        setError('This venue has already been claimed');
      }
      
      setVenue(data);
    } catch (e) {
      setError('Venue not found');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    setError('');

    try {
      const res = await fetch('/api/claim/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venueId,
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim venue');
      }

      setClaimed(true);
      
      // Redirect to partner dashboard after 2 seconds
      setTimeout(() => {
        router.push('/partner/dashboard');
      }, 2000);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error && !venue) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/" className="text-zinc-400 hover:text-white">Go home</a>
        </div>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Venue Claimed!</h1>
          <p className="text-zinc-400">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-black py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Claim Your Venue</h1>
          <p className="text-zinc-400">Take control of your presence on Viberyte</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">
        {/* Venue Preview */}
        {venue && (
          <div className="bg-zinc-900/50 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              {venue.google_photos?.[0] ? (
                <img 
                  src={venue.google_photos[0]} 
                  alt={venue.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-medium text-white">{venue.name}</h2>
                <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                  <MapPin size={14} />
                  <span>{venue.city}, {venue.state}</span>
                </div>
                {venue.rating && (
                  <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                    <Star size={14} className="text-yellow-500" />
                    <span>{venue.rating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Already Claimed Warning */}
        {venue?.partner_id && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 text-sm">This venue has already been claimed. If you believe this is an error, please contact support.</p>
          </div>
        )}

        {/* Claim Form */}
        {!venue?.partner_id && (
          <form onSubmit={handleClaim} className="space-y-5">
            <div>
              <label className="block text-sm text-zinc-500 mb-2">Your Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-500 mb-2">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="you@venue.com"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-500 mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-500 mb-2">Create Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="••••••••"
              />
              <p className="text-xs text-zinc-600 mt-1">Minimum 8 characters</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={claiming}
              className="w-full bg-white text-black font-medium py-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim This Venue'
              )}
            </button>

            <p className="text-xs text-zinc-600 text-center">
              By claiming this venue, you confirm you are authorized to manage it.
            </p>
          </form>
        )}

        {/* Benefits */}
        <div className="mt-12">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">What you get:</h3>
          <ul className="space-y-3">
            {[
              'Edit your venue photos, description & hours',
              'Post events directly to Viberyte',
              'Accept table bookings & reservations',
              'View analytics on profile views & saves',
              'Connect Instagram for automatic content sync',
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm">
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
