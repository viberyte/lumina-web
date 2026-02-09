import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const REDIRECT_URI = 'https://lumina.viberyte.com/api/partner/instagram/callback';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header (secure)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = hashToken(token);

    // Verify user exists and is a partner
    const user = db.prepare(`
      SELECT id, partner_id FROM users WHERE auth_token_hash = ?
    `).get(tokenHash) as any;

    if (!user || !user.partner_id) {
      return NextResponse.json({ error: 'Partner account required' }, { status: 403 });
    }

    // Generate a temporary state token for OAuth callback
    const stateToken = crypto.randomBytes(32).toString('hex');
    const stateExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store state token temporarily
    db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state_token, partner_id, expires_at)
      VALUES (?, ?, ?)
    `).run(stateToken, user.partner_id, stateExpires);

    // Scopes for Instagram Business API
    const scopes = [
      'instagram_business_basic',



    ].join(',');

    const authUrl = `https://www.instagram.com/oauth/authorize?` +
      `enable_fb_login=0&` +
      `force_authentication=1&` +
      `client_id=${INSTAGRAM_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${stateToken}`;

    return NextResponse.json({ auth_url: authUrl });

  } catch (error) {
    console.error('Instagram auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
