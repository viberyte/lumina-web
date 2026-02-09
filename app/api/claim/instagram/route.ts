import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const REDIRECT_URI = 'https://lumina.viberyte.com/api/claim/instagram/callback';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Claim token required' }, { status: 400 });
    }

    // Verify claim token exists and partner is unclaimed
    const partner = db.prepare(`
      SELECT id, business_name, instagram_handle, is_claimed
      FROM partners WHERE claim_token = ?
    `).get(token) as any;

    if (!partner) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 });
    }

    if (partner.is_claimed) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    if (!partner.instagram_handle) {
      return NextResponse.json({ 
        error: 'No Instagram handle on file. Use phone verification instead.',
        fallback: 'phone'
      }, { status: 400 });
    }

    // Generate state token that includes claim token
    const stateToken = crypto.randomBytes(32).toString('hex');
    const stateExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store state with claim_token reference
    db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state_token, partner_id, claim_token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(stateToken, partner.id, token, stateExpires);

    // Instagram OAuth URL
    const scopes = ['instagram_business_basic'].join(',');

    const authUrl = `https://www.instagram.com/oauth/authorize?` +
      `enable_fb_login=0&` +
      `force_authentication=1&` +
      `client_id=${INSTAGRAM_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${stateToken}`;

    return NextResponse.json({ 
      auth_url: authUrl,
      expected_handle: partner.instagram_handle,
    });

  } catch (error) {
    console.error('Claim Instagram auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
