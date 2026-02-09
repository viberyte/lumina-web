import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const session = db.prepare(`
      SELECT partner_id FROM partner_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
    }

    const ig = db.prepare(`
      SELECT instagram_user_id, instagram_username, token_expires_at
      FROM partner_instagram 
      WHERE partner_id = ?
    `).get(session.partner_id) as any;

    const partner = db.prepare(`
      SELECT instagram_handle, instagram_synced_at FROM partners WHERE id = ?
    `).get(session.partner_id) as any;

    if (ig && ig.token_expires_at > new Date().toISOString()) {
      return NextResponse.json({
        connected: true,
        username: ig.instagram_username,
        synced_at: partner?.instagram_synced_at || null,
        token_expires: ig.token_expires_at,
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      connected: false,
      username: partner?.instagram_handle || null,
      synced_at: null,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Instagram status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
