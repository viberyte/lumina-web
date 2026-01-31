import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// POST: Consumer submits a booking request for Tonight's Floor item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      floor_item_id,
      user_id,
      user_name,
      user_phone,
      party_size,
      notes,
      instagram_handle,
      instagram_id,
      instagram_followers,
      instagram_verified,
      profile_picture,
    } = body;

    // Validation
    if (!floor_item_id) {
      return NextResponse.json({ error: 'floor_item_id is required' }, { status: 400 });
    }
    if (!user_name || !user_phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }
    if (!party_size || party_size < 1) {
      return NextResponse.json({ error: 'Valid party size is required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    // Clean instagram handle (remove @ if present)
    const cleanInstagram = instagram_handle ? instagram_handle.replace('@', '') : null;

    // Transaction to prevent race conditions
    const submitRequest = db.transaction(() => {
      // Check if floor item exists and is available
      const floorItem = db.prepare(`
        SELECT 
          tf.*,
          v.name as venue_name,
          (tf.quantity_available - tf.quantity_requested) as remaining
        FROM tonights_floor tf
        JOIN venues v ON tf.venue_id = v.id
        WHERE tf.id = ?
          AND tf.is_active = 1
          AND tf.is_locked = 0
          AND (tf.expires_at IS NULL OR tf.expires_at > datetime('now'))
      `).get(floor_item_id);

      if (!floorItem) {
        throw new Error('ITEM_NOT_FOUND');
      }

      if (floorItem.remaining <= 0) {
        throw new Error('SOLD_OUT');
      }

      // Check if user already has a pending request for this item
      const existingRequest = db.prepare(`
        SELECT id FROM tonights_floor_requests
        WHERE floor_item_id = ?
          AND user_phone = ?
          AND status = 'pending'
      `).get(floor_item_id, user_phone);

      if (existingRequest) {
        throw new Error('DUPLICATE_REQUEST:' + existingRequest.id);
      }

      // Insert the request
      const result = db.prepare(`
        INSERT INTO tonights_floor_requests (
          floor_item_id,
          user_id,
          user_name,
          user_phone,
          party_size,
          notes,
          instagram_handle,
          instagram_id,
          instagram_followers,
          instagram_verified,
          profile_picture,
          status,
          claimed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).run(
        floor_item_id,
        user_id || null,
        user_name,
        user_phone,
        party_size,
        notes || null,
        cleanInstagram,
        instagram_id || null,
        instagram_followers || null,
        instagram_verified ? 1 : 0,
        profile_picture || null
      );

      // Increment quantity_requested by party_size (not just 1)
      db.prepare(`
        UPDATE tonights_floor
        SET quantity_requested = quantity_requested + ?
        WHERE id = ?
      `).run(party_size, floor_item_id);

      return {
        requestId: result.lastInsertRowid,
        floorItem,
      };
    });

    let transactionResult;
    try {
      transactionResult = submitRequest();
    } catch (txError: any) {
      db.close();
      
      if (txError.message === 'ITEM_NOT_FOUND') {
        return NextResponse.json({ error: 'Item not found or no longer available' }, { status: 404 });
      }
      if (txError.message === 'SOLD_OUT') {
        return NextResponse.json({ error: 'Item is sold out' }, { status: 400 });
      }
      if (txError.message.startsWith('DUPLICATE_REQUEST:')) {
        const existingId = txError.message.split(':')[1];
        return NextResponse.json({ 
          error: 'You already have a pending request for this item',
          request_id: parseInt(existingId)
        }, { status: 409 });
      }
      throw txError;
    }

    const { requestId, floorItem } = transactionResult;

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Request sent — venue will confirm shortly',
      request: {
        id: requestId,
        floor_item_id,
        venue_name: floorItem.venue_name,
        item_name: floorItem.name,
        item_type: floorItem.item_type,
        price: floorItem.current_price,
        party_size,
        status: 'pending',
      },
    });

  } catch (error) {
    console.error('Booking request error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET: Check status of a request (by request ID or phone number)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!requestId && !phone) {
      return NextResponse.json({ error: 'id or phone parameter required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    let query = `
      SELECT 
        r.*,
        tf.name as item_name,
        tf.item_type as item_type,
        tf.current_price as item_price,
        v.name as venue_name,
        v.address as venue_address
      FROM tonights_floor_requests r
      JOIN tonights_floor tf ON r.floor_item_id = tf.id
      JOIN venues v ON tf.venue_id = v.id
    `;

    let result;

    if (requestId) {
      query += ` WHERE r.id = ?`;
      result = db.prepare(query).get(requestId);
    } else {
      query += ` WHERE r.user_phone = ? ORDER BY r.claimed_at DESC LIMIT 10`;
      result = db.prepare(query).all(phone);
    }

    db.close();

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({
      request: result,
    });

  } catch (error) {
    console.error('Request status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
