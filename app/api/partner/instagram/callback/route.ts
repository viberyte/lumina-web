import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = 'https://lumina.viberyte.com/api/partner/instagram/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect('lumina://partner-onboarding?error=instagram_denied');
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Validate state token
    const oauthState = db.prepare(`
      SELECT partner_id FROM oauth_states 
      WHERE state_token = ? AND expires_at > datetime('now')
    `).get(state) as any;

    if (!oauthState) {
      return NextResponse.redirect('lumina://partner-onboarding?error=session_expired');
    }

    const partnerId = oauthState.partner_id;

    // Delete used state token
    db.prepare('DELETE FROM oauth_states WHERE state_token = ?').run(state);

    // Exchange code for access token
    const tokenResponse = await fetch(`https://api.instagram.com/oauth/access_token`, {
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
      return NextResponse.redirect('lumina://partner-onboarding?error=instagram_failed');
    }

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${INSTAGRAM_APP_SECRET}&` +
      `access_token=${tokenData.access_token}`
    );

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token || tokenData.access_token;

    // Get Instagram profile
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
    );

    const profile = await profileResponse.json();

    if (!profile.username) {
      return NextResponse.redirect('lumina://partner-onboarding?error=instagram_profile_failed');
    }

    console.log('Instagram profile:', profile);

    // Check if venue exists with this Instagram handle (for venue owners)
    const existingVenue = db.prepare(`
      SELECT id, name, partner_id FROM venues 
      WHERE LOWER(instagram_url) LIKE LOWER(?)
      OR LOWER(instagram_url) LIKE LOWER(?)
    `).get(`%${profile.username}%`, `%instagram.com/${profile.username}%`) as any;

    if (existingVenue) {
      if (existingVenue.partner_id && existingVenue.partner_id !== partnerId) {
        return NextResponse.redirect(
          `lumina://partner-onboarding?error=venue_already_claimed&venue=${encodeURIComponent(existingVenue.name)}`
        );
      }

      // Claim the venue
      db.prepare(`UPDATE venues SET partner_id = ? WHERE id = ?`).run(partnerId, existingVenue.id);
      console.log(`✅ Claimed venue ${existingVenue.id} for partner ${partnerId}`);
    }

    // Update partner with Instagram data (connection, not verification yet)
    db.prepare(`
      UPDATE partners SET 
        instagram_connected = 1,
        instagram_username = ?,
        instagram_id = ?,
        instagram_connected_at = datetime('now'),
        instagram_handle = ?
      WHERE id = ?
    `).run(profile.username, profile.id, profile.username, partnerId);

    // Store Instagram access token securely
    db.prepare(`
      INSERT OR REPLACE INTO partner_instagram (
        partner_id, access_token, token_expires_at, instagram_user_id, instagram_username
      ) VALUES (?, ?, datetime('now', '+60 days'), ?, ?)
    `).run(partnerId, accessToken, profile.id, profile.username);

    // Auto-sync Instagram content (pull photos, reels, stories)
    try {
      const syncRes = await fetch('https://lumina.viberyte.com/api/partner/instagram/sync', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken },
      });
      const syncData = await syncRes.json();
      console.log('Auto-sync result:', syncData);
    } catch (syncErr) {
      console.error('Auto-sync failed (non-blocking):', syncErr);
    }

    // Redirect back to app with success
    const message = existingVenue 
      ? `claimed_venue&venue=${encodeURIComponent(existingVenue.name)}`
      : 'instagram_connected';

    return NextResponse.redirect(`lumina://partner-onboarding?success=${message}`);

  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect('lumina://partner-onboarding?error=instagram_error');
  }
}
