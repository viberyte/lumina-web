export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';
import { getDb } from '@/lib/db';
import { sendTicketEmail } from '@/lib/email';

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
    const { eventId, userId, userEmail } = body;

    // Validation
    if (!eventId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, userId, userEmail' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get event details
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as any;
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify event has required fields
    if (!event.title) {
      return NextResponse.json(
        { error: 'Event data incomplete' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's payment method and verify ownership
    const userPayment = db.prepare(`
      SELECT stripe_payment_method_id, stripe_customer_id 
      FROM user_payment_methods 
      WHERE user_id = ? AND is_default = 1
    `).get(userId) as any;

    if (!userPayment) {
      return NextResponse.json(
        { error: 'No payment method found. Please add a card first.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify payment method belongs to this customer (security check)
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        userPayment.stripe_payment_method_id
      );
      
      if (paymentMethod.customer !== userPayment.stripe_customer_id) {
        return NextResponse.json(
          { error: 'Payment method verification failed' },
          { status: 403, headers: corsHeaders }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400, headers: corsHeaders }
      );
    }

    const ticketPrice = event.ticket_price || 25;
    const luminaFee = 2;
    const totalAmount = ticketPrice + luminaFee;

    // Charge 1: Lumina concierge fee ($2)
    const luminaCharge = await stripe.paymentIntents.create({
      amount: luminaFee * 100,
      currency: 'usd',
      customer: userPayment.stripe_customer_id,
      payment_method: userPayment.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Lumina Concierge Fee - ${event.title}`,
      metadata: {
        eventId: eventId.toString(),
        userId: userId.toString(),
        type: 'lumina_fee'
      }
    });

    // Charge 2: Ticket purchase
    let ticketCharge;
    try {
      ticketCharge = await stripe.paymentIntents.create({
        amount: ticketPrice * 100,
        currency: 'usd',
        customer: userPayment.stripe_customer_id,
        payment_method: userPayment.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Ticket - ${event.title}`,
        metadata: {
          eventId: eventId.toString(),
          userId: userId.toString(),
          type: 'ticket_purchase'
        }
      });
    } catch (error: any) {
      // If ticket charge fails, refund the Lumina fee
      console.error('Ticket charge failed, refunding Lumina fee:', error);
      
      await stripe.refunds.create({
        payment_intent: luminaCharge.id,
      });
      
      return NextResponse.json(
        { error: 'Payment failed. No charges made to your card.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Record booking in database
    const bookingId = `LUM${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    db.prepare(`
      INSERT INTO bookings (
        booking_id, user_id, event_id, ticket_price, 
        lumina_fee, total_amount, stripe_payment_intent_id,
        stripe_lumina_payment_intent_id,
        status, user_email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      bookingId,
      userId,
      eventId,
      ticketPrice,
      luminaFee,
      totalAmount,
      ticketCharge.id,
      luminaCharge.id,
      'confirmed',
      userEmail
    );

    // Send confirmation email (non-blocking)
    sendTicketEmail(
      userEmail,
      event.title,
      event.venue_name || 'Venue',
      event.date || 'Date TBD',
      bookingId,
      ticketPrice,
      luminaFee
    ).catch(err => {
      console.error('Email send failed (non-critical):', err);
    });

    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Booking confirmed! Check your email for ticket details.',
      ticketPrice,
      luminaFee,
      totalAmount
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Booking failed. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
