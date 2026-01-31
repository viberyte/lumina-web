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

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const venues = db.prepare(`
      SELECT 
        v.id, v.name, v.address, v.is_home,
        (SELECT COUNT(*) FROM venue_layouts WHERE venue_id = v.id) as has_layout
      FROM partner_venues v
      WHERE v.partner_id = ?
      ORDER BY v.is_home DESC, v.name ASC
    `).all(partnerId) as any[];

    // Get section/table counts from layouts
    const venuesWithCounts = venues.map(venue => {
      const layout = db.prepare(`
        SELECT sections FROM venue_layouts 
        WHERE venue_id = ? AND is_primary = 1
        ORDER BY updated_at DESC LIMIT 1
      `).get(venue.id) as any;

      let sectionCount = 0;
      let tableCount = 0;

      if (layout?.sections) {
        try {
          const sections = JSON.parse(layout.sections);
          sectionCount = sections.length;
          tableCount = sections.reduce((sum: number, s: any) => sum + (s.tableCount || 0), 0);
        } catch (e) {}
      }

      return {
        ...venue,
        section_count: sectionCount,
        table_count: tableCount,
      };
    });

    return NextResponse.json({ venues: venuesWithCounts });
  } catch (error: any) {
    console.error('Venues fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, sections } = body;

    if (!name) {
      return NextResponse.json({ error: 'Venue name required' }, { status: 400 });
    }

    // Check if this is first venue (make it home)
    const existingCount = db.prepare(`
      SELECT COUNT(*) as count FROM partner_venues WHERE partner_id = ?
    `).get(partnerId) as any;

    const isHome = existingCount.count === 0 ? 1 : 0;

    // Create venue
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    const result = db.prepare(`
      INSERT INTO partner_venues (partner_id, name, address, is_home, subscription_status, trial_ends_at)
      VALUES (?, ?, ?, ?, 'trial', ?)
    `).run(partnerId, name, address || null, isHome, trialEnds.toISOString());

    const venueId = result.lastInsertRowid;

    // Save layout if sections provided
    if (sections && Array.isArray(sections) && sections.length > 0) {
      db.prepare(`
        INSERT INTO venue_layouts (venue_id, sections, is_primary)
        VALUES (?, ?, 1)
      `).run(venueId, JSON.stringify(sections));
    }

    return NextResponse.json({ 
      success: true, 
      venue: { id: venueId, name, address, is_home: isHome } 
    });
  } catch (error: any) {
    console.error('Venue create error:', error);
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
  }
}
