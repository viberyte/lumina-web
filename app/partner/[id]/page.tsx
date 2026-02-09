import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Database from 'better-sqlite3';
import path from 'path';

interface PartnerPageProps {
  params: Promise<{ id: string }>;
}

function getPartner(id: number) {
  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  try {
    const partner = db.prepare(`
      SELECT p.*, 
             pv.name as venue_name, pv.address as venue_address, 
             pv.city as venue_city, pv.state as venue_state,
             pv.description as venue_description, pv.phone as venue_phone,
             pv.website as venue_website, pv.instagram as venue_instagram,
             v.gallery_photos as src_gallery_photos,
             v.google_photos as src_google_photos,
             v.professional_photos as src_professional_photos,
             v.yelp_photos_json as src_yelp_photos,
             v.professional_photo_url as src_pro_photo_url,
             v.image_url as src_image_url,
             v.vibe_tags as src_vibe_tags,
             v.music_genres as src_music_genres,
             v.primary_vibes as src_primary_vibes,
             v.hours_json as src_hours_json,
             v.dress_code as src_dress_code,
             v.price_tier as src_price_tier,
             v.price_range as src_price_range,
             v.crowd_type_tags as src_crowd_tags,
             v.crowd_age_range as src_crowd_age
      FROM partners p
      LEFT JOIN partner_venues pv ON pv.partner_id = p.id AND pv.is_home = 1
      LEFT JOIN venues v ON v.id = p.source_venue_id
      WHERE p.id = ? AND p.status IN ('approved', 'demo', 'active')
    `).get(id) as any;
    return partner;
  } finally {
    db.close();
  }
}

function getPartnerEvents(partnerId: number) {
  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  try {
    return db.prepare(`
      SELECT pe.*, pv.name as venue_name, pv.address as venue_address
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      WHERE pe.partner_id = ? AND pe.status = 'published'
      ORDER BY pe.event_date DESC
    `).all(partnerId) as any[];
  } finally {
    db.close();
  }
}

function parsePackages(json: string | null) {
  if (!json) return [];
  try {
    const p = JSON.parse(json);
    return Array.isArray(p) ? p.filter((x: any) => x?.name) : [];
  } catch { return []; }
}

function safeParseArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return val.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
}

function extractUrl(item: any): string | null {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && typeof item.url === 'string') return item.url;
  return null;
}

function isValidPhoto(url: string): boolean {
  return !!url && !url.includes('googleapis.com/maps/api/place/photo');
}

function collectPhotos(partner: any): string[] {
  const all: string[] = [];
  const sources = [
    partner.gallery_photos,
    partner.src_gallery_photos,
    partner.src_google_photos,
    partner.src_professional_photos,
    partner.src_yelp_photos,
  ];
  for (const src of sources) {
    for (const raw of safeParseArray(src)) {
      const p = extractUrl(raw);
      if (p && isValidPhoto(p) && !all.includes(p)) all.push(p);
    }
  }
  const singles = [partner.src_pro_photo_url, partner.src_image_url];
  for (const s of singles) {
    if (s && isValidPhoto(s) && !all.includes(s)) all.push(s);
  }
  return all;
}

function getAvatar(partner: any, galleryPhotos: string[]): string | null {
  if (partner.profile_picture && isValidPhoto(partner.profile_picture)) {
    return partner.profile_picture;
  }
  if (partner.src_image_url && isValidPhoto(partner.src_image_url)) {
    return partner.src_image_url;
  }
  if (galleryPhotos.length > 0) return galleryPhotos[0];
  return null;
}

export async function generateMetadata({ params }: PartnerPageProps): Promise<Metadata> {
  const { id } = await params;
  const partner = getPartner(parseInt(id));
  if (!partner) return { title: 'Not Found | Lumina' };

  const displayName = partner.business_name || partner.venue_name || partner.name;
  const location = partner.venue_city ? `${partner.venue_city}, ${partner.venue_state}` : '';

  return {
    title: `${displayName} | Lumina`,
    description: partner.bio || `Discover events at ${displayName}${location ? ` in ${location}` : ''}. Book tables and join guest lists on Lumina.`,
    openGraph: {
      title: displayName,
      description: partner.bio || `Events & nightlife at ${displayName}`,
      images: partner.cover_photo_url ? [partner.cover_photo_url] : partner.profile_picture ? [partner.profile_picture] : [],
      type: 'website',
      url: `https://lumina.viberyte.com/partner/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: displayName,
      description: partner.bio || `Events & nightlife at ${displayName}`,
    },
  };
}

export default async function PartnerProfilePage({ params }: PartnerPageProps) {
  const { id } = await params;
  const partner = getPartner(parseInt(id));
  if (!partner) notFound();

  const events = getPartnerEvents(partner.id);
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.event_date) >= now);
  const past = events.filter(e => new Date(e.event_date) < now);

  const displayName = partner.business_name || partner.venue_name || partner.name;
  const location = [partner.venue_city, partner.venue_state].filter(Boolean).join(', ');
  const igHandle = partner.instagram_handle || partner.instagram_username || partner.venue_instagram;

  const galleryPhotos = collectPhotos(partner);
  const avatarUrl = getAvatar(partner, galleryPhotos);

  let vibes: string[] = safeParseArray(partner.vibes);
  if (vibes.length === 0) vibes = safeParseArray(partner.src_primary_vibes);
  if (vibes.length === 0) vibes = safeParseArray(partner.src_vibe_tags);

  let genres: string[] = [];
  if (partner.primary_genres || partner.genres) {
    genres = safeParseArray(partner.primary_genres || partner.genres);
  } else if (partner.primary_genre) {
    genres = [partner.primary_genre];
    if (partner.secondary_genres) {
      genres = [...genres, ...partner.secondary_genres.split(',').map((g: string) => g.trim())];
    }
  }
  if (genres.length === 0) genres = safeParseArray(partner.src_music_genres);

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    try {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
    } catch { return t; }
  };

  const gridPhotos = galleryPhotos.slice(0, 6);
  const overflowPhotos = galleryPhotos.slice(6, 12);

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', width: '100%', height: '50vh', maxHeight: '600px', overflow: 'hidden' }}>
        {partner.cover_photo_url ? (
          <img src={partner.cover_photo_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : galleryPhotos.length > 0 ? (
          <img src={galleryPhotos[0]} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)' }} />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                🏢
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {partner.is_verified === 1 && (
                <span style={{ display: 'inline-block', padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 100, marginBottom: 6, color: '#a78bfa' }}>✓ Verified</span>
              )}
              <h1 style={{ fontSize: 'clamp(28px, 7vw, 44px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}>{displayName}</h1>
              {location && (
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontWeight: 500 }}>📍 {location}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Claim Banner ── */}
      {partner.is_demo === 1 && partner.is_claimed !== 1 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', border: '1px solid rgba(139,92,246,0.3)', margin: '0 20px', borderRadius: 16, padding: '20px 24px', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>Is this your venue?</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Claim this page to manage events, bookings, and keep your content fresh.</p>
            </div>
            <a href={'/claim/' + (partner.claim_token || partner.id)} style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>Claim This Page</a>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ Free to claim</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ Instagram auto-sync</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ Event management</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ Booking system</span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>

        {/* Stats Row */}
        {(events.length > 0 || (partner.follower_count && partner.follower_count > 0)) && (
          <div style={{ display: 'flex', gap: 24, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {events.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{events.length}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Events</div>
              </div>
            )}
            {partner.follower_count > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {partner.follower_count >= 1000 ? `${(partner.follower_count / 1000).toFixed(1)}k` : partner.follower_count}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Followers</div>
              </div>
            )}
          </div>
        )}

        {/* Social Proof */}
        {(galleryPhotos.length > 0 || events.length > 0) && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {galleryPhotos.length > 0 && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>📸 {galleryPhotos.length} photos</span>
              )}
              {events.length > 0 && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>🎵 {events.length} events</span>
              )}
              {igHandle && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>📱 @{igHandle}</span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {partner.bio && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{partner.bio}</p>
          </div>
        )}

        {/* Our Story */}
        {partner.our_story ? (
          <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Our Story</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', margin: 0, whiteSpace: 'pre-line' }}>{partner.our_story}</p>
            </div>
          </div>
        ) : partner.is_demo === 1 && partner.is_claimed !== 1 ? (
          <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Our Story</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Claim this page to share your story with the nightlife community</p>
            </div>
          </div>
        ) : null}

        {/* Tags */}
        {(genres.length > 0 || vibes.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {genres.map((g, i) => (
              <span key={`g-${i}`} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100, color: '#a78bfa' }}>{g}</span>
            ))}
            {vibes.map((v, i) => (
              <span key={`v-${i}`} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, color: 'rgba(255,255,255,0.5)' }}>{v}</span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {igHandle && (
            <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              📸 @{igHandle}
            </a>
          )}
          {(partner.venue_address || partner.venue_name) && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(partner.venue_address || partner.venue_name)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              📍 Directions
            </a>
          )}
          {partner.venue_phone && (
            <a href={`tel:${partner.venue_phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              📞 Call
            </a>
          )}
          {(partner.website || partner.venue_website) && (
            <a href={partner.website || partner.venue_website} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              🌐 Website
            </a>
          )}
        </div>

        {/* Gallery — 6 grid + up to 6 scrollable */}
        {galleryPhotos.length > 0 && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Gallery</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, borderRadius: 16, overflow: 'hidden' }}>
              {gridPhotos.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
              ))}
            </div>
            {overflowPhotos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
                {overflowPhotos.map((url, i) => (
                  <img key={`ov-${i}`} src={url} alt="" style={{ width: 140, height: 140, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        {(partner.src_dress_code || partner.src_price_tier || partner.src_price_range || partner.src_crowd_tags) && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {partner.src_dress_code && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Dress Code</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{partner.src_dress_code}</div>
                </div>
              )}
              {(partner.src_price_tier || partner.src_price_range) && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Price</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{partner.src_price_range || partner.src_price_tier}</div>
                </div>
              )}
              {partner.src_crowd_tags && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', gridColumn: partner.src_dress_code && (partner.src_price_tier || partner.src_price_range) ? 'span 2' : 'auto' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Crowd</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{partner.src_crowd_tags}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hours */}
        {partner.src_hours_json && partner.src_hours_json !== '{}' && (() => {
          let hours: string[] = [];
          try { hours = JSON.parse(partner.src_hours_json); } catch {}
          if (!Array.isArray(hours) || hours.length === 0) return null;

          const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          const today = days[new Date().getDay()];
          const todayHours = hours.find((h: string) => h.startsWith(today));
          const isOpen = todayHours && !todayHours.toLowerCase().includes('closed');

          return (
            <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Hours</h2>
                {todayHours && (
                  <span style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 100, background: isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: isOpen ? '#22c55e' : '#ef4444', border: isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                    {isOpen ? 'Open Today' : 'Closed Today'}
                  </span>
                )}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                {hours.map((h: string, i: number) => {
                  const isToday = h.startsWith(today);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < hours.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: isToday ? 'rgba(139,92,246,0.06)' : 'transparent' }}>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>{h.split(':')[0]}</span>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : 'rgba(255,255,255,0.4)' }}>{h.substring(h.indexOf(':') + 1).trim()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Venue Card — address & phone only */}
        {partner.venue_name && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Venue</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{partner.venue_name}</h3>
              {partner.venue_address && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{partner.venue_address}</p>}
              {partner.venue_phone && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>📞 {partner.venue_phone}</p>}
            </div>
          </div>
        )}

        {/* Tonight's Event */}
        {(() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const tonightEvents = upcoming.filter((e: any) => e.event_date === todayStr);
          if (tonightEvents.length === 0) return null;
          const evt = tonightEvents[0];
          const pkgs = parsePackages(evt.packages);
          const slug = evt.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + evt.id;
          return (
            <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                <h2 style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Happening Tonight</h2>
              </div>
              <a href={`/e/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(34,197,94,0.05))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: 20 }}>
                  <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>{evt.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    {evt.venue_name} · {formatTime(evt.event_time) || 'Tonight'}
                  </p>
                  {pkgs.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <span style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.12)', borderRadius: 100, color: '#a78bfa' }}>🍾 {pkgs.length} {pkgs.length === 1 ? 'package' : 'packages'} available</span>
                    </div>
                  )}
                </div>
              </a>
            </div>
          );
        })()}

        {/* Upcoming Events */}
        {upcoming.length > 0 && (
          <div style={{ padding: '24px 0' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>Upcoming Events</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.map((evt: any) => {
                const pkgs = parsePackages(evt.packages);
                const slug = evt.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + evt.id;
                const evtGenres = evt.genre?.split(',').map((g: string) => g.trim()).filter(Boolean) || [];
                return (
                  <a key={evt.id} href={`/e/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                            {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                            {new Date(evt.event_date).getDate()}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</h3>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                            {evt.venue_name} · {formatTime(evt.event_time) || '10PM'}
                          </p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            {evtGenres.slice(0, 2).map((g: string, i: number) => (
                              <span key={i} style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', borderRadius: 100, color: 'rgba(255,255,255,0.45)' }}>{g}</span>
                            ))}
                            {pkgs.length > 0 && (
                              <span style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'rgba(139,92,246,0.1)', borderRadius: 100, color: '#a78bfa' }}>🍾 {pkgs.length} {pkgs.length === 1 ? 'package' : 'packages'}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>→</div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Events */}
        {past.length > 0 && (
          <div style={{ padding: '0 0 24px' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>Past Events</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {past.slice(0, 8).map((evt: any) => {
                const slug = evt.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + evt.id;
                return (
                  <a key={evt.id} href={`/e/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.6)' }}>{evt.title}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>{formatDate(evt.event_date)} · {evt.venue_name}</p>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>→</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Events coming soon</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Follow for updates on upcoming events</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px 0 48px' }}>
          <a href="https://apps.apple.com/app/lumina" style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 16, color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Open in Lumina
          </a>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 12 }}>Plan nights, not searches.</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Powered by <span style={{ color: 'rgba(255,255,255,0.4)' }}>Lumina</span></p>
      </div>
    </div>
  );
}
