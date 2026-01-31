import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function getPartnerId(request: NextRequest): number | null {
  const token = request.cookies.get('partner_token')?.value;
  if (!token) return null;
  
  const session = db.prepare(`
    SELECT partner_id FROM partner_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  
  return session?.partner_id || null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partnerId = getPartnerId(request);
    if (!partnerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bookingId = params.id;

    const booking = db.prepare(`
      SELECT b.*, v.name as venue_name, v.address as venue_address
      FROM partner_bookings b
      JOIN partner_venues v ON b.venue_id = v.id
      WHERE b.id = ? AND v.partner_id = ?
    `).get(bookingId, partnerId) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    booking.guests = db.prepare(`
      SELECT id, name, phone, email, amount, paid, paid_at, payment_method, is_host, verified, verified_at
      FROM booking_guests WHERE booking_id = ?
      ORDER BY is_host DESC, id ASC
    `).all(booking.id);

    booking.payments = db.prepare(`
      SELECT id, guest_id, amount, payment_method, status, verified, created_at
      FROM booking_payments WHERE booking_id = ?
      ORDER BY created_at DESC
    `).all(booking.id);

    // Calculate verified vs pending amounts
    const verifiedAmount = booking.guests
      .filter((g: any) => g.paid && g.verified)
      .reduce((sum: number, g: any) => sum + g.amount, 0);
    
    const pendingAmount = booking.guests
      .filter((g: any) => g.paid && !g.verified)
      .reduce((sum: number, g: any) => sum + g.amount, 0);

    booking.verifiedAmount = verifiedAmount;
    booking.pendingAmount = pendingAmount;

    // Count guests
    const paidCount = booking.guests.filter((g: any) => g.paid).length;
    const verifiedCount = booking.guests.filter((g: any) => g.paid && g.verified).length;
    const pendingCount = booking.guests.filter((g: any) => g.paid && !g.verified).length;
    const totalGuests = booking.guests.length;

    booking.guestStats = {
      total: totalGuests,
      paid: paidCount,
      verified: verifiedCount,
      pending: pendingCount,
      unpaid: totalGuests - paidCount,
    };

    // Confidence based on VERIFIED payments
    const verifiedPercent = booking.total_amount > 0 ? (verifiedAmount / booking.total_amount) * 100 : 0;
    
    if (verifiedPercent >= 100) {
      booking.confidence = 'high';
    } else if (verifiedPercent >= 70) {
      booking.confidence = 'high';
    } else if (verifiedPercent >= 40 || (verifiedAmount + pendingAmount) >= booking.total_amount * 0.7) {
      booking.confidence = 'medium';
    } else {
      booking.confidence = 'low';
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    console.error('Get booking error:', error);
    return NextResponse.json({ error: 'Failed to get booking' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partnerId = getPartnerId(request);
    if (!partnerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await request.json();
    const { status, notes } = body;

    const booking = db.prepare(`
      SELECT b.id FROM partner_bookings b
      JOIN partner_venues v ON b.venue_id = v.id
      WHERE b.id = ? AND v.partner_id = ?
    `).get(bookingId, partnerId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

    updates.push('updated_at = datetime("now")');

    if (updates.length > 0) {
      values.push(bookingId);
      db.prepare(`UPDATE partner_bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partnerId = getPartnerId(request);
    if (!partnerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bookingId = params.id;

    const booking = db.prepare(`
      SELECT b.id FROM partner_bookings b
      JOIN partner_venues v ON b.venue_id = v.id
      WHERE b.id = ? AND v.partner_id = ?
    `).get(bookingId, partnerId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    db.prepare(`UPDATE partner_bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(bookingId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
