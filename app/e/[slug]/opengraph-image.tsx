import { ImageResponse } from 'next/og';
import Database from 'better-sqlite3';
import path from 'path';

export const runtime = 'nodejs';
export const alt = 'Viberyte Event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600; // cache for 1 hour

function getEvent(slug: string) {
  const parts = slug.split('-');
  const id = parseInt(parts[parts.length - 1]);
  if (isNaN(id)) return null;

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  try {
    return db.prepare(`
      SELECT pe.*, pv.name as venue_name, pv.address as venue_address
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      WHERE pe.id = ?
    `).get(id) as any;
  } finally {
    db.close();
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return dateStr;
  } catch { return dateStr; }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`;
  } catch { return timeStr || ''; }
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);

  if (!event) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 48, fontWeight: 700 }}>Event Not Found</span>
        </div>
      ),
      { ...size }
    );
  }

  const genres = event.genre?.split(',').map((g: string) => g.trim()).filter(Boolean) || [];
  const dateStr = formatDate(event.event_date);
  const timeStr = formatTime(event.event_time);
  const hasImage = !!event.image_url;

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
      }}>
        {hasImage ? (
          <img
            src={event.image_url}
            style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <div style={{
          display: 'flex', flexDirection: 'column',
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: hasImage
            ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 100%)'
            : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)',
          padding: '60px',
          justifyContent: 'flex-end',
        }}>
          {/* LUMINA wordmark top right */}
          <div style={{
            display: 'flex', position: 'absolute', top: '40px', right: '60px',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.35)', fontSize: '16px', fontWeight: 700,
              letterSpacing: '4px',
            }}>LUMINA</span>
          </div>

          {/* Accent line */}
          <div style={{
            display: 'flex', width: '60px', height: '4px',
            background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.2))',
            borderRadius: '2px', marginBottom: '24px',
          }} />

          {/* Genre tags */}
          {genres.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {genres.slice(0, 3).map((g: string) => (
                <span key={g} style={{
                  padding: '8px 18px', fontSize: '14px', fontWeight: 600,
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)',
                }}>{g}</span>
              ))}
            </div>
          )}

          {/* Event title */}
          <h1 style={{
            fontSize: event.title.length > 30 ? '56px' : '72px',
            fontWeight: 800, color: '#fff', lineHeight: 1.05,
            letterSpacing: '-0.03em', margin: '0 0 20px', maxWidth: '900px',
          }}>{event.title}</h1>

          {/* Date + Time + Venue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{
              fontSize: '22px', fontWeight: 500, color: 'rgba(255,255,255,0.8)',
              margin: 0, display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              {dateStr && <span>{dateStr}</span>}
              {timeStr && <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>}
              {timeStr && <span>{timeStr}</span>}
            </p>
            {event.venue_name && (
              <p style={{
                fontSize: '20px', color: 'rgba(255,255,255,0.45)', margin: 0,
              }}>
                {event.venue_name}
                {event.venue_address && ` · ${event.venue_address}`}
              </p>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
