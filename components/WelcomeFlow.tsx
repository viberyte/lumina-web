'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ChevronRight, Lock } from 'lucide-react';

interface WelcomeFlowProps {
  onCitySelect: (city: string) => void;
}

export default function WelcomeFlow({ onCitySelect }: WelcomeFlowProps) {
  const activeCities = [
    { 
      name: 'New York',
      region: 'NYC Metro',
      venueCount: 1240,
      gradient: 'from-blue-600/20 via-purple-600/20 to-pink-600/20',
      active: true
    },
    { 
      name: 'New Jersey',
      region: 'Garden State',
      venueCount: 420,
      gradient: 'from-green-600/20 via-emerald-600/20 to-teal-600/20',
      active: true
    },
  ];

  const comingSoonCities = [
    { 
      name: 'Philadelphia',
      region: 'City of Brotherly Love',
      launchDate: 'Q1 2026',
      gradient: 'from-orange-600/20 via-red-600/20 to-pink-600/20'
    },
    { 
      name: 'Washington DC',
      region: 'DMV Area',
      launchDate: 'Q1 2026',
      gradient: 'from-blue-600/20 via-indigo-600/20 to-purple-600/20'
    },
    { 
      name: 'Atlanta',
      region: 'ATL',
      launchDate: 'Q2 2026',
      gradient: 'from-red-600/20 via-orange-600/20 to-yellow-600/20'
    },
    { 
      name: 'Miami',
      region: 'Magic City',
      launchDate: 'Q2 2026',
      gradient: 'from-cyan-600/20 via-blue-600/20 to-purple-600/20'
    },
  ];

  const handleComingSoonClick = (cityName: string) => {
    // Open Telegram bot with waitlist parameter
    const telegramUrl = `https://t.me/luminabot?start=notify_${cityName.toLowerCase().replace(' ', '_')}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(217, 70, 239, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full mx-auto mb-6"
          />
          <h1 className="text-5xl md:text-6xl font-light text-white mb-4 tracking-tight">
            Welcome to Viberyte
          </h1>
          <p className="text-xl text-zinc-400 font-light">
            Your personal nightlife concierge
          </p>
        </div>

        {/* Active Cities */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg text-zinc-500 font-medium px-4">Select Your City</h2>
          {activeCities.map((city, index) => (
            <motion.button
              key={city.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ x: 8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCitySelect(city.name)}
              className="group relative w-full overflow-hidden bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-violet-500/50 transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                    <MapPin className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-medium text-white">{city.name}</h3>
                    <p className="text-sm text-zinc-500">{city.region} • {city.venueCount} venues</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-violet-400 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Coming Soon Cities */}
        <div className="space-y-4">
          <h2 className="text-lg text-zinc-500 font-medium px-4 flex items-center gap-2">
            Coming Soon
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded-full">Expanding</span>
          </h2>
          {comingSoonCities.map((city, index) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * (activeCities.length + index) }}
              className="relative w-full overflow-hidden bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 opacity-60"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-20`} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-medium text-zinc-400">{city.name}</h3>
                    <p className="text-sm text-zinc-600">{city.region} • Launching {city.launchDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleComingSoonClick(city.name)}
                  className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Notify Me
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-zinc-600 mt-8">
          More cities launching throughout 2026
        </p>
      </motion.div>
    </div>
  );
}
