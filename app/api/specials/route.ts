import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const day = searchParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const limit = parseInt(searchParams.get('limit') || '20');
    const maxDistance = parseFloat(searchParams.get('max_distance') || '25');

    const db = new Database(DB_PATH);
    const hour = new Date().getHours();

    let query = `
      SELECT 
        vs.id, vs.title, vs.description, vs.discount_text,
        vs.time_range, vs.days_active, vs.featured,
        v.id as venue_id, v.name as venue_name, v.address,
        v.latitude, v.longitude, v.category, v.google_rating,
        v.professional_photo_url, v.cuisine_primary,
        p.tier
      FROM venue_specials vs
      JOIN venues v ON vs.venue_id = v.id
      LEFT JOIN partners p ON v.partner_id = p.id
      WHERE vs.active = 1
    `;

    if (latitude && longitude) {
      query += ` AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL`;
    }

    if (latitude && longitude) {
      query += `
        ORDER BY 
          vs.featured DESC,
          CASE WHEN p.tier IN ('marketing', 'premium') THEN 0 ELSE 1 END,
          ((v.latitude - ?) * (v.latitude - ?) + (v.longitude - ?) * (v.longitude - ?)) ASC,
          v.google_rating DESC
      `;
    } else {
      query += `
        ORDER BY 
          vs.featured DESC,
          CASE WHEN p.tier IN ('marketing', 'premium') THEN 0 ELSE 1 END,
          v.google_rating DESC,
          vs.created_at DESC
      `;
    }

    query += ` LIMIT ?`;

    const params = latitude && longitude 
      ? [latitude, latitude, longitude, longitude, limit]
      : [limit];

    const specials = db.prepare(query).all(...params) as any[];

    const enrichedSpecials = specials.map(special => {
      let distance = null;
      if (latitude && longitude && special.latitude && special.longitude) {
        distance = getDistance(latitude, longitude, special.latitude, special.longitude);
      }

      return {
        id: special.id,
        title: special.title,
        description: special.description,
        discount_text: special.discount_text,
        time_range: special.time_range,
        venue: {
          id: special.venue_id,
          name: special.venue_name,
          address: special.address,
          category: special.category,
          rating: special.google_rating,
          image_url: special.professional_photo_url,
          cuisine: special.cuisine_primary,
          latitude: special.latitude,
          longitude: special.longitude,
          distance: distance ? parseFloat(distance.toFixed(2)) : null
        },
        featured: special.featured === 1,
        tier: special.tier || 'free'
      };
    });

    db.close();

    return NextResponse.json({
      success: true,
      specials: enrichedSpecials,
      day: day,
      current_time: hour,
      total: enrichedSpecials.length
    });

  } catch (error) {
    console.error('Specials feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch specials' }, { status: 500 });
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
