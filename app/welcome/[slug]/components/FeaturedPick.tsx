'use client';
import { t } from '../tokens';
import { Venue } from '../types';

export default function FeaturedPick({ venue, onTap }: { venue: Venue | null; onTap?: (id: number) => void }) {
  if (!venue) return null;
  const img = venue.reel?.thumbnailUrl || venue.image || '';

  return (
    <div style={{ padding: `24px ${t.gutter}px 0` }}>
      <div style={{ fontSize: 10, letterSpacing: 2.5, color: t.color.accent, marginBottom: 12, fontWeight: 600 }}>
        VIBERYTE PICK · RIGHT NOW
      </div>
      <div onClick={() => onTap?.(venue.id)} style={{ cursor: 'pointer' }}>
        <div style={{ borderRadius: t.radius.lg, overflow: 'hidden', position: 'relative', background: t.color.surface }}>
          {img && <div style={{ height: 220, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            padding: '60px 20px 20px',
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' }}>{venue.name}</h2>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              <span>{venue.walkMinutes} min from your hotel</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' }}>{venue.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
