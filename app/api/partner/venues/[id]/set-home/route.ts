import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('partner_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/partner_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

function getPartnerId(token: string): number | null {
  const session = db.prepare(`
    SELECT partner_id FROM partner_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  return session?.partner_id || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const venueId = parseInt(params.id);

    // Verify ownership
    const venue = db.prepare(`
      SELECT id FROM partner_venues WHERE id = ? AND partner_id = ?
    `).get(venueId, partnerId) as any;

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Unset all other venues as home
    db.prepare(`
      UPDATE partner_venues SET is_home = 0 WHERE partner_id = ?
    `).run(partnerId);

    // Set this venue as home
    db.prepare(`
      UPDATE partner_venues SET is_home = 1 WHERE id = ?
    `).run(venueId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Set home error:', error);
    return NextResponse.json({ error: 'Failed to set home venue' }, { status: 500 });
  }
}
