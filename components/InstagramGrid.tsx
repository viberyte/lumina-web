'use client';

import { useState } from 'react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import OptimizedMedia from './OptimizedMedia';

interface InstagramGridProps {
  media: Array<{ type: string; url: string }>;
  venueName: string;
}

export default function InstagramGrid({ media, venueName }: InstagramGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!media || media.length === 0) return null;

  // Separate photos and videos
  const photos = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');
  
  // Show first 9 items initially
  const displayItems = showAll ? media : media;
  const remainingCount = 0;

  const nextMedia = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % media.length);
  };

  const prevMedia = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
  };

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Gallery</h3>
          <p className="text-sm text-gray-400">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} · {videos.length} video{videos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Videos Section (if any) */}
      {videos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-4 h-4 text-purple-400" fill="currentColor" />
            <h4 className="text-sm font-semibold text-gray-300">Videos</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {videos.slice(0, 4).map((item, index) => (
              <div
                key={`video-${index}`}
                className="relative aspect-[4/5] rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => setLightboxIndex(media.indexOf(item))}
              >
                <OptimizedMedia
                  item={item}
                  index={index}
                  onClick={() => setLightboxIndex(media.indexOf(item))}
                  className="w-full h-full"
                />
                {/* Video duration badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-xs text-white font-medium">
                  <Play className="w-3 h-3 inline mr-1" />
                  Video
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instagram-Style Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Photos</h4>
          
          {/* Main Grid - Instagram 3-column style */}
          <div className="grid grid-cols-3 gap-1">
            {photos.map((item, index) => (
              <div
                key={`photo-${index}`}
                className="relative aspect-square cursor-pointer group overflow-hidden"
                onClick={() => setLightboxIndex(media.indexOf(item))}
              >
                <OptimizedMedia
                  item={item}
                  index={index}
                  onClick={() => setLightboxIndex(media.indexOf(item))}
                  className="w-full h-full"
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
              </div>
            ))}

            {/* Show More Card */}
            {!showAll && remainingCount > 0 && (
              <div
                className="relative aspect-square cursor-pointer overflow-hidden bg-gray-900"
                onClick={() => setShowAll(true)}
              >
                <OptimizedMedia
                  item={photos[8]}
                  index={8}
                  onClick={() => {}}
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white mb-1">+{remainingCount}</span>
                  <span className="text-sm text-gray-300">View All</span>
                </div>
              </div>
            )}
          </div>

          {/* Show Less Button */}
          {showAll && false && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white transition"
            >
              Show Less
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-sm text-white font-medium">
            {lightboxIndex + 1} / {media.length}
          </div>

          {/* Navigation Arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevMedia();
                }}
                className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextMedia();
                }}
                className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Media Content */}
          <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center p-4">
            {media[lightboxIndex].type === 'video' ? (
              <video
                src={media[lightboxIndex].url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={media[lightboxIndex].url}
                alt={`${venueName} ${lightboxIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
