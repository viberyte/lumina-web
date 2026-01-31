import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = hashToken(token);

    // Get user and partner
    const user = db.prepare(`
      SELECT id, partner_id FROM users WHERE auth_token_hash = ?
    `).get(tokenHash) as any;

    if (!user || !user.partner_id) {
      return NextResponse.json({ error: 'Partner account required' }, { status: 403 });
    }

    // Check if Instagram is connected
    const partner = db.prepare(`
      SELECT instagram_connected, instagram_username FROM partners WHERE id = ?
    `).get(user.partner_id) as any;

    if (!partner || !partner.instagram_connected) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 });
    }

    // Mark as verified and activate
    db.prepare(`
      UPDATE partners SET 
        instagram_verified = 1,
        status = 'active',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.partner_id);

    return NextResponse.json({
      success: true,
      verified: true,
      status: 'active',
      username: partner.instagram_username,
    });

  } catch (error) {
    console.error('Verify complete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
