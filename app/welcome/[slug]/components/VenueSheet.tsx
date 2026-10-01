'use client';
import { useEffect, useState, useRef } from 'react';

interface SheetVenue {
  id: number; name: string; type: string; cuisine: string;
  image: string; price: string; phone: string; website: string; address: string;
  neighborhood: string;
  property: { name: string; walkMin: number; distMi: number } | null;
  why: string; chips: string[];
  reel: { videoUrl: string; thumbnailUrl: string } | null;
  allReels: { videoUrl: string; thumbnailUrl: string }[];
  instagram: string;
}

export default function VenueSheet({ venueId, slug, onClose, onSave }: {
  venueId: number | null; slug: string; onClose: () => void; onSave: (v: { id: number; name: string; image: string }) => void;
}) {
  const [venue, setVenue] = useState<SheetVenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingGrid, setPlayingGrid] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const heroRef = useRef<HTMLVideoElement>(null);
  const gridRefs = useRef<Record<number, HTMLVideoElement>>({});
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!venueId) { setVenue(null); return; }
    setLoading(true);
    fetch(`/api/venue-preview/${venueId}?from=${slug}`)
      .then(r => r.json())
      .then(d => { setVenue(d); setLoading(false); setPlayingGrid(null); setSoundOn(false); })
      .catch(() => setLoading(false));
  }, [venueId, slug]);

  useEffect(() => {
    if (heroRef.current && venue?.reel?.videoUrl) {
      heroRef.current.muted = !soundOn;
      heroRef.current.play().catch(() => {});
    }
  }, [venue, soundOn]);

  useEffect(() => {
    if (heroRef.current) heroRef.current.muted = !soundOn;
  }, [soundOn]);

  if (!venueId) return null;

  const shortProp = venue?.property?.name?.replace(/Hotel\s*/gi, '').trim() || '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      transition: 'opacity 0.3s',
      opacity: venueId ? 1 : 0,
      pointerEvents: venueId ? 'auto' : 'none',
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }} />
      
      {/* Sheet */}
      <div ref={sheetRef} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        maxHeight: '92vh', overflowY: 'auto',
        background: '#0a0a0a',
        borderRadius: '20px 20px 0 0',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {/* Header with handle + close */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 16px 0', position: 'relative' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          <button onClick={onClose} style={{
            position: 'absolute', right: 16, top: 8,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {loading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : venue ? (
          <>
            {/* Hero video with sound toggle */}
            <div style={{ position: 'relative', height: 340, overflow: 'hidden', margin: '8px 0 0' }}>
              {venue.reel?.videoUrl ? (
                <video ref={heroRef} src={venue.reel.videoUrl} poster={venue.reel.thumbnailUrl || venue.image}
                  autoPlay loop muted={!soundOn} playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px 16px 0 0' }} />
              ) : venue.image ? (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${venue.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px 16px 0 0' }} />
              ) : null}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.9))', borderRadius: '16px 16px 0 0' }} />
              
              {/* Sound toggle */}
              {venue.reel?.videoUrl && (
                <button onClick={() => setSoundOn(!soundOn)} style={{
                  position: 'absolute', top: 14, right: 14, zIndex: 5,
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    {soundOn ? (
                      <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></>
                    ) : (
                      <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                    )}
                  </svg>
                </button>
              )}

              {/* Save to night */}
              <button onClick={() => onSave({ id: venue.id, name: venue.name, image: venue.reel?.thumbnailUrl || venue.image })} style={{
                position: 'absolute', top: 14, left: 14, zIndex: 5,
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>

              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {venue.type}{venue.cuisine && venue.cuisine !== venue.type ? ` · ${venue.cuisine}` : ''}{venue.price ? ` · ${venue.price}` : ''}
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1, margin: '2px 0 0', color: '#fff' }}>{venue.name}</h2>
                {venue.property && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
                    {venue.property.walkMin} min from {shortProp} · {venue.property.distMi} mi
                  </div>
                )}
                {venue.neighborhood && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {venue.neighborhood}
                  </div>
                )}
              </div>
            </div>

            {/* Primary actions */}
            <div style={{ padding: '16px 20px 0', display: 'flex', gap: 10 }}>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', borderRadius: 14, padding: '13px 0', fontSize: 15, fontWeight: 600, color: '#000', textDecoration: 'none' }}>
                Directions
              </a>
              <a href={`https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '13px 0', fontSize: 15, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                Ride there
              </a>
            </div>

            {/* Utility links */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '12px 20px 0' }}>
              {[
                ...(venue.instagram ? [{ label: 'Instagram', href: `https://instagram.com/${venue.instagram}` }] : []),
                ...(venue.website ? [{ label: 'Website', href: venue.website }] : []),
                ...(venue.phone ? [{ label: 'Call', href: `tel:${venue.phone}` }] : []),
              ].map((l, i) => (
                <a key={i} href={l.href} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{l.label}</a>
              ))}
            </div>

            {/* Why */}
            {venue.why && (
              <div style={{ padding: '18px 20px 0' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 6, fontWeight: 600 }}>WHY YOU&apos;LL LIKE IT</div>
                <p style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>{venue.why}</p>
                {venue.chips.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {venue.chips.map((c, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '5px 13px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Social proof */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '10px 14px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  Popular with {shortProp || 'hotel'} guests
                </span>
              </div>
              <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
            </div>

            {/* See the vibe grid */}
            {venue.allReels.length > 0 && (
              <div style={{ padding: '18px 20px 24px' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 10, fontWeight: 600 }}>SEE THE VIBE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, borderRadius: 14, overflow: 'hidden' }}>
                  {venue.allReels.map((reel, i) => (
                    <div key={i} onClick={() => {
                      if (!reel.videoUrl) return;
                      if (playingGrid === i) { gridRefs.current[i]?.pause(); setPlayingGrid(null); }
                      else { if (playingGrid !== null) gridRefs.current[playingGrid]?.pause(); gridRefs.current[i]?.play().catch(() => {}); setPlayingGrid(i); }
                    }} style={{ position: 'relative', paddingBottom: '133%', background: '#111', cursor: reel.videoUrl ? 'pointer' : 'default' }}>
                      {playingGrid === i && reel.videoUrl ? (
                        <video ref={el => { if (el) gridRefs.current[i] = el; }} src={reel.videoUrl} autoPlay loop muted playsInline
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : reel.thumbnailUrl ? (
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${reel.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      ) : null}
                      {reel.videoUrl && playingGrid !== i && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: 20 }} />
          </>
        ) : null}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
