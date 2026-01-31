import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import twilio from 'twilio';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

// POST: Verify the code via Twilio Verify
export async function POST(request: NextRequest) {
  let db: Database.Database | null = null;
  
  try {
    const { phone, code, userId } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Verify with Twilio
    const verification = await client.verify.v2.services(verifyServiceSid!)
      .verificationChecks
      .create({ to: cleanPhone, code: code });

    if (verification.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Invalid code. Please try again.' 
      }, { status: 400 });
    }

    db = new Database(DB_PATH);

    // Clean up rate limit record
    db.prepare('DELETE FROM phone_verifications WHERE phone = ?').run(cleanPhone);

    // If userId provided, update user's phone in database
    if (userId) {
      db.prepare(`
        UPDATE users SET 
          phone = ?,
          phone_verified = 1,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanPhone, userId);
    }

    db.close();

    console.log(`✅ Phone verified via Twilio: ${cleanPhone}`);

    return NextResponse.json({ 
      success: true,
      verified: true,
      phone: cleanPhone,
    });

  } catch (error: any) {
    console.error('Phone verify error:', error);
    if (db) db.close();
    
    // Handle Twilio-specific errors
    if (error.code === 20404) {
      return NextResponse.json({ 
        error: 'Code expired or not found. Request a new one.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Verification failed' 
    }, { status: 500 });
  }
}
