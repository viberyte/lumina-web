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
    const { guest_id, booking_id, method = 'manual' } = body;
    
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Get the booking and verify venue access
    const booking = await db.get(
      `SELECT * FROM bookings WHERE id = ?`,
      [booking_id]
    );
    
    if (!booking) {
      await db.close();
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    if (!partner.venueIds.includes(booking.venue_id)) {
      await db.close();
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const now = new Date().toISOString();
    let alreadyCheckedIn = false;
    
    // Use transaction for consistency
    await db.exec('BEGIN');
    
    try {
      // Check if we have a booking_guests table and guest_id
      if (guest_id) {
        const hasGuestTable = await db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='booking_guests'`
        );
        
        if (hasGuestTable) {
          // Idempotent: only update if not already checked in
          const guestResult = await db.run(
            `UPDATE booking_guests 
             SET checked_in = 1, 
                 checked_in_at = COALESCE(checked_in_at, ?)
             WHERE id = ? AND (checked_in = 0 OR checked_in IS NULL)`,
            [now, guest_id]
          );
          
          if (guestResult.changes === 0) {
            // Check if already checked in vs not found
            const guest = await db.get(`SELECT checked_in FROM booking_guests WHERE id = ?`, [guest_id]);
            if (guest?.checked_in) {
              alreadyCheckedIn = true;
            }
          }
        }
      }
      
      // Mark booking as arrived (first guest = party arrived)
      // Idempotent: only update if not already checked in
      const bookingResult = await db.run(
        `UPDATE bookings 
         SET checked_in = 1, 
             checked_in_at = COALESCE(checked_in_at, ?)
         WHERE id = ? AND (checked_in = 0 OR checked_in IS NULL)`,
        [now, booking_id]
      );
      
      if (bookingResult.changes === 0 && !guest_id) {
        // Booking was already checked in (and no guest_id provided)
        alreadyCheckedIn = true;
      }
      
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    
    await db.close();
    
    // Return success even if already checked in (idempotent)
    return NextResponse.json({ 
      success: true, 
      checked_in_at: alreadyCheckedIn ? booking.checked_in_at : now,
      already_checked_in: alreadyCheckedIn,
      booking_id,
      guest_id,
      method
    });
    
  } catch (error) {
    console.error('Door checkin error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
