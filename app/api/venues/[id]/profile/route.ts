import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    
    if (isNaN(venueId)) {
      return NextResponse.json(
        { error: 'Invalid venue ID' },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Get venue details with AI tags
    const venue = db.prepare(`
      SELECT 
        id,
        name,
        address,
        city,
        state,
        zip_code,
        neighborhood,
        latitude,
        longitude,
        phone,
        website,
        instagram_handle,
        instagram_location_id,
        google_place_id,
        yelp_id,
        category,
        subcategory,
        cuisine_primary,
        cuisine_style,
        primary_vibes,
        secondary_vibes,
        atmosphere_tags,
        energy_level,
        dress_code,
        acoustic_band,
        price_tier,
        known_for,
        rating,
        google_rating,
        yelp_rating,
        yelp_review_count,
        hours_json,
        image_url,
        professional_photo_url,
        google_photos,
        description,
        what_to_expect,
        best_time_to_visit,
        pro_tips,
        created_at,
        updated_at
      FROM venues 
      WHERE id = ?
    `).get(venueId);

    if (!venue) {
      db.close();
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    // Get crowd photo stats
    const photoStats = db.prepare(`
      SELECT 
        COUNT(*) as total_crowd_photos,
        AVG(like_count) as avg_likes,
        MAX(like_count) as max_likes,
        COUNT(DISTINCT posted_by_username) as unique_posters
      FROM crowd_photos 
      WHERE venue_id = ?
    `).get(venueId);

    // Get event stats
    const eventStats = db.prepare(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_date >= date('now') THEN 1 END) as upcoming_events
      FROM events 
      WHERE venue_id = ?
    `).get(venueId);

    db.close();

    // Parse JSON fields
    const parseJSON = (field: string | null) => {
      if (!field) return null;
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    };

    return NextResponse.json({
      success: true,
      venue: {
        ...venue,
        primary_vibes: parseJSON(venue.primary_vibes),
        secondary_vibes: parseJSON(venue.secondary_vibes),
        atmosphere_tags: parseJSON(venue.atmosphere_tags),
        hours: parseJSON(venue.hours_json)
      },
      stats: {
        crowd_photos: photoStats?.total_crowd_photos || 0,
        avg_likes: Math.round(photoStats?.avg_likes || 0),
        max_likes: photoStats?.max_likes || 0,
        unique_posters: photoStats?.unique_posters || 0,
        total_events: eventStats?.total_events || 0,
        upcoming_events: eventStats?.upcoming_events || 0
      }
    });

  } catch (error) {
    console.error('Error fetching venue profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue profile' },
      { status: 500 }
    );
  }
}
