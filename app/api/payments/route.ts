import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import Stripe from 'stripe';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, payment_type } = body;

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const booking = db.prepare(`
      SELECT b.*, v.name as venue_name, v.stripe_connect_id
      FROM bookings b
      JOIN venues v ON b.venue_id = v.id
      WHERE b.id = ?
    `).get(booking_id) as any;

    if (!booking) {
      db.close();
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      db.close();
      return NextResponse.json({ error: 'Cannot pay for cancelled booking' }, { status: 400 });
    }

    let amountToCharge = booking.total_amount;
    let actualPaymentType = payment_type || 'full_payment';

    if (payment_type === 'deposit') {
      const availability = db.prepare(`
        SELECT deposit_percentage FROM venue_availability WHERE venue_id = ? LIMIT 1
      `).get(booking.venue_id) as any;
      const depositPercentage = availability?.deposit_percentage || 20;
      amountToCharge = booking.total_amount * (depositPercentage / 100);
    }

    const amountInCents = Math.round(amountToCharge * 100);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        booking_id: booking_id.toString(),
        venue_id: booking.venue_id.toString(),
        venue_name: booking.venue_name,
        booking_type: booking.booking_type,
        payment_type: actualPaymentType
      },
      description: `Lumina Booking: ${booking.venue_name} - ${booking.booking_date}`
    };

    if (booking.stripe_connect_id) {
      const platformFeeInCents = Math.round(booking.platform_fee * 100);
      paymentIntentParams.transfer_data = { destination: booking.stripe_connect_id };
      paymentIntentParams.application_fee_amount = platformFeeInCents;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    db.prepare(`UPDATE bookings SET stripe_payment_intent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(paymentIntent.id, booking_id);

    db.prepare(`
      INSERT INTO payment_transactions (booking_id, stripe_payment_intent_id, amount, currency, status, payment_type)
      VALUES (?, ?, ?, 'usd', 'pending', ?)
    `).run(booking_id, paymentIntent.id, amountToCharge, actualPaymentType);

    db.close();

    return NextResponse.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: amountToCharge,
        amount_cents: amountInCents,
        currency: 'usd',
        payment_type: actualPaymentType
      },
      booking: {
        id: booking_id,
        confirmation_code: booking.confirmation_code,
        venue_name: booking.venue_name,
        total_amount: booking.total_amount
      }
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
