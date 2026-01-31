import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

function getTokenFromRequest(request: NextRequest): string | null {
  let token = request.cookies.get('user_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  return token || null;
}

function getPartnerFromToken(db: Database.Database, token: string) {
  return db.prepare(`
    SELECT u.id as user_id, u.partner_id, p.id as p_id, p.tier
    FROM user_sessions us
    JOIN users u ON u.id = us.user_id
    LEFT JOIN partners p ON u.partner_id = p.id
    WHERE us.token = ? AND us.expires_at > datetime('now')
  `).get(token) as any;
}

function getPartnerVenueId(db: Database.Database, partnerId: number): number | null {
  const venue = db.prepare(`
    SELECT venue_id FROM partner_venues WHERE partner_id = ? ORDER BY is_home DESC LIMIT 1
  `).get(partnerId) as any;
  return venue?.venue_id || null;
}

// GET - List live drops for venue
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = new Database(DB_PATH);
    const user = getPartnerFromToken(db, token);
    if (!user?.partner_id) { db.close(); return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const venueId = getPartnerVenueId(db, user.partner_id);
    if (!venueId) { db.close(); return NextResponse.json({ error: 'No venue claimed' }, { status: 400 }); }

    const drops = db.prepare(`
      SELECT * FROM live_drops WHERE venue_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(venueId);

    // Get sections for each drop
    const dropsWithSections = drops.map((drop: any) => {
      const sections = db.prepare(`
        SELECT * FROM live_drop_sections WHERE live_drop_id = ? ORDER BY priority ASC
      `).all(drop.id);
      return { ...drop, sections };
    });

    db.close();
    return NextResponse.json({ drops: dropsWithSections });
  } catch (error) {
    console.error('Live drops GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new live drop (auto-expires previous)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = new Database(DB_PATH);
    const user = getPartnerFromToken(db, token);
    if (!user?.partner_id) { db.close(); return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const venueId = getPartnerVenueId(db, user.partner_id);
    if (!venueId) { db.close(); return NextResponse.json({ error: 'No venue claimed' }, { status: 400 }); }

    const body = await request.json();
    const { media_url, media_type, caption, sections } = body;

    if (!media_url) {
      db.close();
      return NextResponse.json({ error: 'Media URL required' }, { status: 400 });
    }

    // Transaction: expire old, create new
    const transaction = db.transaction(() => {
      // Expire any active drops for this venue
      db.prepare(`
        UPDATE live_drops SET is_active = 0, expires_at = datetime('now') WHERE venue_id = ? AND is_active = 1
      `).run(venueId);

      // Create new drop
      const result = db.prepare(`
        INSERT INTO live_drops (venue_id, media_url, media_type, caption, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
      `).run(venueId, media_url, media_type || 'photo', caption || null);

      const dropId = result.lastInsertRowid;

      // Insert sections
      if (sections && Array.isArray(sections)) {
        const insertSection = db.prepare(`
          INSERT INTO live_drop_sections (live_drop_id, name, price, bottles, quantity, priority)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        sections.forEach((s: any, i: number) => {
          insertSection.run(dropId, s.name, s.price, s.bottles || 2, s.quantity || 3, s.priority ?? i);
        });
      }

      return dropId;
    });

    const dropId = transaction();

    // Fetch the created drop
    const drop = db.prepare(`SELECT * FROM live_drops WHERE id = ?`).get(dropId);
    const dropSections = db.prepare(`SELECT * FROM live_drop_sections WHERE live_drop_id = ? ORDER BY priority`).all(dropId);

    db.close();

    return NextResponse.json({ 
      success: true, 
      drop: { ...drop, sections: dropSections } 
    });
  } catch (error) {
    console.error('Live drops POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
