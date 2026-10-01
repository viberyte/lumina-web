'use client';
import { t } from '../tokens';
import { Flow } from '../types';
import FlowCard from './FlowCard';

export default function FlowRail({ flows }: { flows: Flow[] }) {
  if (flows.length === 0) return null;

  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ padding: `0 ${t.gutter}px` }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: t.color.text, margin: 0 }}>Make a Night of It</h2>
        <p style={{ fontSize: 13, color: t.color.textMuted, margin: '2px 0 0' }}>Every kind of night, planned out</p>
      </div>
      <div style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        padding: `14px ${t.gutter}px 4px`,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {flows.map((f, i) => <FlowCard key={i} flow={f} />)}
      </div>
    </div>
  );
}
