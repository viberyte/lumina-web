import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import Stripe from 'stripe';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, amount, reason } = body;

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const booking = db.prepare(`
      SELECT b.*, pt.stripe_payment_intent_id, pt.amount as paid_amount, pt.status as payment_status
      FROM bookings b
      LEFT JOIN payment_transactions pt ON b.id = pt.booking_id AND pt.status = 'succeeded'
      WHERE b.id = ?
      ORDER BY pt.created_at DESC LIMIT 1
    `).get(booking_id) as any;

    if (!booking) {
      db.close();
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.stripe_payment_intent_id) {
      db.close();
      return NextResponse.json({ error: 'No payment found for this booking' }, { status: 400 });
    }

    if (booking.payment_status !== 'succeeded') {
      db.close();
      return NextResponse.json({ error: 'Payment was not successful, cannot refund' }, { status: 400 });
    }

    let refundAmount = amount || booking.paid_amount;
    if (refundAmount > booking.paid_amount) {
      refundAmount = booking.paid_amount;
    }

    const refundAmountCents = Math.round(refundAmount * 100);

    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer'
    });

    db.prepare(`
      INSERT INTO payment_transactions (booking_id, stripe_payment_intent_id, amount, currency, status, payment_type, refund_amount)
      VALUES (?, ?, ?, 'usd', 'refunded', 'refund', ?)
    `).run(booking_id, booking.stripe_payment_intent_id, refundAmount, refundAmount);

    const isFullRefund = refundAmount >= booking.paid_amount;

    db.prepare(`
      UPDATE payment_transactions SET status = ?, refund_amount = COALESCE(refund_amount, 0) + ?
      WHERE stripe_payment_intent_id = ? AND payment_type != 'refund'
    `).run(isFullRefund ? 'refunded' : 'partially_refunded', refundAmount, booking.stripe_payment_intent_id);

    if (isFullRefund) {
      db.prepare(`
        UPDATE bookings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason || 'Refunded', booking_id);
    }

    db.close();

    return NextResponse.json({
      success: true,
      refund: { id: refund.id, amount: refundAmount, status: refund.status, full_refund: isFullRefund },
      booking: { id: booking_id, new_status: isFullRefund ? 'cancelled' : booking.status }
    });

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: error.message || 'Failed to process refund' }, { status: 500 });
  }
}
