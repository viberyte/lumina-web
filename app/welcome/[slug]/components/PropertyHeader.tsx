'use client';
import { t } from '../tokens';

export default function PropertyHeader({ name, neighborhood, timeStr, dayName }: {
  name: string; neighborhood: string; timeStr: string; dayName: string;
}) {
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `14px ${t.gutter}px`, position: 'relative', zIndex: 10,
    }}>
      <span style={{ fontSize: 11, letterSpacing: 4, color: t.color.textMuted, fontWeight: 600 }}>VIBERYTE</span>
      <span style={{
        fontSize: 11, color: t.color.textMuted,
        background: t.color.surface, border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.pill, padding: '4px 12px',
      }}>
        {dayName} · {timeStr}
      </span>
    </header>
  );
}
