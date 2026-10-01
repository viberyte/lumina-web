'use client';
import { useRef, useEffect, useState } from 'react';
import { t } from '../tokens';
import { Venue } from '../types';

export default function ReelCard({ venue, onTap }: { venue: Venue; onTap?: (id: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoUrl = venue.reel?.videoUrl || '';
  const thumbUrl = venue.reel?.thumbnailUrl || venue.image || '';

  useEffect(() => {
    const el = cardRef.current;
    const vid = videoRef.current;
    if (!el || !vid || !videoUrl) return;
    
    vid.muted = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');

    vid.addEventListener('canplay', () => setIsReady(true));

    // Only play when card is mostly centered in viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          vid.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          vid.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.7 }
    );
    observer.observe(el);
    
    return () => observer.disconnect();
  }, [videoUrl]);

  return (
    <div ref={cardRef} onClick={() => onTap?.(venue.id)} style={{
      width: t.card.reel.w, height: t.card.reel.h, flexShrink: 0,
      borderRadius: t.radius.md, overflow: 'hidden', position: 'relative',
      background: '#111', cursor: 'pointer',
    }}>
      {/* Always show thumbnail as base layer */}
      {thumbUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${thumbUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          zIndex: 1,
        }} />
      )}
      
      {/* Video on top, only visible when playing */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop muted playsInline
          preload="none"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 2,
            opacity: isPlaying && isReady ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
      
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 3,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        borderRadius: t.radius.pill, padding: '3px 9px',
        fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
      }}>
        {venue.walkMinutes} min
      </div>
      
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '40px 12px 12px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{venue.name}</div>
      </div>
    </div>
  );
}
