import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import Stripe from 'stripe';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://lumina.viberyte.com';

// Pricing tiers with Stripe Price IDs
const TIERS: Record<string, { name: string; priceId: string; priceFormatted: string }> = {
  spotlight: {
    name: 'Lumina Spotlight',
    priceId: process.env.STRIPE_PRICE_SPOTLIGHT || '',
    priceFormatted: '$25/mo',
  },
  elite: {
    name: 'Lumina Elite',
    priceId: process.env.STRIPE_PRICE_ELITE || '',
    priceFormatted: '$44.99/mo',
  },
};

// GET: Return pricing info
export async function GET() {
  return NextResponse.json({
    tiers: {
      spotlight: {
        name: TIERS.spotlight.name,
        priceFormatted: TIERS.spotlight.priceFormatted,
      },
      elite: {
        name: TIERS.elite.name,
        priceFormatted: TIERS.elite.priceFormatted,
      },
    },
  });
}

// POST: Create Stripe checkout session
export async function POST(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;

  if (!userToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let db: Database.Database | null = null;

  try {
    const body = await request.json();
    const { targetTier } = body;

    if (!targetTier || !TIERS[targetTier]) {
      return NextResponse.json({ error: 'Invalid tier. Use "spotlight" or "elite"' }, { status: 400 });
    }

    const tierConfig = TIERS[targetTier];

    if (!tierConfig.priceId) {
      return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
    }

    db = new Database(DB_PATH);

    // Get partner info
    const user = db.prepare(`
      SELECT 
        u.id as user_id,
        u.email,
        u.partner_id,
        p.id as p_id,
        p.tier,
        p.business_name,
        p.stripe_customer_id
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      LEFT JOIN partners p ON u.partner_id = p.id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(userToken) as any;

    if (!user || !user.partner_id) {
      db.close();
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    // Check if already on this tier or higher
    const tierLevel: Record<string, number> = { claimed: 1, spotlight: 2, elite: 3 };
    const currentLevel = tierLevel[user.tier] || 1;
    const targetLevel = tierLevel[targetTier];

    if (currentLevel >= targetLevel) {
      db.close();
      return NextResponse.json({ 
        error: 'Already on this tier or higher',
        currentTier: user.tier 
      }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          partner_id: user.p_id.toString(),
          business_name: user.business_name || '',
        },
      });
      customerId = customer.id;

      // Save customer ID
      db.prepare(`
        UPDATE partners SET stripe_customer_id = ? WHERE id = ?
      `).run(customerId, user.p_id);
    }

    db.close();
    db = null;

    // Create Stripe checkout session with Price ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        partner_id: user.p_id.toString(),
        target_tier: targetTier,
      },
      success_url: `${BASE_URL}/partner/settings?upgrade=success&tier=${targetTier}`,
      cancel_url: `${BASE_URL}/partner/settings?upgrade=cancelled`,
    });

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  } finally {
    if (db) db.close();
  }
}
