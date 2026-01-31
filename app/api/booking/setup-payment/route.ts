export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';
import { getDb } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  
  try {
    const body = await req.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if customer already exists
    let customer = db.prepare(
      'SELECT stripe_customer_id FROM user_payment_methods WHERE user_id = ? LIMIT 1'
    ).get(userId) as any;

    let customerId: string;

    if (customer?.stripe_customer_id) {
      customerId = customer.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const newCustomer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId.toString()
        }
      });
      
      customerId = newCustomer.id;
    }

    // Create setup intent for adding payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Setup payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup payment' },
      { status: 500, headers: corsHeaders }
    );
  }
}
