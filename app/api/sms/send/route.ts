import { NextRequest, NextResponse } from 'next/server';
import {
  sendSMS,
  notifyBookingCreated,
  notifyGuestInvited,
  notifyPaymentReceived,
  notifyFullyFunded,
  notifyPaymentVerified,
} from '@/lib/sms';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let success = false;

    switch (type) {
      case 'booking_created':
        success = await notifyBookingCreated(
          data.hostPhone,
          data.venueName,
          data.bookingDate,
          data.inviteLink
        );
        break;

      case 'guest_invited':
        success = await notifyGuestInvited(
          data.guestPhone,
          data.hostName,
          data.venueName,
          data.bookingDate,
          data.amount,
          data.inviteLink
        );
        break;

      case 'payment_received':
        success = await notifyPaymentReceived(
          data.hostPhone,
          data.guestName,
          data.amount,
          data.fundedAmount,
          data.totalAmount
        );
        break;

      case 'fully_funded':
        success = await notifyFullyFunded(
          data.hostPhone,
          data.venueName,
          data.bookingDate,
          data.totalAmount
        );
        break;

      case 'payment_verified':
        success = await notifyPaymentVerified(
          data.guestPhone,
          data.venueName,
          data.amount
        );
        break;

      case 'custom':
        success = await sendSMS({
          to: data.to,
          message: data.message,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400, headers: corsHeaders }
        );
    }

    return NextResponse.json({ success }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
