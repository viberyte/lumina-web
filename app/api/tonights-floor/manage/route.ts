import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { checkPartnerTier } from '@/lib/tierCheck';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET: List partner's floor inventory
export async function GET(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  // TIER CHECK: Elite only
  const tierCheck = checkPartnerTier(userToken, 'elite');
  if (!tierCheck.authorized) {
    return NextResponse.json(
      { error: tierCheck.error, requiredTier: 'elite', currentTier: tierCheck.tier },
      { status: 403 }
    );
  }

  try {
    const db = new Database(DB_PATH);

    const items = db.prepare(`
      SELECT 
        tf.*,
        v.name as venue_name,
        (tf.quantity_available - tf.quantity_claimed) as remaining
      FROM tonights_floor tf
      LEFT JOIN venues v ON tf.venue_id = v.id
      WHERE tf.partner_id = ?
        AND tf.valid_date >= date('now', '-7 days')
      ORDER BY tf.valid_date DESC, tf.created_at DESC
    `).all(tierCheck.partner.p_id);

    db.close();

    return NextResponse.json({ items });

  } catch (error) {
    console.error('Tonight\'s Floor manage error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create new floor inventory item
export async function POST(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  // TIER CHECK: Elite only
  const tierCheck = checkPartnerTier(userToken, 'elite');
  if (!tierCheck.authorized) {
    return NextResponse.json(
      { error: tierCheck.error, requiredTier: 'elite', currentTier: tierCheck.tier },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      venue_id,
      type,
      title,
      description,
      original_price,
      current_price,
      min_spend,
      capacity,
      quantity_available,
      section_name,
      bottle_type,
      expires_at,
      is_flash_deal,
    } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'Type and title are required' }, { status: 400 });
    }

    if (!['table', 'bottle', 'deal', 'guestlist'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const result = db.prepare(`
      INSERT INTO tonights_floor (
        venue_id, partner_id, type, title, description,
        original_price, current_price, min_spend, capacity,
        quantity_available, section_name, bottle_type,
        expires_at, is_flash_deal, valid_date, released_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'))
    `).run(
      venue_id || null,
      tierCheck.partner.p_id,
      type,
      title,
      description || null,
      original_price || null,
      current_price || original_price || null,
      min_spend || null,
      capacity || null,
      quantity_available || 1,
      section_name || null,
      bottle_type || null,
      expires_at || null,
      is_flash_deal ? 1 : 0
    );

    db.close();

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
    });

  } catch (error) {
    console.error('Tonight\'s Floor create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
