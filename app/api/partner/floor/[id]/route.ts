import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

function getPartnerFromSession(db: Database.Database): any {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('lumina_session');
  if (!sessionCookie?.value) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    if (!session.partner_id) return null;
    return db.prepare(`
      SELECT p.*, v.id as venue_id
      FROM partners p
      LEFT JOIN venues v ON v.claimed_by_partner_id = p.id
      WHERE p.id = ?
    `).get(session.partner_id);
  } catch (e) {
    return null;
  }
}

function verifyItemOwnership(db: Database.Database, itemId: number, venueId: number): any {
  return db.prepare(`
    SELECT * FROM tonights_floor WHERE id = ? AND venue_id = ?
  `).get(itemId, venueId);
}

// GET: Fetch single floor item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.id);
    const item = verifyItemOwnership(db, itemId, partner.venue_id);

    if (!item) {
      db.close();
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    db.close();
    return NextResponse.json({ item });

  } catch (error) {
    console.error('Floor item GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: Update floor item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.id);
    const item = verifyItemOwnership(db, itemId, partner.venue_id);

    if (!item) {
      db.close();
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, current_price, quantity_available } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (current_price !== undefined) {
      updates.push('current_price = ?');
      values.push(current_price);
    }
    if (quantity_available !== undefined) {
      updates.push('quantity_available = ?');
      values.push(quantity_available);
    }

    if (updates.length === 0) {
      db.close();
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(itemId);
    db.prepare(`UPDATE tonights_floor SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedItem = db.prepare('SELECT * FROM tonights_floor WHERE id = ?').get(itemId);
    db.close();

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });

  } catch (error) {
    console.error('Floor item PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: Remove floor item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.id);
    const item = verifyItemOwnership(db, itemId, partner.venue_id);

    if (!item) {
      db.close();
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check for pending requests before deleting
    const pendingRequests = db.prepare(`
      SELECT COUNT(*) as count FROM tonights_floor_requests
      WHERE floor_item_id = ? AND status IN ('pending', 'approved')
    `).get(itemId);

    if (pendingRequests.count > 0) {
      db.close();
      return NextResponse.json({ 
        error: 'Cannot delete item with pending or approved requests',
        pending_count: pendingRequests.count
      }, { status: 400 });
    }

    db.prepare('DELETE FROM tonights_floor WHERE id = ?').run(itemId);
    db.close();

    return NextResponse.json({
      success: true,
      message: 'Item deleted',
    });

  } catch (error) {
    console.error('Floor item DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
