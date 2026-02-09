import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function POST(request: NextRequest) {
  let db: Database.Database | null = null;
  
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    db = new Database(DB_PATH);

    // Find partner by claim token
    const partner = db.prepare(`
      SELECT 
        p.id,
        p.business_name,
        p.instagram_handle,
        p.profile_picture,
        p.is_claimed,
        p.is_demo,
        pv.city,
        (SELECT COUNT(*) FROM partner_events WHERE partner_id = p.id) as events_count
      FROM partners p
      LEFT JOIN partner_venues pv ON pv.partner_id = p.id AND pv.is_home = 1
      WHERE p.claim_token = ?
    `).get(token) as any;

    if (!partner) {
      db.close();
      return NextResponse.json({ 
        error: 'This claim link is invalid or has expired.' 
      }, { status: 404 });
    }

    if (partner.is_claimed) {
      db.close();
      return NextResponse.json({ 
        error: 'This page has already been claimed. If this is your venue, contact support.' 
      }, { status: 400 });
    }

    db.close();

    return NextResponse.json({
      valid: true,
      partnerId: partner.id,
      businessName: partner.business_name,
      instagram: partner.instagram_handle,
      photo: partner.profile_picture,
      city: partner.city,
      eventsCount: partner.events_count || 0,
      isDemo: partner.is_demo === 1,
    });

  } catch (error: any) {
    console.error('Claim validate error:', error);
    if (db) db.close();
    return NextResponse.json({ 
      error: 'Failed to validate claim link' 
    }, { status: 500 });
  }
}
