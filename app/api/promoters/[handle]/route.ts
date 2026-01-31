import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const handle = params.handle.toLowerCase();

    const promoter = db.prepare(`
      SELECT 
        id, instagram_handle, business_name, profile_picture,
        follower_count, primary_genre, secondary_genres, is_verified
      FROM partners 
      WHERE instagram_handle = ? AND status = 'approved'
    `).get(handle) as any;

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
    }

    const events = db.prepare(`
      SELECT 
        pe.id, pe.title, pe.event_date, pe.event_time, pe.genre, pe.image_url,
        pv.name as venue_name
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      WHERE pe.partner_id = ? AND pe.status = 'published'
      ORDER BY pe.event_date DESC
    `).all(promoter.id) as any[];

    return NextResponse.json({ promoter, events });
  } catch (error: any) {
    console.error('Promoter fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch promoter' }, { status: 500 });
  }
}
