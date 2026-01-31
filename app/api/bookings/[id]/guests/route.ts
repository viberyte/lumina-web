import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const booking = db.prepare(`
      SELECT b.*, v.name as venue_name FROM bookings b
      JOIN venues v ON b.venue_id = v.id WHERE b.id = ?
    `).get(bookingId) as any;

    if (!booking) {
      db.close();
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const guests = db.prepare(`SELECT * FROM guest_list_entries WHERE booking_id = ? ORDER BY created_at ASC`).all(bookingId) as any[];
    const checkedIn = guests.filter((g: any) => g.checked_in).length;

    db.close();

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      venue_name: booking.venue_name,
      party_size: booking.party_size,
      total_guests: guests.length,
      checked_in: checkedIn,
      remaining: guests.length - checkedIn,
      guests
    });

  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);
    const body = await request.json();
    const { guests } = body;

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: 'Guests array required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      db.close();
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const existingCount = db.prepare('SELECT COUNT(*) as count FROM guest_list_entries WHERE booking_id = ?').get(bookingId) as any;

    if (existingCount.count + guests.length > booking.party_size) {
      db.close();
      return NextResponse.json({ 
        error: `Cannot add ${guests.length} guests. Party size is ${booking.party_size}, already have ${existingCount.count} guests.` 
      }, { status: 400 });
    }

    const insertStmt = db.prepare(`INSERT INTO guest_list_entries (booking_id, guest_name, guest_email, guest_phone) VALUES (?, ?, ?, ?)`);

    const addedGuests: any[] = [];
    for (const guest of guests) {
      if (!guest.guest_name) continue;
      const result = insertStmt.run(bookingId, guest.guest_name, guest.guest_email || null, guest.guest_phone || null);
      addedGuests.push({ id: result.lastInsertRowid, ...guest });
    }

    db.close();

    return NextResponse.json({ success: true, booking_id: bookingId, guests_added: addedGuests.length, guests: addedGuests });

  } catch (error) {
    console.error('Error adding guests:', error);
    return NextResponse.json({ error: 'Failed to add guests' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);
    const body = await request.json();
    const { guest_id, action } = body;

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    if (!guest_id) {
      return NextResponse.json({ error: 'guest_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const guest = db.prepare(`SELECT * FROM guest_list_entries WHERE id = ? AND booking_id = ?`).get(guest_id, bookingId) as any;
    if (!guest) {
      db.close();
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const isCheckIn = action !== 'check_out';

    db.prepare(`UPDATE guest_list_entries SET checked_in = ?, checked_in_at = ? WHERE id = ?`).run(
      isCheckIn ? 1 : 0, isCheckIn ? new Date().toISOString() : null, guest_id
    );

    db.close();

    return NextResponse.json({ success: true, guest_id, guest_name: guest.guest_name, checked_in: isCheckIn });

  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    if (!guestId) {
      return NextResponse.json({ error: 'guest_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const guest = db.prepare(`SELECT * FROM guest_list_entries WHERE id = ? AND booking_id = ?`).get(guestId, bookingId) as any;
    if (!guest) {
      db.close();
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM guest_list_entries WHERE id = ?').run(guestId);
    db.close();

    return NextResponse.json({ success: true, deleted_guest_id: guestId, deleted_guest_name: guest.guest_name });

  } catch (error) {
    console.error('Error deleting guest:', error);
    return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 });
  }
}
