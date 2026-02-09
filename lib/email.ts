import { Resend } from 'resend';

// Lazy initialization to avoid build errors
let resend: Resend | null = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendTicketEmail(
  userEmail: string,
  eventName: string,
  venueName: string,
  eventDate: string,
  bookingId: string,
  ticketPrice: number,
  luminaFee: number
) {
  try {
    const client = getResend();
    
    if (!client) {
      console.warn('Resend API key not configured, skipping email');
      return false;
    }

    const { data, error } = await client.emails.send({
      from: 'Lumina <bookings@lumina.viberyte.com>',
      to: userEmail,
      subject: `🎉 Your ticket for ${eventName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
            .detail { margin: 10px 0; }
            .detail strong { color: #8B5CF6; }
            .qr-section { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hey! Your ticket is ready 🎉</p>
              
              <div class="ticket">
                <h2 style="margin-top: 0; color: #333;">${eventName}</h2>
                <div class="detail"><strong>Venue:</strong> ${venueName}</div>
                <div class="detail"><strong>Date:</strong> ${eventDate}</div>
                <div class="detail"><strong>Booking ID:</strong> ${bookingId}</div>
              </div>

              <div class="qr-section">
                <p><strong>Show this at the door:</strong></p>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #8B5CF6;">${bookingId}</div>
              </div>

              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Payment Summary</h3>
                <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                  <span>Event Ticket</span>
                  <span>$${ticketPrice.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                  <span>Lumina Concierge Fee</span>
                  <span>$${luminaFee.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 10px; border-top: 2px solid #eee; font-weight: bold;">
                  <span>Total Charged</span>
                  <span>$${(ticketPrice + luminaFee).toFixed(2)}</span>
                </div>
              </div>

              <p style="margin-top: 30px;">Need help? Reply to this email or visit our support page.</p>
              
              <div class="footer">
                <p>This is your official ticket confirmation from Lumina</p>
                <p>lumina.viberyte.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

export async function sendClaimConfirmation(to: string, data: { name: string; businessName: string; partnerId: number }) {
  try {
    const client = getResend();
    if (!client) { console.warn('Resend not configured, skipping claim email'); return false; }

    await client.emails.send({
      from: 'Lumina <hello@viberyte.com>',
      to,
      subject: 'Welcome to Lumina, ' + data.businessName + '!',
      html: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0f; padding: 40px 30px; border-radius: 16px;">' +
        '<div style="text-align: center; margin-bottom: 32px;"><div style="font-size: 14px; font-weight: 700; color: #a78bfa; letter-spacing: 2px;">LUMINA</div></div>' +
        '<h1 style="color: #ffffff; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 8px;">Page Claimed!</h1>' +
        '<p style="color: #9ca3af; font-size: 15px; text-align: center; margin-bottom: 32px;">' + data.businessName + ' is now live on Lumina.</p>' +
        '<div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">' +
          '<div style="color: #a78bfa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Your Login Info</div>' +
          '<div style="color: #e5e7eb; font-size: 14px; margin-bottom: 6px;"><strong>Email:</strong> ' + to + '</div>' +
          '<div style="color: #e5e7eb; font-size: 14px;"><strong>Password:</strong> The one you just set</div>' +
        '</div>' +
        '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">' +
          '<div style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">What You Can Do</div>' +
          '<div style="color: #d1d5db; font-size: 13px; line-height: 2;">' +
            '&#10003; Create and promote events<br>&#10003; Set up bottle service &amp; table bookings<br>&#10003; Manage guest lists<br>&#10003; Track analytics &amp; revenue<br>&#10003; Message customers directly' +
          '</div>' +
        '</div>' +
        '<div style="text-align: center; margin-bottom: 24px;">' +
          '<a href="https://apps.apple.com/app/lumina-nightlife/id6739197728" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none;">Download Lumina App</a>' +
        '</div>' +
        '<div style="text-align: center; margin-bottom: 16px;">' +
          '<a href="https://lumina.viberyte.com/partner/' + data.partnerId + '" style="color: #a78bfa; font-size: 13px; text-decoration: none;">View your page &#8594;</a>' +
        '</div>' +
        '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 24px 0;" />' +
        '<p style="color: #6b7280; font-size: 11px; text-align: center; line-height: 1.6;">0% platform fees &middot; You keep 100% of payments<br>Questions? Reply to this email.<br><br>Lumina by Viberyte</p>' +
      '</div>',
    });
    console.log('Claim email sent to ' + to);
    return true;
  } catch (error) {
    console.error('Claim email failed:', error);
    return false;
  }
}