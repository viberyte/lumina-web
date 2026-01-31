import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const city = searchParams.get('city');

    if (!query.trim()) {
      return NextResponse.json({ venues: [] });
    }

    const dbPath = path.join(process.cwd(), 'data', 'lumina.db');
    const db = new Database(dbPath);
    
    let sql = `
      SELECT 
        id, name, neighborhood, city, category, cuisine, cuisine_primary,
        music_genres, vibe_tags, mood_tags, bio,
        google_rating as rating, yelp_rating,
        professional_photos, professional_photo_url,
        address, price_tier, phone, website
      FROM venues
      WHERE viberyte_certified = 1
        AND (
          name LIKE ? 
          OR cuisine LIKE ?
          OR cuisine_primary LIKE ?
          OR vibe_tags LIKE ?
          OR neighborhood LIKE ?
        )
    `;

    const params = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`
    ];

    if (city) {
      sql += ` AND city LIKE ?`;
      params.push(`%${city}%`);
    }

    sql += ` ORDER BY google_rating DESC LIMIT 20`;

    const rawVenues = db.prepare(sql).all(...params);
    db.close();

    const BASE_URL = 'https://lumina.viberyte.com';
    const venues = rawVenues.map((v: any) => {
      // Transform photo URLs
      let photo_url = null;
      if (v.professional_photo_url) {
        photo_url = v.professional_photo_url.startsWith('http')
          ? v.professional_photo_url
          : `${BASE_URL}${v.professional_photo_url}`;
      }

      let professional_photos = [];
      if (v.professional_photos) {
        try {
          const photos = JSON.parse(v.professional_photos);
          professional_photos = Array.isArray(photos)
            ? photos.map((p: string) => p.startsWith('http') ? p : `${BASE_URL}${p}`)
            : [];
        } catch {}
      }

      return {
        ...v,
        photo_url,
        professional_photo_url: photo_url,
        professional_photos,
        vibe_tags: v.vibe_tags ? JSON.parse(v.vibe_tags) : [],
        mood_tags: v.mood_tags ? JSON.parse(v.mood_tags) : []
      };
    });

    return NextResponse.json({ venues, count: venues.length });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed', message: error.message }, { status: 500 });
  }
}
