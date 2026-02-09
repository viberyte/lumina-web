import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import twilio from 'twilio';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('❌ Twilio Verify not configured - claim flow will fail');
}

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  if (!accountSid || !authToken || !verifyServiceSid) {
    return NextResponse.json({ 
      error: 'Phone verification not configured. Contact support.' 
    }, { status: 503 });
  }

  let db: Database.Database | null = null;
  
  try {
    const { token, phone, code } = await request.json();

    if (!token || !phone || !code) {
      return NextResponse.json({ 
        error: 'Token, phone, and code required' 
      }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (!cleanPhone.match(/^\+[1-9]\d{6,14}$/)) {
      return NextResponse.json({ 
        error: 'Invalid phone format. Use +1XXXXXXXXXX' 
      }, { status: 400 });
    }

    const verification = await client.verify.v2.services(verifyServiceSid!)
      .verificationChecks
      .create({ to: cleanPhone, code: code });

    if (verification.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Invalid code. Please try again.' 
      }, { status: 400 });
    }

    db = new Database(DB_PATH);

    const partner = db.prepare(`
      SELECT id, business_name, is_claimed, is_demo
      FROM partners 
      WHERE claim_token = ?
    `).get(token) as any;

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 });
    }

    if (partner.is_claimed) {
      db.close();
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    const existingClaim = db.prepare(`
      SELECT id, business_name FROM partners 
      WHERE phone = ? AND is_claimed = 1 AND id != ?
    `).get(cleanPhone, partner.id) as any;

    if (existingClaim) {
      db.close();
      return NextResponse.json({ 
        error: `This phone is already linked to ${existingClaim.business_name}. Contact support if you manage multiple venues.` 
      }, { status: 409 });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const claimPartner = db.transaction(() => {
      db!.prepare(`
        UPDATE partners SET
          is_claimed = 1,
          is_demo = 0,
          phone = ?,
          outreach_status = 'claimed',
          updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanPhone, partner.id);

      db!.prepare(`
        UPDATE partner_events SET
          is_claimed = 1,
          is_demo = 0,
          claimed_at = datetime('now'),
          claimed_by = ?
        WHERE partner_id = ? AND is_demo = 1
      `).run(partner.id, partner.id);

      db!.prepare(`
        INSERT INTO partner_sessions (partner_id, token, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(partner.id, sessionToken, expiresAt.toISOString());

      db!.prepare('DELETE FROM phone_verifications WHERE phone = ?').run(cleanPhone);
    });

    claimPartner();
    db.close();

    console.log(`✅ Partner ${partner.id} (${partner.business_name}) claimed via ${cleanPhone}`);

    return NextResponse.json({ 
      success: true,
      partnerId: partner.id,
      businessName: partner.business_name,
      token: sessionToken,
      message: 'Page claimed successfully!',
    });

  } catch (error: any) {
    console.error('Claim verify error:', error);
    if (db) db.close();
    
    if (error.code === 20404) {
      return NextResponse.json({ 
        error: 'Code expired. Request a new one.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Verification failed' 
    }, { status: 500 });
  }
}
