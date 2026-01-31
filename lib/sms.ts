import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export interface SMSOptions {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SMSOptions): Promise<boolean> {
  try {
    // Format phone number (ensure +1 prefix for US)
    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = '1' + formattedNumber;
    }
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedNumber,
    });

    console.log(`SMS sent to ${formattedNumber}`);
    return true;
  } catch (error) {
    console.error('SMS failed:', error);
    return false;
  }
}

// ========================================
// BOOKING NOTIFICATION TEMPLATES
// ========================================

export async function notifyBookingCreated(
  hostPhone: string,
  venueName: string,
  bookingDate: string,
  inviteLink: string
): Promise<boolean> {
  const message = `🎉 Lumina: Your table at ${venueName} for ${bookingDate} is set up!\n\nShare this link with your crew:\n${inviteLink}\n\nThey can pay their share directly.`;
  return sendSMS({ to: hostPhone, message });
}

export async function notifyGuestInvited(
  guestPhone: string,
  hostName: string,
  venueName: string,
  bookingDate: string,
  amount: number,
  inviteLink: string
): Promise<boolean> {
  const message = `🍾 ${hostName} invited you to ${venueName} on ${bookingDate}!\n\nYour share: $${amount}\n\nPay here: ${inviteLink}`;
  return sendSMS({ to: guestPhone, message });
}

export async function notifyPaymentReceived(
  hostPhone: string,
  guestName: string,
  amount: number,
  fundedAmount: number,
  totalAmount: number
): Promise<boolean> {
  const remaining = totalAmount - fundedAmount;
  const message = remaining > 0
    ? `💰 ${guestName} just paid $${amount}!\n\nProgress: $${fundedAmount}/$${totalAmount}\nRemaining: $${remaining}`
    : `🎉 ${guestName} paid $${amount}!\n\nYou're FULLY FUNDED! Table confirmed.`;
  return sendSMS({ to: hostPhone, message });
}

export async function notifyFullyFunded(
  hostPhone: string,
  venueName: string,
  bookingDate: string,
  totalAmount: number
): Promise<boolean> {
  const message = `✅ Lumina: Your ${venueName} table for ${bookingDate} is CONFIRMED!\n\n$${totalAmount} collected. You're all set!`;
  return sendSMS({ to: hostPhone, message });
}

export async function notifyPaymentVerified(
  guestPhone: string,
  venueName: string,
  amount: number
): Promise<boolean> {
  const message = `✅ Your $${amount} payment for ${venueName} has been verified. You're on the list!`;
  return sendSMS({ to: guestPhone, message });
}
