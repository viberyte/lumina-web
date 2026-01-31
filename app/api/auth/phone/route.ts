import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import twilio from 'twilio';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('Missing Twilio credentials');
}

const client = twilio(accountSid, authToken);

// POST: Send verification code via Twilio Verify
export async function POST(request: NextRequest) {
  let db: Database.Database | null = null;
  
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Clean phone number (remove spaces, dashes)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Validate format (must start with + and country code)
    if (!cleanPhone.match(/^\+[1-9]\d{6,14}$/)) {
      return NextResponse.json({ 
        error: 'Invalid phone format. Use +1XXXXXXXXXX' 
      }, { status: 400 });
    }

    db = new Database(DB_PATH);

    // Rate limit: Check if code was sent recently (60 seconds)
    const existing = db.prepare(`
      SELECT created_at FROM phone_verifications WHERE phone = ?
    `).get(cleanPhone) as any;

    if (existing) {
      const createdAt = new Date(existing.created_at).getTime();
      const cooldown = 60 * 1000; // 60 seconds
      if (Date.now() - createdAt < cooldown) {
        const waitSeconds = Math.ceil((cooldown - (Date.now() - createdAt)) / 1000);
        db.close();
        return NextResponse.json({ 
          error: `Please wait ${waitSeconds} seconds before requesting a new code` 
        }, { status: 429 });
      }
    }

    // Send via Twilio Verify
    await client.verify.v2.services(verifyServiceSid!)
      .verifications
      .create({ to: cleanPhone, channel: 'sms' });

    // Track in database for rate limiting
    db.prepare(`
      INSERT INTO phone_verifications (phone, code, expires_at, attempts, created_at)
      VALUES (?, 'twilio-verify', ?, 0, datetime('now'))
      ON CONFLICT(phone) DO UPDATE SET
        code = 'twilio-verify',
        expires_at = excluded.expires_at,
        attempts = 0,
        created_at = datetime('now')
    `).run(cleanPhone, Date.now() + 10 * 60 * 1000);

    db.close();

    console.log(`📱 Sent Twilio Verify code to ${cleanPhone}`);

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent',
      phone: cleanPhone.slice(0, -4) + '****',
    });

  } catch (error: any) {
    console.error('Phone verification error:', error);
    if (db) db.close();
    return NextResponse.json({ 
      error: error.message || 'Failed to send verification code' 
    }, { status: 500 });
  }
}
