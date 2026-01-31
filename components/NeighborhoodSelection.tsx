'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MapPin } from 'lucide-react';

interface NeighborhoodSelectionProps {
  city: string;
  onSelect: (neighborhood: string) => void;
  onBack: () => void;
}

export default function NeighborhoodSelection({ city, onSelect, onBack }: NeighborhoodSelectionProps) {
  const neighborhoods: { [key: string]: any[] } = {
    'New York': [
      { name: 'Manhattan', subtitle: 'Midtown, SoHo, Lower East Side', gradient: 'from-blue-600/20 to-purple-600/20' },
      { name: 'Brooklyn', subtitle: 'Williamsburg, Bushwick, Park Slope', gradient: 'from-orange-600/20 to-pink-600/20' },
      { name: 'Queens', subtitle: 'Astoria, Long Island City', gradient: 'from-green-600/20 to-teal-600/20' },
      { name: 'The Bronx', subtitle: 'South Bronx, Fordham', gradient: 'from-red-600/20 to-orange-600/20' },
      { name: 'Anywhere in NYC', subtitle: 'Show me all NYC venues', gradient: 'from-violet-600/20 to-fuchsia-600/20' },
    ],
    'New Jersey': [
      { name: 'North Jersey', subtitle: 'Jersey City, Hoboken, Newark', gradient: 'from-blue-600/20 to-cyan-600/20' },
      { name: 'Central Jersey', subtitle: 'New Brunswick, Princeton', gradient: 'from-green-600/20 to-emerald-600/20' },
      { name: 'South Jersey', subtitle: 'Camden, Cherry Hill', gradient: 'from-orange-600/20 to-yellow-600/20' },
      { name: 'Anywhere in NJ', subtitle: 'Show me all NJ venues', gradient: 'from-violet-600/20 to-fuchsia-600/20' },
    ],
  };

  const cityNeighborhoods = neighborhoods[city] || [];

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

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 p-3 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur-sm border border-zinc-800 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            Where in {city}?
          </h2>
          <p className="text-lg text-zinc-400">
            Choose your neighborhood or explore all areas
          </p>
        </div>

        {/* Neighborhood Buttons */}
        <div className="space-y-4">
          {cityNeighborhoods.map((neighborhood, index) => (
            <motion.button
              key={neighborhood.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ x: 8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(neighborhood.name)}
              className="group relative w-full overflow-hidden bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-violet-500/50 transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${neighborhood.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                    <MapPin className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-medium text-white">{neighborhood.name}</h3>
                    <p className="text-sm text-zinc-500">{neighborhood.subtitle}</p>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
