import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// GET - Fetch partner's claimed venue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }

    // Get venue claimed by this partner
    const venue = db.prepare(`
      SELECT 
        id, name, description, address, city, state, zip_code,
        phone, website, instagram_handle, 
        category, subcategory, experience_type,
        cuisine_types, music_genres, price_tier, vibe_tags,
        special_features, happy_hour_info, dress_code,
        ideal_for, best_time, reservation_required,
        latitude, longitude, rating, google_place_id,
        google_photos, partner_id, claim_status, claimed_at
      FROM venues 
      WHERE partner_id = ?
      LIMIT 1
    `).get(partnerId) as any;

    if (!venue) {
      return NextResponse.json({ venue: null, message: 'No claimed venue found' });
    }

    // Parse JSON fields
    if (venue.google_photos) {
      try { venue.google_photos = JSON.parse(venue.google_photos); } catch (e) { }
    }

    return NextResponse.json({ venue });

  } catch (error: any) {
    console.error('Get venue error:', error);
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}
