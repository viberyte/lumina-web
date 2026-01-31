import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      business_name,
      name,
      venueName,
      venueAddress,
      instagram_handle, 
      phone, 
      primary_genre
    } = body;

    // Accept business_name OR name (web form uses name)
    const partnerName = business_name || name;

    if (!email || !password || !partnerName) {
      return NextResponse.json({ error: 'Missing required fields: email, password, and name are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM partners WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    if (instagram_handle) {
      const existingIG = db.prepare('SELECT id FROM partners WHERE instagram_handle = ?').get(instagram_handle);
      if (existingIG) {
        return NextResponse.json({ error: 'Instagram handle already registered' }, { status: 409 });
      }
    }

    const passwordHash = hashPassword(password);

    const partnerResult = db.prepare(`
      INSERT INTO partners (
        email, 
        password_hash, 
        business_name, 
        name,
        instagram_handle, 
        phone, 
        primary_genre,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      email, 
      passwordHash, 
      partnerName,
      partnerName,
      instagram_handle || null, 
      phone || null, 
      primary_genre || null,
      'new'
    );

    const partnerId = partnerResult.lastInsertRowid;

    // Create venue if venueName provided (from web signup)
    if (venueName) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      db.prepare(`
        INSERT INTO partner_venues (partner_id, name, address, is_home, subscription_status, trial_ends_at)
        VALUES (?, ?, ?, 1, 'trial', ?)
      `).run(partnerId, venueName, venueAddress || null, trialEnds.toISOString());
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    db.prepare(`
      INSERT INTO partner_sessions (partner_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(partnerId, token, expiresAt.toISOString());

    // Set cookie for web
    const response = NextResponse.json({
      success: true,
      token,
      partner: { 
        id: partnerId, 
        email, 
        business_name: partnerName,
        name: partnerName,
        instagram_handle,
        status: 'new'
      },
    });

    response.cookies.set('partner_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed: ' + error.message }, { status: 500 });
  }
}
