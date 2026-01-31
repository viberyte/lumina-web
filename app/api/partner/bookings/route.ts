import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { checkPartnerTier } from '@/lib/tierCheck';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  // Allow all partner tiers to see their bookings
  const tierCheck = checkPartnerTier(userToken, 'starter');
  if (!tierCheck.authorized) {
    return NextResponse.json(
      { error: tierCheck.error },
      { status: 403 }
    );
  }

  try {
    const db = new Database(DB_PATH);

    const bookings = db.prepare(`
      SELECT 
        b.id,
        b.user_id,
        b.event_id,
        b.venue_id,
        b.partner_id,
        b.party_size,
        b.status,
        b.total_amount,
        b.section_name_snapshot,
        b.section_min_spend_snapshot,
        b.payment_method,
        b.special_requests,
        b.confirmation_code,
        b.created_at,
        b.approved_at,
        b.paid_at,
        pe.title as event_title,
        pe.event_date,
        pe.event_time,
        pv.name as venue_name,
        u.name as customer_name,
        u.email as customer_email,
        u.instagram_handle as customer_instagram,
        u.phone as customer_phone,
        u.name as host_name,
        pe.event_date as booking_date,
        pe.event_time as booking_time,
        b.party_size as guest_count,
        0 as funded_amount
      FROM bookings b
      LEFT JOIN partner_events pe ON b.event_id = pe.id
      LEFT JOIN partner_venues pv ON b.venue_id = pv.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.partner_id = ?
      ORDER BY b.created_at DESC
      LIMIT 100
    `).all(tierCheck.partner.p_id);

    db.close();

    return NextResponse.json({ 
      success: true,
      bookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Bookings error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update booking status (approve/decline/mark paid)
export async function PATCH(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  const tierCheck = checkPartnerTier(userToken, 'starter');
  if (!tierCheck.authorized) {
    return NextResponse.json({ error: tierCheck.error }, { status: 403 });
  }

  try {
    const db = new Database(DB_PATH);
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'bookingId and status required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'declined', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify booking belongs to this partner
    const booking = db.prepare(`
      SELECT id, partner_id, status FROM bookings WHERE id = ?
    `).get(bookingId) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.partner_id !== tierCheck.partner.p_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update status with timestamp
    let updateQuery = 'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [status];

    if (status === 'approved') {
      updateQuery += ', approved_at = CURRENT_TIMESTAMP';
    } else if (status === 'paid') {
      updateQuery += ', paid_at = CURRENT_TIMESTAMP';
    }

    updateQuery += ' WHERE id = ?';
    params.push(bookingId);

    db.prepare(updateQuery).run(...params);
    db.close();

    return NextResponse.json({ 
      success: true, 
      message: `Booking ${status}`,
      bookingId,
      status
    });

  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
