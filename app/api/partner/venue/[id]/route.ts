import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// GET - Fetch specific venue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venue = db.prepare(`
      SELECT * FROM venues WHERE id = ?
    `).get(params.id) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Parse JSON fields
    ['google_photos', 'cuisine_types', 'music_genres', 'vibe_tags', 'special_features', 'ideal_for'].forEach(field => {
      if (venue[field]) {
        try { venue[field] = JSON.parse(venue[field]); } catch (e) { }
      }
    });

    return NextResponse.json({ venue });

  } catch (error: any) {
    console.error('Get venue error:', error);
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}

// PUT - Update venue (only by owner)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const venueId = params.id;

    // Verify ownership via cookie
    const userToken = request.cookies.get('user_token')?.value;
    if (!userToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and their partner_id
    const user = db.prepare(`
      SELECT u.partner_id 
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(userToken) as any;

    if (!user?.partner_id) {
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    // Verify this partner owns this venue
    const venue = db.prepare(`
      SELECT id, partner_id FROM venues WHERE id = ?
    `).get(venueId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    if (venue.partner_id !== user.partner_id) {
      return NextResponse.json({ error: 'You do not own this venue' }, { status: 403 });
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'description', 'address', 'city', 'state', 'zip_code',
      'phone', 'website', 'instagram_handle',
      'cuisine_types', 'music_genres', 'price_tier', 'vibe_tags',
      'special_features', 'happy_hour_info', 'dress_code',
      'ideal_for', 'best_time', 'reservation_required'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // Stringify arrays/objects
        const value = typeof body[field] === 'object' ? JSON.stringify(body[field]) : body[field];
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(venueId);

    db.prepare(`
      UPDATE venues SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    console.log(`Venue ${venueId} updated by partner ${user.partner_id}`);

    return NextResponse.json({ success: true, message: 'Venue updated' });

  } catch (error: any) {
    console.error('Update venue error:', error);
    return NextResponse.json({ error: 'Failed to update venue: ' + error.message }, { status: 500 });
  }
}
