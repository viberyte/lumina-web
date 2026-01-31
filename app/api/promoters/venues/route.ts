import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// POST - Claim a venue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promoter_id, venue_id, role } = body;

    if (!promoter_id || !venue_id) {
      return NextResponse.json({ error: 'promoter_id and venue_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    // Verify promoter exists
    const promoter = db.prepare('SELECT id, name FROM promoters WHERE id = ?').get(promoter_id);
    if (!promoter) {
      db.close();
      return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
    }

    // Verify venue exists
    const venue = db.prepare('SELECT id, name FROM venues WHERE id = ?').get(venue_id) as any;
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Check if already claimed
    const existing = db.prepare('SELECT id FROM promoter_venues WHERE promoter_id = ? AND venue_id = ?').get(promoter_id, venue_id);
    if (existing) {
      db.close();
      return NextResponse.json({ error: 'Venue already claimed by this promoter' }, { status: 409 });
    }

    // Check if this is their first venue (make it primary)
    const venueCount = db.prepare('SELECT COUNT(*) as count FROM promoter_venues WHERE promoter_id = ?').get(promoter_id) as any;
    const isPrimary = venueCount.count === 0 ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO promoter_venues (promoter_id, venue_id, role, is_primary, approved)
      VALUES (?, ?, ?, ?, 0)
    `).run(promoter_id, venue_id, role || 'promoter', isPrimary);

    db.close();

    return NextResponse.json({
      success: true,
      claim: {
        id: result.lastInsertRowid,
        promoter_id,
        venue_id,
        venue_name: venue.name,
        role: role || 'promoter',
        is_primary: isPrimary,
        approved: false,
        message: 'Venue claim submitted for approval'
      }
    });

  } catch (error) {
    console.error('Error claiming venue:', error);
    return NextResponse.json({ error: 'Failed to claim venue' }, { status: 500 });
  }
}

// GET - List promoter's venues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoterId = searchParams.get('promoter_id');

    if (!promoterId) {
      return NextResponse.json({ error: 'promoter_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const venues = db.prepare(`
      SELECT 
        v.id, v.name, v.address, v.city, v.neighborhood,
        v.image_url, v.category, v.google_rating,
        pv.role, pv.is_primary, pv.approved, pv.created_at as claimed_at,
        (SELECT COUNT(*) FROM bookings WHERE venue_id = v.id AND status = 'confirmed') as total_bookings,
        (SELECT COUNT(*) FROM venue_layouts WHERE venue_id = v.id AND promoter_id = ?) as layouts_count
      FROM promoter_venues pv
      JOIN venues v ON pv.venue_id = v.id
      WHERE pv.promoter_id = ?
      ORDER BY pv.is_primary DESC, pv.created_at DESC
    `).all(promoterId, promoterId);

    db.close();

    return NextResponse.json({
      success: true,
      promoter_id: promoterId,
      total_venues: venues.length,
      venues
    });

  } catch (error) {
    console.error('Error fetching promoter venues:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

// DELETE - Remove venue claim
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoterId = searchParams.get('promoter_id');
    const venueId = searchParams.get('venue_id');

    if (!promoterId || !venueId) {
      return NextResponse.json({ error: 'promoter_id and venue_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const claim = db.prepare('SELECT id FROM promoter_venues WHERE promoter_id = ? AND venue_id = ?').get(promoterId, venueId);
    if (!claim) {
      db.close();
      return NextResponse.json({ error: 'Venue claim not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM promoter_venues WHERE promoter_id = ? AND venue_id = ?').run(promoterId, venueId);

    db.close();

    return NextResponse.json({ success: true, message: 'Venue claim removed' });

  } catch (error) {
    console.error('Error removing venue claim:', error);
    return NextResponse.json({ error: 'Failed to remove venue claim' }, { status: 500 });
  }
}
