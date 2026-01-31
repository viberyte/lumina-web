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

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = new Database(DB_PATH);
    const user = getPartnerFromToken(db, token);
    if (!user?.partner_id) { db.close(); return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const venueId = getPartnerVenueId(db, user.partner_id);
    if (!venueId) { db.close(); return NextResponse.json({ error: 'No venue claimed' }, { status: 400 }); }

    const items = db.prepare(`SELECT * FROM partner_floor_items WHERE venue_id = ? ORDER BY created_at DESC`).all(venueId);
    db.close();

    return NextResponse.json({ items, venueId });
  } catch (error) {
    console.error('Floor GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

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
    const { item_type, name, description, original_price, current_price, quantity_available } = body;

    const result = db.prepare(`
      INSERT INTO partner_floor_items (venue_id, item_type, name, description, original_price, current_price, quantity_available, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(venueId, item_type, name, description, original_price, current_price || original_price, quantity_available);

    const newItem = db.prepare(`SELECT * FROM partner_floor_items WHERE id = ?`).get(result.lastInsertRowid);
    db.close();

    return NextResponse.json({ item: newItem });
  } catch (error) {
    console.error('Floor POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
