import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = 'https://lumina.viberyte.com/api/claim/instagram/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=instagram_denied');
    }

    if (!code || !state) {
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=missing_code');
    }

    // Validate state token and get claim info
    const oauthState = db.prepare(`
      SELECT partner_id, claim_token FROM oauth_states 
      WHERE state_token = ? AND expires_at > datetime('now')
    `).get(state) as any;

    if (!oauthState) {
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=session_expired');
    }

    const { partner_id, claim_token } = oauthState;

    // Delete used state token
    db.prepare('DELETE FROM oauth_states WHERE state_token = ?').run(state);

    // Get the partner's expected Instagram handle
    const partner = db.prepare(`
      SELECT id, business_name, instagram_handle, is_claimed
      FROM partners WHERE id = ?
    `).get(partner_id) as any;

    if (!partner || partner.is_claimed) {
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=already_claimed');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID!,
        client_secret: INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Instagram token error:', tokenData);
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=instagram_failed');
    }

    // Get Instagram profile
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${tokenData.access_token}`
    );

    const profile = await profileResponse.json();

    if (!profile.username) {
      return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=profile_failed');
    }

    console.log(`🔍 Claim verification: expected @${partner.instagram_handle}, got @${profile.username}`);

    // CRITICAL: Verify Instagram handle matches what we have on file
    const expectedHandle = partner.instagram_handle?.replace('@', '').toLowerCase();
    const actualHandle = profile.username.toLowerCase();

    if (expectedHandle !== actualHandle) {
      console.log(`❌ Handle mismatch: expected ${expectedHandle}, got ${actualHandle}`);
      return NextResponse.redirect(
        `https://lumina.viberyte.com/claim/error?reason=handle_mismatch&expected=${expectedHandle}&got=${actualHandle}`
      );
    }

    // ✅ VERIFIED! Instagram matches - complete the claim
    console.log(`✅ Instagram verified for partner ${partner_id}: @${actualHandle}`);

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${INSTAGRAM_APP_SECRET}&` +
      `access_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token || tokenData.access_token;

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Transaction: claim partner + create session + store Instagram token
    const claimPartner = db.transaction(() => {
      // Update partner as claimed
      db.prepare(`
        UPDATE partners SET
          is_claimed = 1,
          is_demo = 0,
          instagram_connected = 1,
          instagram_username = ?,
          instagram_id = ?,
          instagram_connected_at = datetime('now'),
          instagram_verified_at = datetime('now'),
          outreach_status = 'claimed',
          updated_at = datetime('now')
        WHERE id = ?
      `).run(profile.username, profile.id, partner_id);

      // Update any demo events
      db.prepare(`
        UPDATE partner_events SET
          is_claimed = 1,
          is_demo = 0,
          claimed_at = datetime('now'),
          claimed_by = ?
        WHERE partner_id = ? AND is_demo = 1
      `).run(partner_id, partner_id);

      // Create partner session
      db.prepare(`
        INSERT INTO partner_sessions (partner_id, token, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(partner_id, sessionToken, expiresAt.toISOString());

      // Store Instagram access token
      db.prepare(`
        INSERT OR REPLACE INTO partner_instagram (
          partner_id, access_token, token_expires_at, instagram_user_id, instagram_username
        ) VALUES (?, ?, datetime('now', '+60 days'), ?, ?)
      `).run(partner_id, accessToken, profile.id, profile.username);
    });

    claimPartner();

    // Redirect to success page with session token
    return NextResponse.redirect(
      `https://lumina.viberyte.com/claim/success?token=${sessionToken}&partner=${partner_id}&name=${encodeURIComponent(partner.business_name)}`
    );

  } catch (error) {
    console.error('Claim Instagram callback error:', error);
    return NextResponse.redirect('https://lumina.viberyte.com/claim/error?reason=server_error');
  }
}
