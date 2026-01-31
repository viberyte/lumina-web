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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    
    const bookingRequest = db.prepare(`
      SELECT r.*, tf.venue_id
      FROM tonights_floor_requests r
      JOIN tonights_floor tf ON r.floor_item_id = tf.id
      WHERE r.id = ? AND tf.venue_id = ?
    `).get(requestId, partner.venue_id);

    if (!bookingRequest) {
      db.close();
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Status guard
    if (bookingRequest.status !== 'pending') {
      db.close();
      return NextResponse.json(
        { error: `Cannot approve a ${bookingRequest.status} request` },
        { status: 400 }
      );
    }

    db.prepare(`
      UPDATE tonights_floor_requests
      SET status = 'approved'
      WHERE id = ?
    `).run(requestId);

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Request approved',
      request: { id: requestId, status: 'approved' },
    });

  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
