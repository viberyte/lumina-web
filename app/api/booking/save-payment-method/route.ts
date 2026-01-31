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
    const { userId, paymentMethodId, customerId } = body;

    if (!userId || !paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify payment method belongs to customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.customer !== customerId) {
      return NextResponse.json(
        { error: 'Payment method does not belong to this customer' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get card details
    const card = paymentMethod.card;

    // Check if user already has payment methods
    const existingMethods = db.prepare(
      'SELECT COUNT(*) as count FROM user_payment_methods WHERE user_id = ?'
    ).get(userId) as any;

    const isFirstCard = existingMethods.count === 0;

    // If first card, make it default
    if (isFirstCard) {
      db.prepare(`
        INSERT INTO user_payment_methods (
          user_id, stripe_customer_id, stripe_payment_method_id,
          card_brand, card_last4, card_exp_month, card_exp_year,
          is_default, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(
        userId,
        customerId,
        paymentMethodId,
        card?.brand || 'unknown',
        card?.last4 || '0000',
        card?.exp_month || 1,
        card?.exp_year || 2025
      );
    } else {
      // Add as non-default
      db.prepare(`
        INSERT INTO user_payment_methods (
          user_id, stripe_customer_id, stripe_payment_method_id,
          card_brand, card_last4, card_exp_month, card_exp_year,
          is_default, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
      `).run(
        userId,
        customerId,
        paymentMethodId,
        card?.brand || 'unknown',
        card?.last4 || '0000',
        card?.exp_month || 1,
        card?.exp_year || 2025
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method saved successfully',
      cardBrand: card?.brand,
      cardLast4: card?.last4
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Save payment method error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save payment method' },
      { status: 500, headers: corsHeaders }
    );
  }
}
