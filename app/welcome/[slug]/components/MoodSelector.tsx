'use client';
import { t } from '../tokens';
import { MoodChip } from '../types';

export default function MoodSelector({ chips, active, onSelect }: {
  chips: MoodChip[]; active: string | null; onSelect: (key: string) => void;
}) {
  return (
    <div style={{ padding: `20px ${t.gutter}px 0` }}>
      <div style={{ fontSize: 10, letterSpacing: 2.5, color: t.color.textMuted, marginBottom: 10, fontWeight: 600 }}>
        WHAT&apos;S YOUR MOVE?
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map(chip => {
          const isActive = active === chip.key;
          return (
            <button key={chip.key} onClick={() => onSelect(chip.key)} style={{
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: t.radius.pill, padding: '8px 18px',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
              letterSpacing: 0.2,
            }}>
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
