import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { sendClaimConfirmation } from '@/lib/email';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET - lookup claim token (for preview)
export async function GET(request: NextRequest) {
  const db = new Database(DB_PATH);
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400, headers: corsHeaders });

    const partner = db.prepare(`
      SELECT p.id, p.business_name, p.instagram_handle, p.bio, p.is_demo, p.is_claimed,
             v.city, v.state, v.image_url, v.address
      FROM partners p
      LEFT JOIN venues v ON v.id = p.source_venue_id
      WHERE p.claim_token = ?
    `).get(token) as any;

    if (!partner) return NextResponse.json({ error: 'Invalid claim token' }, { status: 404, headers: corsHeaders });
    if (partner.is_claimed === 1) return NextResponse.json({ error: 'Already claimed', partner }, { status: 409, headers: corsHeaders });

    return NextResponse.json({ partner }, { headers: corsHeaders });
  } finally {
    db.close();
  }
}

// POST - claim the page
export async function POST(request: NextRequest) {
  const db = new Database(DB_PATH);
  try {
    const { token, name, email, password, phone, role } = await request.json();

    if (!token || !email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400, headers: corsHeaders });
    }

    // Find partner by claim token
    const partner = db.prepare(`
      SELECT id, business_name, is_demo, is_claimed, email FROM partners WHERE claim_token = ?
    `).get(token) as any;

    if (!partner) return NextResponse.json({ error: 'Invalid claim token' }, { status: 404, headers: corsHeaders });
    if (partner.is_claimed === 1) return NextResponse.json({ error: 'Already claimed' }, { status: 409, headers: corsHeaders });

    // Check email not taken by another partner
    const existingEmail = db.prepare('SELECT id FROM partners WHERE email = ? AND id != ?').get(email, partner.id) as any;
    if (existingEmail) return NextResponse.json({ error: 'Email already in use' }, { status: 409, headers: corsHeaders });

    // Hash password
    const passwordHash = hashPassword(password);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    // Claim the partner - set credentials
    db.prepare(`
      UPDATE partners SET 
        is_demo = 0,
        is_claimed = 1,
        name = ?,
        email = ?,
        password_hash = ?,
        phone = ?,
        outreach_status = 'claimed',
        status = 'active'
      WHERE id = ?
    `).run(name, email, passwordHash, cleanPhone, partner.id);

    // Update partner events
    db.prepare(`
      UPDATE partner_events SET 
        is_demo = 0,
        is_claimed = 1,
        claimed_by = ?
      WHERE partner_id = ?
    `).run(partner.id, partner.id);

    // Create session token (auto-login)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    db.prepare(`
      INSERT INTO partner_sessions (partner_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(partner.id, sessionToken, expiresAt.toISOString());

    // Create user record for unified auth
    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (email, name, partner_id, roles, created_at, updated_at)
        VALUES (?, ?, ?, '["consumer","partner"]', datetime('now'), datetime('now'))
      `).run(email, name, partner.id);
      user = { id: result.lastInsertRowid };
    }

    console.log('Claimed partner ' + partner.id + ' (' + partner.business_name + ') by ' + email);

    // Send confirmation email
    sendClaimConfirmation(email, { name, businessName: partner.business_name, partnerId: partner.id });

    const response = NextResponse.json({
      success: true,
      message: partner.business_name + ' has been claimed!',
      partnerId: partner.id,
      token: sessionToken,
      partner: {
        id: partner.id,
        email,
        name,
        businessName: partner.business_name,
      }
    }, { headers: corsHeaders });

    return response;

  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  } finally {
    db.close();
  }
}
