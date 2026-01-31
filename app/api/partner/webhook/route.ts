import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import Stripe from 'stripe';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any });
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  let db: Database.Database | null = null;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    db = new Database(DB_PATH);

    // Idempotency check - prevent duplicate processing
    const existing = db.prepare(
      `SELECT id FROM stripe_events WHERE id = ?`
    ).get(event.id);

    if (existing) {
      db.close();
      console.log(`⏭️ Skipping duplicate event: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event immediately
    db.prepare(
      `INSERT INTO stripe_events (id, event_type) VALUES (?, ?)`
    ).run(event.id, event.type);

    switch (event.type) {
      // Payment successful - upgrade tier
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const partnerId = session.metadata?.partner_id;
        const targetTier = session.metadata?.target_tier;
        const subscriptionId = session.subscription as string;

        if (partnerId && targetTier && subscriptionId) {
          // Just set tier and subscription ID here
          // Let customer.subscription.updated handle dates
          db.prepare(`
            UPDATE partners SET 
              tier = ?,
              stripe_subscription_id = ?,
              subscription_status = 'active',
              updated_at = datetime('now')
            WHERE id = ?
          `).run(targetTier, subscriptionId, partnerId);

          console.log(`✅ Partner ${partnerId} upgraded to ${targetTier}`);
        }
        break;
      }

      // Subscription renewed or updated - handle dates/status
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const partner = db.prepare(`
          SELECT id, tier FROM partners WHERE stripe_customer_id = ?
        `).get(customerId) as any;

        if (partner) {
          const periodEnd = new Date(subscription.current_period_end * 1000);
          const status = subscription.status;

          db.prepare(`
            UPDATE partners SET
              subscription_status = ?,
              subscription_ends_at = ?,
              cancel_at_period_end = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(status, periodEnd.toISOString(), subscription.cancel_at_period_end ? 1 : 0, partner.id);

          console.log(`✅ Partner ${partner.id} subscription updated: ${status}, ends: ${periodEnd.toISOString()}`);
        }
        break;
      }

      // Subscription cancelled or expired - downgrade
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const partner = db.prepare(`
          SELECT id FROM partners WHERE stripe_customer_id = ?
        `).get(customerId) as any;

        if (partner) {
          db.prepare(`
            UPDATE partners SET
              tier = 'claimed',
              subscription_status = 'cancelled',
              stripe_subscription_id = NULL,
              cancel_at_period_end = 0,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(partner.id);

          console.log(`✅ Partner ${partner.id} downgraded to claimed`);
        }
        break;
      }

      // Payment failed - mark past due
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const partner = db.prepare(`
          SELECT id FROM partners WHERE stripe_customer_id = ?
        `).get(customerId) as any;

        if (partner) {
          db.prepare(`
            UPDATE partners SET
              subscription_status = 'past_due',
              updated_at = datetime('now')
            WHERE id = ?
          `).run(partner.id);

          console.log(`⚠️ Partner ${partner.id} payment failed - past_due`);
        }
        break;
      }
    }

    db.close();
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    if (db) db.close();
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
