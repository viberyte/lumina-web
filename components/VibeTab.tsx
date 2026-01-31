'use client';

import { useState } from 'react';
import { Play, Heart, MessageCircle, Instagram, Music, Camera } from 'lucide-react';

interface VibeItem {
  type: 'google' | 'instagram' | 'tiktok';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  plays?: number;
  timestamp?: string;
  isVideo?: boolean;
}

interface VibeTabProps {
  googlePhotos: string[];
  instagramPosts: any[];
  tiktokVideos: any[];
  venueName: string;
}

export default function VibeTab({ googlePhotos, instagramPosts, tiktokVideos, venueName }: VibeTabProps) {
  const [selectedItem, setSelectedItem] = useState<VibeItem | null>(null);

  // CAP FOR PERFORMANCE: 10 Google + 10 Instagram + 6 TikTok = 26 max items
  const allVibeContent: VibeItem[] = [
    ...googlePhotos.slice(0, 10).map(url => ({
      type: 'google' as const,
      url,
      isVideo: false
    })),
    
    ...instagramPosts.slice(0, 10).map(post => ({
      type: 'instagram' as const,
      url: post.url,
      thumbnailUrl: post.displayUrl,
      caption: post.caption,
      likes: post.likesCount,
      comments: post.commentsCount,
      timestamp: post.timestamp,
      isVideo: false
    })),
    
    // CAP TIKTOK TO 6 FOR PERFORMANCE
    ...tiktokVideos.slice(0, 6).map(video => ({
      type: 'tiktok' as const,
      url: video.url,
      thumbnailUrl: video.url,
      caption: video.text,
      plays: video.plays,
      likes: video.likes,
      timestamp: video.timestamp,
      isVideo: true
    }))
  ];

  // Sort by engagement then recency
  const sortedContent = allVibeContent.sort((a, b) => {
    const aEngagement = (a.plays || 0) + (a.likes || 0);
    const bEngagement = (b.plays || 0) + (b.likes || 0);
    
    if (aEngagement !== bEngagement) {
      return bEngagement - aEngagement;
    }
    
    if (a.timestamp && b.timestamp) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    
    return 0;
  });

  const getSourceBadge = (type: VibeItem['type']) => {
    switch (type) {
      case 'google':
        return (
          <div className="bg-blue-600/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span className="text-xs font-medium">Pro</span>
          </div>
        );
      case 'instagram':
        return (
          <div className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Instagram className="w-3 h-3" />
            <span className="text-xs font-medium">IG</span>
          </div>
        );
      case 'tiktok':
        return (
          <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span className="text-xs font-medium">TT</span>
          </div>
        );
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (sortedContent.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-zinc-500">No vibe content available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">✨ Vibe</h3>
        <span className="text-zinc-500 text-sm">{sortedContent.length} items</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sortedContent.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            onClick={() => {
              if (item.type === 'tiktok' || item.type === 'instagram') {
                window.open(item.url, '_blank');
              } else {
                setSelectedItem(item);
              }
            }}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
          >
            <img
              src={item.thumbnailUrl || item.url}
              alt={`${venueName} vibe ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute top-2 left-2">
              {getSourceBadge(item.type)}
            </div>

            {item.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}

            {(item.likes || item.plays || item.comments) && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
                {item.plays && (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                    <Play className="w-3 h-3" />
                    <span>{formatNumber(item.plays)}</span>
                  </div>
                )}
                {item.likes && (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                    <Heart className="w-3 h-3" />
                    <span>{formatNumber(item.likes)}</span>
                  </div>
                )}
                {item.comments && (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                    <MessageCircle className="w-3 h-3" />
                    <span>{formatNumber(item.comments)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedItem && !selectedItem.isVideo && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <img
            src={selectedItem.url}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
