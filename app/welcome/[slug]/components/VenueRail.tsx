'use client';
import { t } from '../tokens';
import { Venue } from '../types';
import ReelCard from './ReelCard';

export default function VenueRail({ title, subtitle, venues, onTapVenue }: {
  title: string; subtitle: string; venues: Venue[]; onTapVenue?: (id: number) => void;
}) {
  if (venues.length === 0) return null;
  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ padding: `0 ${t.gutter}px` }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: t.color.text, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 13, color: t.color.textMuted, margin: '2px 0 0' }}>{subtitle}</p>
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        padding: `14px ${t.gutter}px 0`,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {venues.map(v => <ReelCard key={v.id} venue={v} onTap={onTapVenue} />)}
      </div>
    </div>
  );
}
