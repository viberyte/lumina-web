import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import Stripe from 'stripe';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;
        const paymentType = paymentIntent.metadata.payment_type;

        if (bookingId) {
          db.prepare(`
            UPDATE payment_transactions SET status = 'succeeded', stripe_charge_id = ?
            WHERE stripe_payment_intent_id = ?
          `).run(paymentIntent.latest_charge, paymentIntent.id);

          if (paymentType === 'deposit') {
            db.prepare(`
              UPDATE bookings SET deposit_paid = 1, deposit_amount = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(paymentIntent.amount / 100, bookingId);
          } else {
            db.prepare(`UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(bookingId);
          }
          console.log(`✅ Payment succeeded for booking ${bookingId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;
        if (bookingId) {
          db.prepare(`UPDATE payment_transactions SET status = 'failed' WHERE stripe_payment_intent_id = ?`).run(paymentIntent.id);
          console.log(`❌ Payment failed for booking ${bookingId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          const refundAmount = charge.amount_refunded / 100;
          db.prepare(`
            UPDATE payment_transactions SET status = CASE WHEN ? >= amount THEN 'refunded' ELSE 'partially_refunded' END, refund_amount = ?
            WHERE stripe_payment_intent_id = ?
          `).run(refundAmount, refundAmount, paymentIntentId);

          const transaction = db.prepare(`SELECT booking_id, amount FROM payment_transactions WHERE stripe_payment_intent_id = ?`).get(paymentIntentId) as any;
          if (transaction && refundAmount >= transaction.amount) {
            db.prepare(`
              UPDATE bookings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = 'Refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(transaction.booking_id);
          }
          console.log(`💰 Refund: $${refundAmount}`);
        }
        break;
      }
    }

    db.close();
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
