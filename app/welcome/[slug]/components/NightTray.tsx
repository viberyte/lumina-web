'use client';

interface SavedVenue { id: number; name: string; image: string; }

export default function NightTray({ saved, onRemove, onClear }: {
  saved: SavedVenue[]; onRemove: (id: number) => void; onClear: () => void;
}) {
  if (saved.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
      background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      maxWidth: 430, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
          YOUR NIGHT · {saved.length} {saved.length === 1 ? 'spot' : 'spots'}
        </span>
        <button onClick={onClear} style={{
          background: 'none', border: 'none', fontSize: 12,
          color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
        }}>Clear</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {saved.map((v, i) => (
          <div key={v.id} style={{
            position: 'relative', width: 52, height: 52,
            borderRadius: 12, overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${v.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <button onClick={() => onRemove(v.id)} style={{
              position: 'absolute', top: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              fontSize: 7, color: '#fff', textAlign: 'center',
              background: 'rgba(0,0,0,0.6)', padding: '2px 2px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{v.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
