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

// POST - Verify a guest's payment
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partnerId = getPartnerId(request);
    if (!partnerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await request.json();
    const { guestId } = body;

    // Verify booking belongs to partner
    const booking = db.prepare(`
      SELECT b.id, b.total_amount FROM partner_bookings b
      JOIN partner_venues v ON b.venue_id = v.id
      WHERE b.id = ? AND v.partner_id = ?
    `).get(bookingId, partnerId) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify guest exists and has paid
    const guest = db.prepare(`
      SELECT id, paid, verified, amount FROM booking_guests WHERE id = ? AND booking_id = ?
    `).get(guestId, bookingId) as any;

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    if (!guest.paid) {
      return NextResponse.json({ error: 'Guest has not paid yet' }, { status: 400 });
    }

    if (guest.verified) {
      return NextResponse.json({ error: 'Already verified' }, { status: 400 });
    }

    // Mark as verified
    db.prepare(`
      UPDATE booking_guests 
      SET verified = 1, verified_at = datetime('now'), verified_by = 'partner'
      WHERE id = ?
    `).run(guestId);

    // Update payment record
    db.prepare(`
      UPDATE booking_payments 
      SET verified = 1, verified_at = datetime('now')
      WHERE guest_id = ?
    `).run(guestId);

    // Calculate new verified total
    const verifiedTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM booking_guests 
      WHERE booking_id = ? AND paid = 1 AND verified = 1
    `).get(bookingId) as any;

    // Update booking status if fully verified
    let newStatus = 'soft_commit';
    if (verifiedTotal.total >= booking.total_amount) {
      newStatus = 'funded';
    }

    db.prepare(`
      UPDATE partner_bookings 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, bookingId);

    return NextResponse.json({ 
      success: true,
      verifiedTotal: verifiedTotal.total,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
