import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'New York';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Get current day
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const hour = now.getHours();
    
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    
    const query = `
      SELECT DISTINCT
        v.id,
        v.name,
        v.category,
        v.neighborhood,
        v.professional_photo_url as photo_url,
        v.rating,
        v.google_rating,
        v.price_range,
        v.vibe_tags,
        v.music_genres,
        v.peak_friction_hour,
        v.energy_level,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.venue_id = v.id 
          AND date(e.date) = date('now')
        ) as events_today
      FROM venues v
      WHERE v.category IN ('nightclub', 'lounge', 'bar', 'rooftop')
        AND v.has_photo = 1
        AND (v.city LIKE ? OR v.neighborhood LIKE ? OR v.city = 'New York' OR v.city = 'Manhattan')
      ORDER BY 
        events_today DESC,
        v.google_rating DESC,
        v.rating DESC
      LIMIT ?
    `;
    
    const rawVenues = db.prepare(query).all(
      `%${city}%`,
      `%${city}%`,
      limit
    );

    // Transform photo URLs to full URLs
    const BASE_URL = 'https://lumina.viberyte.com';
    const venues = rawVenues.map((v: any) => ({
      ...v,
      photo_url: v.photo_url
        ? (v.photo_url.startsWith('http') ? v.photo_url : `${BASE_URL}${v.photo_url}`)
        : null,
    }));

    const eventsQuery = `
      SELECT 
        e.id,
        e.name,
        e.venue_name,
        e.venue_id,
        e.date,
        e.image_url
      FROM events e
      WHERE date(e.date) = date('now')
      ORDER BY e.name
      LIMIT 20
    `;
    
    const todaysEvents = db.prepare(eventsQuery).all();
    
    return NextResponse.json({
      success: true,
      day: dayName,
      title: `${dayName}'s Moves`,
      subtitle: isWeekend ? "It's the weekend 🔥" : "Tonight's picks",
      venues,
      events: todaysEvents,
      meta: {
        total_venues: venues.length,
        total_events: todaysEvents.length,
        is_weekend: isWeekend,
        current_hour: hour
      }
    });
    
  } catch (error) {
    console.error('Error fetching todays moves:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}
