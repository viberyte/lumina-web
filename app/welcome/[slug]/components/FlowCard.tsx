'use client';
import { t } from '../tokens';
import { Flow } from '../types';

const FLOW_GRADIENTS: Record<string, string> = {
  'Date Night': 'linear-gradient(135deg, #4a1942 0%, #c94b7a 100%)',
  'Friends Night': 'linear-gradient(135deg, #1a472a 0%, #4a8c5c 100%)',
  'Late Night': 'linear-gradient(135deg, #0f1b3d 0%, #2d4a8a 100%)',
  'Afro Night': 'linear-gradient(135deg, #2d1b0e 0%, #8a6b3d 100%)',
  'Business Dinner': 'linear-gradient(135deg, #1a1a2e 0%, #3d3d6b 100%)',
};

const ROLE_LABELS: Record<string, string> = {
  'Dinner': 'THE SETTING',
  'Cocktails': 'COCKTAILS',
  'Drinks': 'DRINKS',
  'Main Event': 'THE MOVE',
};

export default function FlowCard({ flow }: { flow: Flow }) {
  const gradient = FLOW_GRADIENTS[flow.name] || 'linear-gradient(135deg, #1a1040 0%, #2d1b4e 100%)';
  
  return (
    <div style={{
      width: '85vw', maxWidth: 340, flexShrink: 0,
      borderRadius: t.radius.lg, overflow: 'hidden',
      background: gradient, padding: '24px 22px 20px',
      position: 'relative',
    }}>
      {/* Flow name */}
      <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
        {flow.name}
      </h3>
      
      {/* Stops */}
      <div style={{ marginTop: 24 }}>
        {flow.stops.map((stop, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < flow.stops.length - 1 ? 20 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)', flexShrink: 0,
              }} />
              {i < flow.stops.length - 1 && (
                <div style={{ width: 1.5, flex: 1, background: 'rgba(255,255,255,0.2)', minHeight: 24 }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                {ROLE_LABELS[stop.role] || stop.role.toUpperCase()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                {stop.venue.name}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 24, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.12)',
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          {flow.stopCount} stops
        </span>
        <button style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: t.radius.pill, padding: '7px 18px',
          fontSize: 13, fontWeight: 500, color: '#fff',
          cursor: 'pointer',
        }}>
          View Flow ›
        </button>
      </div>
    </div>
  );
}
