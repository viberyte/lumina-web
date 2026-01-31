import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// POST: Claim a floor item (requires Instagram verification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      floor_item_id, 
      user_name, 
      user_phone, 
      party_size, 
      notes,
      // Instagram required
      instagram_handle,
      instagram_id,
      instagram_followers,
      profile_picture,
    } = body;

    // Validation
    if (!floor_item_id || !user_name || !user_phone) {
      return NextResponse.json(
        { error: 'floor_item_id, user_name, and user_phone are required' },
        { status: 400 }
      );
    }

    // Instagram verification required
    if (!instagram_handle) {
      return NextResponse.json(
        { error: 'Instagram verification required to claim', code: 'INSTAGRAM_REQUIRED' },
        { status: 403 }
      );
    }

    const db = new Database(DB_PATH);

    // Check item exists and has availability (race condition protection)
    const item = db.prepare(`
      SELECT * FROM tonights_floor 
      WHERE id = ? 
        AND is_active = 1 
        AND is_locked = 0
        AND valid_date = date('now')
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND quantity_claimed < quantity_available
    `).get(floor_item_id) as any;

    if (!item) {
      db.close();
      return NextResponse.json(
        { error: 'Item not available or already claimed' },
        { status: 410 }
      );
    }

    // Start transaction for atomic update
    const transaction = db.transaction(() => {
      // Double-check and increment claim count atomically
      const updateResult = db.prepare(`
        UPDATE tonights_floor 
        SET quantity_claimed = quantity_claimed + 1,
            is_locked = CASE WHEN quantity_claimed + 1 >= quantity_available THEN 1 ELSE 0 END,
            locked_at = CASE WHEN quantity_claimed + 1 >= quantity_available THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
        WHERE id = ? 
          AND quantity_claimed < quantity_available
      `).run(floor_item_id);

      if (updateResult.changes === 0) {
        throw new Error('Item no longer available');
      }

      // Create claim record with Instagram info
      const claimResult = db.prepare(`
        INSERT INTO tonights_floor_claims (
          floor_item_id, user_name, user_phone, party_size, notes, status,
          instagram_handle, instagram_id, instagram_followers, instagram_verified, profile_picture
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, 1, ?)
      `).run(
        floor_item_id, 
        user_name, 
        user_phone, 
        party_size || null, 
        notes || null,
        instagram_handle,
        instagram_id || null,
        instagram_followers || null,
        profile_picture || null
      );

      return claimResult.lastInsertRowid;
    });

    let claimId;
    try {
      claimId = transaction();
    } catch (e) {
      db.close();
      return NextResponse.json(
        { error: 'Item no longer available' },
        { status: 410 }
      );
    }

    // Get updated item info
    const updatedItem = db.prepare(`
      SELECT 
        tf.*,
        v.name as venue_name,
        v.address as venue_address,
        p.business_name as partner_name
      FROM tonights_floor tf
      LEFT JOIN venues v ON tf.venue_id = v.id
      LEFT JOIN partners p ON tf.partner_id = p.id
      WHERE tf.id = ?
    `).get(floor_item_id) as any;

    db.close();

    return NextResponse.json({
      success: true,
      claim_id: claimId,
      message: 'Claimed successfully! Venue will confirm shortly.',
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        type: updatedItem.type,
        venue_name: updatedItem.venue_name,
        venue_address: updatedItem.venue_address,
        remaining: updatedItem.quantity_available - updatedItem.quantity_claimed,
      },
    });

  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
