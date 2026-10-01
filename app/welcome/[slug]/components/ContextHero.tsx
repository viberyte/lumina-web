'use client';
import { useRef, useEffect } from 'react';
import { t } from '../tokens';
import { Venue } from '../types';

export default function ContextHero({ venue, greeting, propertyName, neighborhood }: {
  venue: Venue | null; greeting: string; propertyName: string; neighborhood: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shortName = propertyName.replace(/Hotel\s*/gi, '').replace(/\s*Downtown/gi, '').trim();

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.play().catch(() => {});
  }, []);

  return (
    <div style={{
      position: 'relative', height: '52vh', overflow: 'hidden',
      marginTop: -56,
    }}>
      <video
        ref={videoRef}
        src="/media/hero-mobile.mp4"
        autoPlay loop muted playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          filter: 'brightness(0.5) saturate(1.1)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: `0 ${t.gutter}px 28px`,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: t.color.textMuted, marginBottom: 6 }}>VIBERYTE</div>
        <h1 style={{
          fontSize: 30, fontWeight: 800, lineHeight: 1.1, margin: 0,
          color: t.color.text,
        }}>
          {greeting} near<br />{shortName}
        </h1>
        <p style={{ fontSize: 13, color: t.color.textSoft, marginTop: 6, margin: 0 }}>
          Curated for guests · {neighborhood}
        </p>
      </div>
    </div>
  );
}
