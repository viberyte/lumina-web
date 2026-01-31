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

export async function POST(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;

  if (!userToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let db: Database.Database | null = null;

  try {
    db = new Database(DB_PATH);

    const user = db.prepare(`
      SELECT 
        u.partner_id,
        p.stripe_customer_id
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      LEFT JOIN partners p ON u.partner_id = p.id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(userToken) as any;

    db.close();
    db = null;

    if (!user || !user.partner_id) {
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${BASE_URL}/partner/settings`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  } finally {
    if (db) db.close();
  }
}
