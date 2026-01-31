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

    // Get promoters linked to this venue
    const promoters = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.instagram_handle,
        p.avatar_url,
        p.bio,
        p.specialty,
        p.verified,
        vp.role,
        vp.created_at as linked_at
      FROM venue_promoters vp
      JOIN promoters p ON p.id = vp.promoter_id
      WHERE vp.venue_id = ?
      ORDER BY 
        CASE vp.role 
          WHEN 'owner' THEN 1 
          WHEN 'resident' THEN 2 
          WHEN 'guest' THEN 3 
          ELSE 4 
        END,
        p.name ASC
    `).all(venueId);

    db.close();

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      count: promoters.length,
      promoters: promoters
    });

  } catch (error) {
    console.error('Error fetching venue promoters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue promoters' },
      { status: 500 }
    );
  }
}

// Link a promoter to a venue
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const body = await request.json();
    const { promoter_id, role = 'guest' } = body;
    
    if (isNaN(venueId) || !promoter_id) {
      return NextResponse.json(
        { error: 'Invalid venue ID or promoter ID' },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH);

    // Check if link already exists
    const existing = db.prepare(`
      SELECT * FROM venue_promoters 
      WHERE venue_id = ? AND promoter_id = ?
    `).get(venueId, promoter_id);

    if (existing) {
      // Update role if different
      db.prepare(`
        UPDATE venue_promoters 
        SET role = ? 
        WHERE venue_id = ? AND promoter_id = ?
      `).run(role, venueId, promoter_id);
    } else {
      // Create new link
      db.prepare(`
        INSERT INTO venue_promoters (venue_id, promoter_id, role)
        VALUES (?, ?, ?)
      `).run(venueId, promoter_id, role);
    }

    db.close();

    return NextResponse.json({
      success: true,
      message: existing ? 'Promoter link updated' : 'Promoter linked to venue',
      venue_id: venueId,
      promoter_id: promoter_id,
      role: role
    });

  } catch (error) {
    console.error('Error linking promoter to venue:', error);
    return NextResponse.json(
      { error: 'Failed to link promoter' },
      { status: 500 }
    );
  }
}

// Remove a promoter from a venue
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const promoterId = searchParams.get('promoter_id');
    
    if (isNaN(venueId) || !promoterId) {
      return NextResponse.json(
        { error: 'Invalid venue ID or promoter ID' },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH);

    db.prepare(`
      DELETE FROM venue_promoters 
      WHERE venue_id = ? AND promoter_id = ?
    `).run(venueId, parseInt(promoterId));

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Promoter unlinked from venue'
    });

  } catch (error) {
    console.error('Error unlinking promoter:', error);
    return NextResponse.json(
      { error: 'Failed to unlink promoter' },
      { status: 500 }
    );
  }
}
