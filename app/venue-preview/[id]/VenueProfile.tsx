'use client';
import { useEffect, useState, useRef } from 'react';

interface VenueDetail {
  id: number; name: string; type: string; cuisine: string;
  image: string; price: string; phone: string; website: string; address: string;
  property: { name: string; walkMin: number; distMi: number } | null;
  why: string; chips: string[];
  reel: { videoUrl: string; thumbnailUrl: string } | null;
  allReels: { videoUrl: string; thumbnailUrl: string }[];
  instagram: string;
  vibes: string[]; music: string[]; features: string[]; intents: string[];
}

export default function VenueProfile({ id }: { id: string }) {
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [playingGrid, setPlayingGrid] = useState<number | null>(null);
  const heroRef = useRef<HTMLVideoElement>(null);
  const gridVideoRefs = useRef<Record<number, HTMLVideoElement>>({});

  // Get property slug from URL params
  const fromSlug = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('from') : null;

  useEffect(() => {
    const qs = fromSlug ? `?from=${fromSlug}` : '';
    fetch(`/api/venue-preview/${id}${qs}`)
      .then(r => r.json())
      .then(setVenue)
      .catch(() => {});
  }, [id, fromSlug]);

  useEffect(() => {
    if (heroRef.current && venue?.reel?.videoUrl) {
      heroRef.current.muted = true;
      heroRef.current.play().catch(() => {});
    }
  }, [venue]);

  const handleGridTap = (i: number, videoUrl: string) => {
    if (!videoUrl) return;
    if (playingGrid === i) {
      gridVideoRefs.current[i]?.pause();
      setPlayingGrid(null);
    } else {
      // Pause previous
      if (playingGrid !== null) gridVideoRefs.current[playingGrid]?.pause();
      gridVideoRefs.current[i]?.play().catch(() => {});
      setPlayingGrid(i);
    }
  };

  if (!venue) return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const heroVideo = venue.reel?.videoUrl || '';
  const heroImg = venue.reel?.thumbnailUrl || venue.image || '';
  const propName = venue.property?.name || '';
  const shortProp = propName.replace(/Hotel\s*/gi, '').trim();

  return (
    <div style={{
      minHeight: '100vh', background: '#000', color: '#fff',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased', maxWidth: 430, margin: '0 auto',
    }}>
      <style>{`* { margin:0; padding:0; box-sizing:border-box; } body { background:#000; } ::-webkit-scrollbar{display:none;}`}</style>

      {/* Hero */}
      <div style={{ position: 'relative', height: '56vh', overflow: 'hidden' }}>
        {heroVideo ? (
          <video ref={heroRef} src={heroVideo} poster={heroImg}
            autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : heroImg ? (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.92))' }} />
        
        <button onClick={() => window.history.back()} style={{
          position: 'absolute', top: 52, left: 16, zIndex: 10,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
          border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 24px' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 }}>
            {venue.type}{venue.cuisine && venue.cuisine !== venue.type ? ` · ${venue.cuisine}` : ''}
            {venue.price ? ` · ${venue.price}` : ''}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginTop: 2 }}>{venue.name}</h1>
          {venue.property && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
              {venue.property.walkMin} min from {shortProp} · {venue.property.distMi} mi
            </div>
          )}
        </div>
      </div>

      {/* Primary actions */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 10 }}>
        <a href={`https://maps.google.com/?q=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#fff', borderRadius: 14, padding: '14px 0',
            fontSize: 15, fontWeight: 600, color: '#000', textDecoration: 'none',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Directions
        </a>
        <a href={`https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14, padding: '14px 0',
            fontSize: 15, fontWeight: 600, color: '#fff', textDecoration: 'none',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="2"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/><path d="M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2"/></svg>
          Ride there
        </a>
      </div>

      {/* Utility links */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 20,
        padding: '14px 20px 4px',
      }}>
        {[
          ...(venue.instagram ? [{ label: 'Instagram', href: `https://instagram.com/${venue.instagram}` }] : []),
          ...(venue.website ? [{ label: 'Website', href: venue.website }] : []),
          ...(venue.phone ? [{ label: 'Call', href: `tel:${venue.phone}` }] : []),
        ].map((link, i) => (
          <a key={i} href={link.href} target="_blank" rel="noopener"
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            {link.label}
          </a>
        ))}
      </div>

      {/* Why you'll like it */}
      {venue.why && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontWeight: 600 }}>
            WHY YOU&apos;LL LIKE IT
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>
            {venue.why}
          </p>
          {venue.chips.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {venue.chips.map((chip, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 100, padding: '5px 14px',
                  fontSize: 13, color: 'rgba(255,255,255,0.5)',
                }}>{chip}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Address */}
      <div style={{ padding: '16px 20px 0', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
        {venue.address}
      </div>

      {/* See the vibe — clickable grid */}
      {venue.allReels && venue.allReels.length > 0 && (
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 12, fontWeight: 600 }}>
            SEE THE VIBE
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2, borderRadius: 14, overflow: 'hidden',
          }}>
            {venue.allReels.map((reel, i) => (
              <div key={i}
                onClick={() => handleGridTap(i, reel.videoUrl)}
                style={{
                  position: 'relative', paddingBottom: '133%',
                  background: '#111', cursor: reel.videoUrl ? 'pointer' : 'default',
                }}>
                {playingGrid === i && reel.videoUrl ? (
                  <video
                    ref={(el) => { if (el) gridVideoRefs.current[i] = el; }}
                    src={reel.videoUrl}
                    autoPlay loop muted playsInline
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : reel.thumbnailUrl ? (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${reel.thumbnailUrl})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                ) : null}
                {reel.videoUrl && playingGrid !== i && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '8px 20px 48px' }}>
        <span style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.1)' }}>VIBERYTE</span>
      </div>
    </div>
  );
}
