'use client';
import { t } from '../tokens';

export default function AppHandoff() {
  return (
    <div style={{
      padding: `48px ${t.gutter}px 60px`,
      textAlign: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: t.radius.lg, padding: '32px 24px',
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: t.color.textMuted, marginBottom: 12 }}>VIBERYTE</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: t.color.text, margin: 0, lineHeight: 1.3 }}>
          Get the full experience
        </h3>
        <p style={{ fontSize: 14, color: t.color.textSoft, margin: '8px 0 20px', lineHeight: 1.4 }}>
          Save favorites, book tables, and get<br />personalized recommendations
        </p>
        <button style={{
          background: '#fff', border: 'none',
          borderRadius: t.radius.pill, padding: '13px 32px',
          fontSize: 15, fontWeight: 600, color: '#000',
          cursor: 'pointer', letterSpacing: 0.3,
        }}>
          Continue in Viberyte
        </button>
      </div>
    </div>
  );
}
