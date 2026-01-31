import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS venue_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    sections TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

    // Verify ownership
    const venue = db.prepare(`
      SELECT id FROM partner_venues WHERE id = ? AND partner_id = ?
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

    if (!layout) {
      return NextResponse.json({ sections: [] });
    }

    return NextResponse.json({
      sections: JSON.parse(layout.sections),
    });
  } catch (error: any) {
    console.error('Layout fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 });
  }
}

export async function POST(
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
    const { sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: 'Sections required' }, { status: 400 });
    }

    // Check if layout exists
    const existing = db.prepare(`
      SELECT id FROM venue_layouts WHERE venue_id = ? AND is_primary = 1
    `).get(venueId) as any;

    if (existing) {
      // Update
      db.prepare(`
        UPDATE venue_layouts 
        SET sections = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(sections), existing.id);
    } else {
      // Insert
      db.prepare(`
        INSERT INTO venue_layouts (venue_id, sections, is_primary)
        VALUES (?, ?, 1)
      `).run(venueId, JSON.stringify(sections));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Layout save error:', error);
    return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 });
  }
}
