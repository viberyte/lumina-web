import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('partner_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/partner_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

function getPartnerId(token: string): number | null {
  const session = db.prepare(`
    SELECT partner_id FROM partner_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  return session?.partner_id || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const venueId = parseInt(params.id);

    const venue = db.prepare(`
      SELECT id, name, address, is_home, subscription_status, trial_ends_at
      FROM partner_venues 
      WHERE id = ? AND partner_id = ?
    `).get(venueId, partnerId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Get layout
    const layout = db.prepare(`
      SELECT sections FROM venue_layouts 
      WHERE venue_id = ? AND is_primary = 1
      ORDER BY updated_at DESC LIMIT 1
    `).get(venueId) as any;

    let sections = [];
    if (layout?.sections) {
      try {
        sections = JSON.parse(layout.sections);
      } catch (e) {}
    }

    return NextResponse.json({ venue, sections });
  } catch (error: any) {
    console.error('Venue fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const venueId = parseInt(params.id);

    // Verify ownership
    const venue = db.prepare(`
      SELECT id FROM partner_venues WHERE id = ? AND partner_id = ?
    `).get(venueId, partnerId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, sections } = body;

    if (!name) {
      return NextResponse.json({ error: 'Venue name required' }, { status: 400 });
    }

    // Update venue
    db.prepare(`
      UPDATE partner_venues 
      SET name = ?, address = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, address || null, venueId);

    // Update layout
    if (sections && Array.isArray(sections)) {
      const existing = db.prepare(`
        SELECT id FROM venue_layouts WHERE venue_id = ? AND is_primary = 1
      `).get(venueId) as any;

      if (existing) {
        db.prepare(`
          UPDATE venue_layouts 
          SET sections = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(JSON.stringify(sections), existing.id);
      } else {
        db.prepare(`
          INSERT INTO venue_layouts (venue_id, sections, is_primary)
          VALUES (?, ?, 1)
        `).run(venueId, JSON.stringify(sections));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Venue update error:', error);
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const venueId = parseInt(params.id);

    // Verify ownership
    const venue = db.prepare(`
      SELECT id, is_home FROM partner_venues WHERE id = ? AND partner_id = ?
    `).get(venueId, partnerId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Delete layout first
    db.prepare(`DELETE FROM venue_layouts WHERE venue_id = ?`).run(venueId);

    // Delete venue
    db.prepare(`DELETE FROM partner_venues WHERE id = ?`).run(venueId);

    // If was home, set another venue as home
    if (venue.is_home) {
      const another = db.prepare(`
        SELECT id FROM partner_venues WHERE partner_id = ? LIMIT 1
      `).get(partnerId) as any;

      if (another) {
        db.prepare(`UPDATE partner_venues SET is_home = 1 WHERE id = ?`).run(another.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Venue delete error:', error);
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
  }
}
