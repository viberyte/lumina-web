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
    const { venueId, email, password, name, phone } = body;

    if (!venueId || !email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const venue = db.prepare(`
      SELECT id, name, partner_id, city, state, address
      FROM venues WHERE id = ?
    `).get(venueId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    if (venue.partner_id) {
      return NextResponse.json({ error: 'This venue has already been claimed' }, { status: 400 });
    }

    const existingPartner = db.prepare(`SELECT id FROM partners WHERE email = ?`).get(email) as any;
    if (existingPartner) {
      return NextResponse.json({ error: 'An account with this email already exists. Please login instead.' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const partnerToken = crypto.randomBytes(32).toString('hex');
    const userToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const claimVenue = db.transaction(() => {
      const partnerResult = db.prepare(`
        INSERT INTO partners (email, password_hash, name, phone, business_name, tier, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'claimed', 'approved', datetime('now'), datetime('now'))
      `).run(email, passwordHash, name, phone, venue.name);

      const partnerId = partnerResult.lastInsertRowid;

      db.prepare(`
        UPDATE venues 
        SET partner_id = ?, claim_status = 'verified', claimed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(partnerId, venueId);

      const userResult = db.prepare(`
        INSERT INTO users (email, name, partner_id, roles, created_at, updated_at)
        VALUES (?, ?, ?, '["consumer","partner"]', datetime('now'), datetime('now'))
      `).run(email, name, partnerId);

      const userId = userResult.lastInsertRowid;

      db.prepare(`
        INSERT INTO partner_sessions (partner_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(partnerId, partnerToken, expiresAt.toISOString());

      db.prepare(`
        INSERT INTO user_sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(userId, userToken, expiresAt.toISOString());

      db.prepare(`
        INSERT INTO partner_venues (partner_id, name, address, is_home, subscription_status, trial_ends_at, created_at)
        VALUES (?, ?, ?, 1, 'trial', datetime('now', '+14 days'), datetime('now'))
      `).run(partnerId, venue.name, venue.address);

      return { partnerId, userId };
    });

    const { partnerId, userId } = claimVenue();

    console.log(`Venue ${venueId} claimed by partner ${partnerId} (user ${userId})`);

    const response = NextResponse.json({
      success: true,
      message: 'Venue claimed successfully',
      partnerId: partnerId,
      venueId: venueId,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('partner_token', partnerToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    response.cookies.set('user_token', userToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Failed to claim venue: ' + error.message }, { status: 500 });
  }
}
