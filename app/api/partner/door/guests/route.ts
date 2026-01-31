import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

async function verifyPartner(token: string) {
  const db = await getDb();
  
  const session = await db.get(
    `SELECT ps.*, p.id as partner_id, p.email 
     FROM partner_sessions ps
     JOIN partners p ON ps.partner_id = p.id
     WHERE ps.token = ? AND ps.expires_at > datetime('now')`,
    [token]
  );
  
  if (!session) {
    await db.close();
    return null;
  }
  
  const venues = await db.all(
    `SELECT pv.venue_id as id, pv.is_home, v.name 
     FROM partner_venues pv
     JOIN venues v ON pv.venue_id = v.id
     WHERE pv.partner_id = ?`,
    [session.partner_id]
  );
  
  await db.close();
  return { ...session, venues };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const partner = await verifyPartner(token);
    
    if (!partner) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venue_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!venueId) {
      return NextResponse.json({ error: 'venue_id required' }, { status: 400 });
    }
    
    const hasAccess = partner.venues.some((v: any) => v.id === parseInt(venueId));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const db = await getDb();
    
    // Check if booking_guests table exists (schema-based, not data-based)
    const hasGuestTable = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='booking_guests'`
    );
    
    let guests;
    
    if (hasGuestTable) {
      // Use booking_guests table
      guests = await db.all(`
        SELECT 
          bg.id,
          bg.booking_id,
          bg.guest_name,
          COALESCE(bg.checked_in, 0) as checked_in,
          bg.checked_in_at,
          b.confirmation_code,
          0 as plus_ones,
          b.booking_time,
          b.table_type,
          COALESCE(u.name, b.guest_name, 'Guest') as host_name
        FROM booking_guests bg
        JOIN bookings b ON bg.booking_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.venue_id = ?
          AND date(b.booking_date) = date(?)
          AND b.status IN ('confirmed', 'pending')
        ORDER BY b.booking_time ASC, bg.guest_name ASC
      `, [venueId, date]);
    }
    
    // Always also get bookings (primary guests) - fallback or supplement
    if (!hasGuestTable || guests?.length === 0) {
      guests = await db.all(`
        SELECT 
          b.id,
          b.id as booking_id,
          COALESCE(u.name, b.guest_name, 'Guest') as guest_name,
          COALESCE(b.checked_in, 0) as checked_in,
          b.checked_in_at,
          b.confirmation_code,
          CASE WHEN b.party_size > 1 THEN b.party_size - 1 ELSE 0 END as plus_ones,
          b.booking_time,
          b.table_type,
          COALESCE(u.name, b.guest_name, 'Guest') as host_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.venue_id = ?
          AND date(b.booking_date) = date(?)
          AND b.status IN ('confirmed', 'pending')
        ORDER BY b.booking_time ASC
      `, [venueId, date]);
    }
    
    await db.close();
    return NextResponse.json({ guests: guests || [], date });
    
  } catch (error) {
    console.error('Door guests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
