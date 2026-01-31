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
    `SELECT ps.*, p.id as partner_id
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
    `SELECT pv.venue_id as id FROM partner_venues pv WHERE pv.partner_id = ?`,
    [session.partner_id]
  );
  
  await db.close();
  return { ...session, venueIds: venues.map((v: any) => v.id) };
}

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { qr_data, venue_id } = body;
    
    if (!qr_data || !venue_id) {
      return NextResponse.json({ error: 'qr_data and venue_id required' }, { status: 400 });
    }
    
    if (!partner.venueIds.includes(parseInt(venue_id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const db = await getDb();
    
    // Parse QR data - supports multiple formats:
    // Format 1: LUMINA:BOOKING:123:GUEST:456
    // Format 2: LUMINA:BOOKING:123
    // Format 3: Just confirmation code (e.g., "ABC123")
    
    let bookingId: number | null = null;
    let guestId: number | null = null;
    let confirmationCode: string | null = null;
    
    if (qr_data.startsWith('LUMINA:')) {
      const parts = qr_data.split(':');
      if (parts[1] === 'BOOKING' && parts[2]) {
        bookingId = parseInt(parts[2]);
      }
      if (parts[3] === 'GUEST' && parts[4]) {
        guestId = parseInt(parts[4]);
      }
    } else {
      // Assume it's a confirmation code
      confirmationCode = qr_data.trim().toUpperCase();
    }
    
    // Find the booking
    let booking;
    const today = new Date().toISOString().split('T')[0];
    
    if (bookingId) {
      booking = await db.get(
        `SELECT b.*, COALESCE(u.name, b.guest_name, 'Guest') as guest_name
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         WHERE b.id = ? AND b.venue_id = ?`,
        [bookingId, venue_id]
      );
    } else if (confirmationCode) {
      booking = await db.get(
        `SELECT b.*, COALESCE(u.name, b.guest_name, 'Guest') as guest_name
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         WHERE b.confirmation_code = ? 
           AND b.venue_id = ?
           AND date(b.booking_date) = date(?)`,
        [confirmationCode, venue_id, today]
      );
    }
    
    if (!booking) {
      await db.close();
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found for this venue' 
      }, { status: 404 });
    }
    
    // Check if already checked in
    if (booking.checked_in) {
      await db.close();
      return NextResponse.json({ 
        success: true,
        already_checked_in: true,
        guest_name: booking.guest_name,
        party_size: booking.party_size,
        table_type: booking.table_type,
        checked_in_at: booking.checked_in_at
      });
    }
    
    const now = new Date().toISOString();
    
    // Use transaction
    await db.exec('BEGIN');
    
    try {
      // Check in guest if provided
      if (guestId) {
        const hasGuestTable = await db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='booking_guests'`
        );
        
        if (hasGuestTable) {
          await db.run(
            `UPDATE booking_guests 
             SET checked_in = 1, checked_in_at = COALESCE(checked_in_at, ?)
             WHERE id = ? AND (checked_in = 0 OR checked_in IS NULL)`,
            [now, guestId]
          );
        }
      }
      
      // Check in booking (idempotent)
      await db.run(
        `UPDATE bookings 
         SET checked_in = 1, checked_in_at = COALESCE(checked_in_at, ?)
         WHERE id = ? AND (checked_in = 0 OR checked_in IS NULL)`,
        [now, booking.id]
      );
      
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    
    await db.close();
    
    return NextResponse.json({ 
      success: true,
      guest_name: booking.guest_name,
      party_size: booking.party_size,
      table_type: booking.table_type,
      booking_time: booking.booking_time,
      checked_in_at: now
    });
    
  } catch (error) {
    console.error('Door scan error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
