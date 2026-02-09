'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Phone, Instagram, Globe, Navigation, 
  Calendar, Users, Star, ChevronRight, CheckCircle, 
  Loader2, Sparkles, X, Clock, Utensils, 
  MessageCircle, TrendingUp, Ticket, Wine, Shield
} from 'lucide-react';

interface VenueData {
  id: number;
  name: string;
  bio?: string;
  instagram?: string;
  heroImage?: string;
  photos: string[];
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  vibes: string[];
  genres: string[];
  sections: any[];
  events: any[];
  primaryGenre?: string;
  category?: string;
}

interface Props {
  token: string;
  venue: VenueData;
}

function isRestaurant(venue: VenueData): boolean {
  const keywords = ['restaurant', 'cafe', 'diner', 'bistro', 'grill', 'kitchen', 'eatery', 'food', 'catfish', 'brunch'];
  const name = venue.name.toLowerCase();
  const category = (venue.category || '').toLowerCase();
  return keywords.some(k => name.includes(k) || category.includes(k));
}

export default function ClaimPageClient({ token, venue }: Props) {
  const [showVerify, setShowVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRestaurantVenue = isRestaurant(venue);
  const hasInstagram = !!venue.instagram;

  // Start Instagram OAuth verification
  const handleInstagramVerify = async () => {
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/claim/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
      
      // Redirect to Instagram OAuth
      window.location.href = data.auth_url;
      
    } catch (e: any) {
      setError(e.message || 'Failed to start verification');
      setLoading(false);
    }
  };

  const heroImage = venue.heroImage?.startsWith('/') 
    ? `https://lumina.viberyte.com${venue.heroImage}` 
    : venue.heroImage;

  const nightlifeBenefits = [
    { icon: Ticket, text: 'Promote events to thousands of nightlife seekers' },
    { icon: Users, text: 'Manage guest lists & table reservations' },
    { icon: Wine, text: 'Sell bottle service packages directly' },
    { icon: MessageCircle, text: 'Chat with guests before they arrive' },
    { icon: TrendingUp, text: 'Track bookings & revenue in real-time' },
    { icon: Star, text: 'Verified partner badge builds trust' },
  ];

  const restaurantBenefits = [
    { icon: Clock, text: 'Promote happy hours & daily specials' },
    { icon: Calendar, text: 'Post DJ nights, live music & weekly events' },
    { icon: Utensils, text: 'Showcase your menu to new diners' },
    { icon: Users, text: 'Accept private event & large party bookings' },
    { icon: TrendingUp, text: 'Reach thousands of local food lovers' },
    { icon: Star, text: 'Verified partner badge builds trust' },
  ];

  const benefits = isRestaurantVenue ? restaurantBenefits : nightlifeBenefits;
  const tagline = isRestaurantVenue 
    ? 'Get your specials & events in front of hungry diners'
    : 'Get your events in front of the right crowd';

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Claim Banner */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-white" />
            <span className="text-white font-medium text-sm">Your Lumina page is ready</span>
          </div>
          <button onClick={() => setShowVerify(true)} className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-zinc-100 transition-colors">Claim Now</button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-[350px] w-full">
        {heroImage ? (
          <img src={heroImage} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-24 px-5 pb-32 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">{venue.name}</h1>
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4 flex-wrap">
          {venue.city && <span>{venue.city}{venue.state && `, ${venue.state}`}</span>}
          {venue.primaryGenre && <><span className="text-zinc-600">•</span><span>{venue.primaryGenre}</span></>}
        </div>

        {venue.vibes.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {venue.vibes.slice(0, 5).map((vibe, i) => (
              <span key={i} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-white">{vibe}</span>
            ))}
          </div>
        )}

        {venue.bio && <p className="text-zinc-400 text-[15px] leading-relaxed mb-6">{venue.bio}</p>}

        {/* Quick Actions */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-8 -mx-1 px-1">
          {venue.address && (
            <a href={`https://maps.apple.com/?q=${encodeURIComponent(venue.address + ', ' + venue.city)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-400 text-sm font-medium whitespace-nowrap">
              <Navigation size={16} /> Directions
            </a>
          )}
          {venue.instagram && (
            <a href={`https://instagram.com/${venue.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-white text-sm font-medium whitespace-nowrap">
              <Instagram size={16} /> @{venue.instagram.replace('@', '')}
            </a>
          )}
        </div>

        {/* Photos Grid */}
        {venue.photos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Photos</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {venue.photos.slice(0, 6).map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-zinc-900">
                  <img src={photo.startsWith('/') ? `https://lumina.viberyte.com${photo}` : photo} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">What you get with Lumina</h2>
          <p className="text-zinc-500 text-sm mb-5">{tagline}</p>
          <div className="space-y-4">
            {benefits.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <span className="text-zinc-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center py-6 border-t border-b border-zinc-800 mb-8">
          <p className="text-zinc-500 text-sm mb-2">Join 100+ venues already on Lumina</p>
          <div className="flex items-center justify-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-yellow-500 fill-yellow-500" />)}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] to-transparent h-24 -top-8" />
        <div className="relative bg-[#0A0A0F] px-5 pb-8 pt-4">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setShowVerify(true)} className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Sparkles size={20} /> Claim This Page — It&apos;s Free
            </button>
            <p className="text-xs text-zinc-600 text-center mt-3">Verify with Instagram in seconds</p>
          </div>
        </div>
      </div>

      {/* Instagram Verification Modal */}
      <AnimatePresence>
        {showVerify && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => !loading && setShowVerify(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Verify Ownership</h2>
                {!loading && <button onClick={() => setShowVerify(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>}
              </div>
              
              {hasInstagram ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Instagram size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">@{venue.instagram?.replace('@', '')}</p>
                      <p className="text-zinc-500 text-sm">Instagram account on file</p>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm mb-6">
                    Log in to your Instagram account to prove you manage <span className="text-white">{venue.name}</span>. 
                    This is the only way to verify ownership.
                  </p>

                  <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
                    <Shield size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-emerald-400 text-sm">
                      We only verify your username. We never post without permission.
                    </p>
                  </div>

                  {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{error}</p>}

                  <button
                    onClick={handleInstagramVerify}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Connecting to Instagram...
                      </>
                    ) : (
                      <>
                        <Instagram size={20} />
                        Continue with Instagram
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Instagram size={32} className="text-zinc-600" />
                    </div>
                    <h3 className="text-white font-medium mb-2">No Instagram on File</h3>
                    <p className="text-zinc-500 text-sm mb-6">
                      We don&apos;t have an Instagram handle for this venue. Contact us to claim your page.
                    </p>
                    <a 
                      href={`mailto:partners@viberyte.com?subject=Claim%20${encodeURIComponent(venue.name)}&body=I%20want%20to%20claim%20my%20venue%20page%20for%20${encodeURIComponent(venue.name)}.%20My%20Instagram%20is%20@`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                      Contact Us
                    </a>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
