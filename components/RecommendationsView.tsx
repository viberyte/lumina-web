'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import VenueCarousel from './venue-carousel';
import EventCarousel from './event-carousel';

interface RecommendationsViewProps {
  isOpen: boolean;
  onClose: () => void;
  topPicks: any[];
  afterDinnerVenues: any[];
  events: any[];
  flow: any;
  onRefresh: () => void;
  onVenueClick: (venue: any) => void;
  hasRefreshed: boolean;
  loading: boolean;
}

export default function RecommendationsView({
  isOpen,
  onClose,
  topPicks,
  afterDinnerVenues,
  events,
  flow,
  onRefresh,
  onVenueClick,
  hasRefreshed,
  loading
}: RecommendationsViewProps) {
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-light text-white">Your Night</h1>
                <p className="text-xs text-zinc-600">
                  {flow.when} • {flow.who} • {flow.cuisine || flow.vibe}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-900 rounded-full transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-32">
          <div className="max-w-7xl mx-auto px-6 py-8">
            
            {/* Top Picks Section */}
            {topPicks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-12"
              >
                <div className="bg-gradient-to-br from-violet-900/20 via-purple-900/10 to-transparent rounded-3xl p-8 border border-violet-500/20">
                  <VenueCarousel
                    venues={topPicks}
                    title="🔥 Top Picks For Your Night"
                    onFlowExperience={onVenueClick}
                  />
                </div>
              </motion.div>
            )}

            {/* After Dinner Section */}
            {afterDinnerVenues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12"
              >
                <div className="bg-gradient-to-br from-fuchsia-900/20 via-pink-900/10 to-transparent rounded-3xl p-8 border border-fuchsia-500/20">
                  <VenueCarousel
                    venues={afterDinnerVenues}
                    title={
                      flow.afterDinner === 'Go to a lounge' ? '🍸 Lounge Vibes' :
                      flow.afterDinner === 'Find a club' ? '🎉 Club Scene' :
                      '✨ Keep It Light'
                    }
                    onFlowExperience={onVenueClick}
                  />
                </div>
              </motion.div>
            )}

            {/* Events Section */}
            {events.length > 0 && flow.afterDinner === 'Check out events' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
              >
                <div className="bg-gradient-to-br from-blue-900/20 via-cyan-900/10 to-transparent rounded-3xl p-8 border border-blue-500/20">
                  <EventCarousel
                    events={events}
                    title={`🎵 ${flow.musicPreference || 'Events'} Tonight`}
                  />
                </div>
              </motion.div>
            )}

            {/* Refresh Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center"
            >
              <button
                onClick={onRefresh}
                disabled={hasRefreshed || loading}
                className="px-8 py-4 bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-violet-500/50 text-white rounded-2xl font-light transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {hasRefreshed ? 'Refreshed' : 'Show Me More'}
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
