'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface FlowExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  flow: {
    title: string;
    description: string;
    stops: Array<{
      venue: any;
      purpose: string;
      duration: string;
      order: number;
    }>;
    totalDuration: string;
  } | null;
}

export default function FlowExperienceModal({ isOpen, onClose, flow }: FlowExperienceModalProps) {
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});

  if (!flow) return null;

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-2xl font-light text-white">{flow.title}</h2>
                  </div>
                  <p className="text-zinc-400 text-sm">{flow.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-violet-400">
                    <Clock className="w-3 h-3" />
                    <span>Total Duration: {flow.totalDuration}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              <div className="space-y-6">
                {flow.stops.map((stop, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {/* Connection Line */}
                    {index < flow.stops.length - 1 && (
                      <div className="absolute left-6 top-24 bottom-0 w-px bg-gradient-to-b from-violet-500/50 to-transparent" />
                    )}

                    <div className="flex gap-4">
                      {/* Step Number */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-medium z-10 relative">
                          {stop.order}
                        </div>
                      </div>

                      {/* Stop Card */}
                      <div className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          <div className="w-full md:w-48 h-32 md:h-auto relative flex-shrink-0">
                            <img
                              src={imageErrors[index] ? '/venue-placeholder.jpg' : stop.venue.photoUrl}
                              alt={stop.venue.name}
                              onError={() => handleImageError(index)}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-light text-white">
                                  {stop.venue.name}
                                </h3>
                                <p className="text-sm text-violet-400 font-medium">
                                  {stop.purpose}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-900 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                <span>{stop.duration}</span>
                              </div>
                            </div>

                            {stop.venue.neighborhood && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <MapPin className="w-3 h-3" />
                                <span>{stop.venue.neighborhood}</span>
                              </div>
                            )}

                            {stop.venue.musicGenres && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {stop.venue.musicGenres.split(',').slice(0, 2).map((genre: string, i: number) => (
                                  <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full"
                                  >
                                    {genre.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow between stops */}
                    {index < flow.stops.length - 1 && (
                      <div className="flex items-center justify-center my-3 ml-12">
                        <ArrowRight className="w-5 h-5 text-violet-500/50" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 p-6">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all font-light"
                >
                  Save to My Plan
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
