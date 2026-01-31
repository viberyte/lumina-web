import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = params.code;

    const booking = db.prepare(`
      SELECT 
        b.id, b.invite_code, b.host_name, b.table_type, b.booking_date, b.booking_time,
        b.total_amount, b.funded_amount, b.guest_count, b.status, b.expires_at,
        v.name as venue_name, v.address as venue_address,
        v.payment_venmo, v.payment_zelle, v.payment_cashapp, v.accept_cash, v.stripe_connected,
        e.title as event_name
      FROM partner_bookings b
      JOIN partner_venues v ON b.venue_id = v.id
      LEFT JOIN partner_events e ON b.event_id = e.id
      WHERE b.invite_code = ?
    `).get(code) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      booking.status = 'expired';
    }

    booking.guests = db.prepare(`
      SELECT id, name, amount, paid, paid_at, is_host, payment_method, verified
      FROM booking_guests WHERE booking_id = ?
      ORDER BY is_host DESC, id ASC
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

    booking.paymentMethods = {
      venmo: booking.payment_venmo || null,
      zelle: booking.payment_zelle || null,
      cashapp: booking.payment_cashapp || null,
      cash: booking.accept_cash === 1,
      card: booking.stripe_connected === 1,
    };

    delete booking.payment_venmo;
    delete booking.payment_zelle;
    delete booking.payment_cashapp;
    delete booking.accept_cash;
    delete booking.stripe_connected;

    return NextResponse.json({ booking });
  } catch (error: any) {
    console.error('Get booking error:', error);
    return NextResponse.json({ error: 'Failed to get booking' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = params.code;
    const body = await request.json();
    const { guestId, paymentMethod } = body;

    const booking = db.prepare(`
      SELECT id, total_amount, funded_amount FROM partner_bookings WHERE invite_code = ?
    `).get(code) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const guest = db.prepare(`
      SELECT id, amount, paid FROM booking_guests WHERE id = ? AND booking_id = ?
    `).get(guestId, booking.id) as any;

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    if (guest.paid) {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }

    // Determine if auto-verified (Stripe) or pending verification (P2P)
    const isStripe = paymentMethod === 'card' || paymentMethod === 'stripe';
    const verified = isStripe ? 1 : 0;

    db.prepare(`
      UPDATE booking_guests 
      SET paid = 1, paid_at = datetime('now'), payment_method = ?, verified = ?
      WHERE id = ?
    `).run(paymentMethod || 'unknown', verified, guestId);

    const newFundedAmount = booking.funded_amount + guest.amount;
    
    // Calculate status based on verified payments only
    const verifiedTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM booking_guests 
      WHERE booking_id = ? AND paid = 1 AND verified = 1
    `).get(booking.id) as any;

    let newStatus = 'pending';
    if (verifiedTotal.total >= booking.total_amount) {
      newStatus = 'funded';
    } else if (newFundedAmount >= booking.total_amount * 0.5) {
      newStatus = 'soft_commit';
    }

    db.prepare(`
      UPDATE partner_bookings 
      SET funded_amount = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newFundedAmount, newStatus, booking.id);

    db.prepare(`
      INSERT INTO booking_payments (booking_id, guest_id, amount, payment_method, status, verified)
      VALUES (?, ?, ?, ?, 'completed', ?)
    `).run(booking.id, guestId, guest.amount, paymentMethod || 'unknown', verified);

    return NextResponse.json({ 
      success: true,
      fundedAmount: newFundedAmount,
      status: newStatus,
      verified: isStripe,
      message: isStripe ? 'Payment confirmed!' : 'Payment submitted - pending venue verification'
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}
