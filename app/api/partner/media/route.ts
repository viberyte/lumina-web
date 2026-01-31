import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const UPLOAD_DIR = '/mnt/volume/lumina/media/partner';

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

// GET: List partner's media
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
      return NextResponse.json({ media: [] });
    }

    const media = db.prepare(`
      SELECT 
        id,
        url,
        type,
        is_primary,
        uploaded_at
      FROM partner_media
      WHERE venue_id = ?
      ORDER BY is_primary DESC, uploaded_at DESC
    `).all(partner.venue_id);

    db.close();

    return NextResponse.json({
      media,
      count: media.length,
    });

  } catch (error) {
    console.error('Partner media GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
