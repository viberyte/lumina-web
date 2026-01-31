import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

function getPartnerFromSession(db: Database.Database): any {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('lumina_session');
  if (!sessionCookie?.value) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    if (!session.partner_id) return null;
    return db.prepare(`
      SELECT p.*, v.id as venue_id
      FROM partners p
      LEFT JOIN venues v ON v.claimed_by_partner_id = p.id
      WHERE p.id = ?
    `).get(session.partner_id);
  } catch (e) {
    return null;
  }
}

// GET: Get pending request count for badge
export async function GET(request: NextRequest) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!partner.venue_id) {
      db.close();
      return NextResponse.json({ count: 0 });
    }

    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM tonights_floor_requests r
      JOIN tonights_floor tf ON r.floor_item_id = tf.id
      WHERE tf.venue_id = ? AND r.status = 'pending'
    `).get(partner.venue_id);

    db.close();

    return NextResponse.json({
      count: result?.count || 0,
    });

  } catch (error) {
    console.error('Pending count error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
