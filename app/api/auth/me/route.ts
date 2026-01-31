import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(request: NextRequest) {
  try {
    // ONLY check user_token (unified auth) - no fallback
    const userToken = request.cookies.get('user_token')?.value;

    if (!userToken) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Resolve user through unified session
    const user = db.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.phone,
        u.instagram_handle,
        u.partner_id,
        u.roles,
        p.id as p_id,
        p.business_name as partner_business_name,
        p.instagram_connected as partner_instagram_connected,
        p.instagram_username as partner_instagram_username,
        p.tier as partner_tier,
        p.bio as partner_bio,
        p.profile_picture as partner_profile_picture
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      LEFT JOIN partners p ON u.partner_id = p.id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(userToken) as any;

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Parse roles
    let roles = ['consumer'];
    try {
      roles = JSON.parse(user.roles || '["consumer"]');
    } catch (e) {
      roles = ['consumer'];
    }

    const isPartner = roles.includes('partner') || !!user.partner_id;

    // Get partner's venues if they're a partner
    let venues: any[] = [];
    if (isPartner && user.partner_id) {
      venues = db.prepare(`
        SELECT id, name, address, is_home, subscription_status
        FROM partner_venues 
        WHERE partner_id = ?
        ORDER BY is_home DESC
      `).all(user.partner_id) as any[];
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        instagramHandle: user.instagram_handle,
        roles: roles,
        isPartner: isPartner,
        partner: isPartner ? {
          id: user.partner_id,
          businessName: user.partner_business_name,
          bio: user.partner_bio,
          profilePicture: user.partner_profile_picture,
          instagramConnected: !!user.partner_instagram_connected,
          instagramUsername: user.partner_instagram_username,
          tier: user.partner_tier,
          venues: venues,
        } : null,
      },
    });

  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false, error: 'Auth check failed' }, { status: 500 });
  }
}
