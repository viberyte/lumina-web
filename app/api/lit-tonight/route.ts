import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'New York';
    const dayParam = searchParams.get('day');
    
    // Get current day (0=Sunday, 1=Monday, ... 6=Saturday)
    const currentDay = dayParam ? parseInt(dayParam) : new Date().getDay();
    
    // Query venues with highest activity for this day
    const venues = db.prepare(`
      SELECT 
        v.*,
        d.activity_score,
        d.post_count,
        d.crowd_signal
      FROM venues v
      JOIN venue_day_activity d ON v.id = d.venue_id
      WHERE v.city LIKE ?
        AND d.day_of_week = ?
        AND d.activity_score > 2
      ORDER BY d.activity_score DESC
      LIMIT 20
    `).all(`%${city}%`, currentDay);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return NextResponse.json({
      day: dayNames[currentDay],
      dayNumber: currentDay,
      city,
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        neighborhood: v.neighborhood || v.city,
        rating: v.google_rating,
        category: v.primary_category || v.category,
        photo: v.google_photos ? JSON.parse(v.google_photos)[0] : null,
        activityScore: v.activity_score,
        postCount: v.post_count,
        crowdSignal: v.crowd_signal,
        vibe: v.energy_level,
        acousticBand: v.acoustic_band
      })),
      message: venues.length > 0 
        ? `${venues.length} spots are lit on ${dayNames[currentDay]}s in ${city}`
        : `No day-specific activity data for ${dayNames[currentDay]} yet`
    });

  } catch (error) {
    console.error('Lit Tonight API error:', error);
    return NextResponse.json({ error: 'Failed to get lit spots' }, { status: 500 });
  }
}
