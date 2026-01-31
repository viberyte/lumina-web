import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const booking = db.prepare(`
      SELECT 
        b.id,
        b.user_id,
        b.venue_id,
        b.event_id,
        b.booking_type,
        b.booking_date,
        b.booking_time,
        b.party_size,
        b.status,
        b.confirmation_code,
        b.total_amount,
        b.special_requests,
        b.created_at,
        b.updated_at,
        v.name as venue_name,
        v.address as venue_address,
        v.professional_photo_url as venue_photo,
        e.name as event_name
      FROM bookings b
      LEFT JOIN venues v ON b.venue_id = v.id
      LEFT JOIN events e ON b.event_id = e.id
      WHERE b.id = ?
    `).get(bookingId) as any;

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id);
    const body = await request.json();
    const { action, cancellation_reason } = body;

    if (isNaN(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    let newStatus = booking.status;

    switch (action) {
      case 'confirm':
        newStatus = 'confirmed';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        db.prepare(`
          UPDATE bookings 
          SET status = ?, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(newStatus, cancellation_reason || null, bookingId);
        return NextResponse.json({ success: true, booking_id: bookingId, new_status: newStatus });
      case 'complete':
        newStatus = 'completed';
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    db.prepare(`UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newStatus, bookingId);

    return NextResponse.json({ success: true, booking_id: bookingId, new_status: newStatus });

  } catch (error: any) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
