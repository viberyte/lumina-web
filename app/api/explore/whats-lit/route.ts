import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '40.7128');
  const lng = parseFloat(searchParams.get('lng') || '-74.0060');
  const radius = parseFloat(searchParams.get('radius') || '50');
  const day = searchParams.get('day') || getDayOfWeek();
  const db = new Database(dbPath);
  try {
    const venues = db.prepare(`SELECT v.id, v.name, v.address, v.city, v.neighborhood, v.latitude, v.longitude, v.rating, v.price_tier, v.category, v.google_photos, vi.energy_level, vi.crowd_density, vi.music_genres, vi.weekly_profile, vi.momentum, vi.time_profile, vi.pricing_signals, vi.dating_energy, vi.inclusivity_lgbtq, vi.warnings, vi.summary, vi.explore_tags FROM venues v INNER JOIN venue_intelligence vi ON v.id = vi.venue_id WHERE v.should_exclude = 0 AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL AND v.latitude BETWEEN ? - 1 AND ? + 1 AND v.longitude BETWEEN ? - 1 AND ? + 1`).all(lat - 1, lat + 1, lng - 1, lng + 1);
    const enrichedVenues = venues.map(v => {
      const distance = calculateDistance(lat, lng, v.latitude, v.longitude);
      if (distance > radius) return null;
      const weeklyProfile = v.weekly_profile ? JSON.parse(v.weekly_profile) : {};
      const dayScore = weeklyProfile[day]?.score || 0;
      const dayConfidence = weeklyProfile[day]?.confidence || 'low';
      const instagramMedia = db.prepare(`SELECT media_url, media_type, posted_at FROM venue_instagram_media WHERE venue_id = ? ORDER BY posted_at DESC`).all(v.id);
      const instagramPhotos = instagramMedia.filter(m => m.media_type === 'image').map(m => m.media_url);
      const instagramVideos = instagramMedia.filter(m => m.media_type === 'video').map(m => m.media_url);
      const googlePhotos = v.google_photos ? JSON.parse(v.google_photos) : [];
      const allPhotos = [...instagramPhotos, ...googlePhotos];
      return { ...v, distance, google_photos: JSON.stringify(allPhotos), instagram_videos: JSON.stringify(instagramVideos), media_count: { photos: allPhotos.length, videos: instagramVideos.length, total: allPhotos.length + instagramVideos.length }, weekly_profile: weeklyProfile, music_genres: v.music_genres ? JSON.parse(v.music_genres) : [], time_profile: v.time_profile ? JSON.parse(v.time_profile) : {}, explore_tags: v.explore_tags ? JSON.parse(v.explore_tags) : [], day_score: dayScore, day_confidence: dayConfidence };
    }).filter(v => v !== null);
    const categories = {
      best_tonight: enrichedVenues.filter(v => v.day_score >= 0.75 && v.day_confidence !== 'low').sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      rising_stars: enrichedVenues.filter(v => v.momentum === 'rising').sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      high_energy: enrichedVenues.filter(v => v.energy_level === 'high').sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      date_friendly: enrichedVenues.filter(v => v.dating_energy && ['high', 'medium'].includes(v.dating_energy)).sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      lgbtq_friendly: enrichedVenues.filter(v => v.inclusivity_lgbtq === 'high').sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      late_night: enrichedVenues.filter(v => { const timeProfile = typeof v.time_profile === 'string' ? JSON.parse(v.time_profile) : v.time_profile; return timeProfile?.late_night === true; }).sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      hidden_gems: enrichedVenues.filter(v => v.day_score >= 0.6 && v.crowd_density && ['social', 'empty'].includes(v.crowd_density)).sort((a, b) => b.day_score - a.day_score).slice(0, 20),
      food_trucks: enrichedVenues.filter(v => v.category === 'food_truck').sort((a, b) => b.day_score - a.day_score).slice(0, 20)
    };
    db.close();
    return NextResponse.json({ success: true, day, location: { lat, lng, radius }, categories, metadata: { total_venues: enrichedVenues.length, category_counts: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length])) } }, { headers: corsHeaders });
  } catch (error: any) {
    db.close();
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500, headers: corsHeaders });
  }
}
