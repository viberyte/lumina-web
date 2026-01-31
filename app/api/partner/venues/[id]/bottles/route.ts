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

function verifyVenueOwnership(venueId: number, partnerId: number): boolean {
  const venue = db.prepare(`
    SELECT id FROM partner_venues WHERE id = ? AND partner_id = ?
  `).get(venueId, partnerId) as any;
  return !!venue;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; bottleId: string } }
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
    const bottleId = parseInt(params.bottleId);

    if (!verifyVenueOwnership(venueId, partnerId)) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Verify bottle belongs to venue
    const bottle = db.prepare(`
      SELECT id FROM bottle_menu WHERE id = ? AND venue_id = ?
    `).get(bottleId, venueId) as any;

    if (!bottle) {
      return NextResponse.json({ error: 'Bottle not found' }, { status: 404 });
    }

    const body = await request.json();
    const { is_active, name, category, price } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (category) {
      updates.push('category = ?');
      values.push(category);
    }
    if (price && price > 0) {
      updates.push('price = ?');
      values.push(price);
    }

    if (updates.length > 0) {
      values.push(bottleId);
      db.prepare(`
        UPDATE bottle_menu SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bottle update error:', error);
    return NextResponse.json({ error: 'Failed to update bottle' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; bottleId: string } }
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
    const bottleId = parseInt(params.bottleId);

    if (!verifyVenueOwnership(venueId, partnerId)) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Verify bottle belongs to venue
    const bottle = db.prepare(`
      SELECT id FROM bottle_menu WHERE id = ? AND venue_id = ?
    `).get(bottleId, venueId) as any;

    if (!bottle) {
      return NextResponse.json({ error: 'Bottle not found' }, { status: 404 });
    }

    db.prepare(`DELETE FROM bottle_menu WHERE id = ?`).run(bottleId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bottle delete error:', error);
    return NextResponse.json({ error: 'Failed to delete bottle' }, { status: 500 });
  }
}
