import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const userId = searchParams.get('user_id');

    // Enforce single role
    if (!partnerId && !userId) {
      return NextResponse.json({ error: 'partner_id or user_id required' }, { status: 400 });
    }

    if (partnerId && userId) {
      return NextResponse.json({ error: 'Specify only one role' }, { status: 400 });
    }

    if (partnerId) {
      // Partner inbox - optimized with CTEs
      const conversations = db.prepare(`
        WITH partner_conversations AS (
          SELECT DISTINCT conversation_id
          FROM direct_messages
          WHERE partner_id = ?
        ),
        latest_messages AS (
          SELECT 
            dm.conversation_id,
            dm.message as last_message,
            dm.created_at as last_message_at,
            ROW_NUMBER() OVER (PARTITION BY dm.conversation_id ORDER BY dm.created_at DESC) as rn
          FROM direct_messages dm
          INNER JOIN partner_conversations pc ON dm.conversation_id = pc.conversation_id
        ),
        unread_counts AS (
          SELECT 
            dm.conversation_id,
            COUNT(*) as unread_count
          FROM direct_messages dm
          INNER JOIN partner_conversations pc ON dm.conversation_id = pc.conversation_id
          WHERE dm.recipient_type = 'partner' 
            AND dm.recipient_id = ?
            AND dm.read_at IS NULL
          GROUP BY dm.conversation_id
        )
        SELECT 
          dm.conversation_id,
          dm.booking_id,
          dm.venue_id,
          b.confirmation_code,
          b.booking_date,
          b.party_size,
          u.name as customer_name,
          u.instagram_handle as customer_instagram,
          lm.last_message,
          lm.last_message_at,
          COALESCE(uc.unread_count, 0) as unread_count
        FROM (
          SELECT conversation_id, booking_id, venue_id, MIN(id) as id
          FROM direct_messages
          WHERE partner_id = ?
          GROUP BY conversation_id
        ) dm
        LEFT JOIN bookings b ON dm.booking_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN latest_messages lm ON dm.conversation_id = lm.conversation_id AND lm.rn = 1
        LEFT JOIN unread_counts uc ON dm.conversation_id = uc.conversation_id
        ORDER BY lm.last_message_at DESC
      `).all(partnerId, partnerId, partnerId);

      return NextResponse.json({ conversations });
    }

    if (userId) {
      // User inbox - optimized with CTEs
      const conversations = db.prepare(`
        WITH user_conversations AS (
          SELECT DISTINCT conversation_id
          FROM direct_messages
          WHERE (sender_id = ? AND sender_type = 'customer')
             OR (recipient_id = ? AND recipient_type = 'customer')
        ),
        latest_messages AS (
          SELECT 
            dm.conversation_id,
            dm.message as last_message,
            dm.created_at as last_message_at,
            ROW_NUMBER() OVER (PARTITION BY dm.conversation_id ORDER BY dm.created_at DESC) as rn
          FROM direct_messages dm
          INNER JOIN user_conversations uc ON dm.conversation_id = uc.conversation_id
        ),
        unread_counts AS (
          SELECT 
            dm.conversation_id,
            COUNT(*) as unread_count
          FROM direct_messages dm
          INNER JOIN user_conversations uc ON dm.conversation_id = uc.conversation_id
          WHERE dm.recipient_type = 'customer' 
            AND dm.recipient_id = ?
            AND dm.read_at IS NULL
          GROUP BY dm.conversation_id
        )
        SELECT 
          dm.conversation_id,
          dm.booking_id,
          dm.venue_id,
          dm.partner_id,
          p.business_name as partner_name,
          v.name as venue_name,
          lm.last_message,
          lm.last_message_at,
          COALESCE(uc.unread_count, 0) as unread_count
        FROM (
          SELECT conversation_id, booking_id, venue_id, partner_id, MIN(id) as id
          FROM direct_messages
          WHERE (sender_id = ? AND sender_type = 'customer')
             OR (recipient_id = ? AND recipient_type = 'customer')
          GROUP BY conversation_id
        ) dm
        LEFT JOIN partners p ON dm.partner_id = p.id
        LEFT JOIN venues v ON dm.venue_id = v.id
        LEFT JOIN latest_messages lm ON dm.conversation_id = lm.conversation_id AND lm.rn = 1
        LEFT JOIN unread_counts uc ON dm.conversation_id = uc.conversation_id
        ORDER BY lm.last_message_at DESC
      `).all(userId, userId, userId, userId, userId);

      return NextResponse.json({ conversations });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error: any) {
    console.error('Messages list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, partner_id, sender_type, sender_id, message } = body;

    // Validate required fields
    if (!sender_type || !sender_id || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required', code: 'BOOKING_REQUIRED' }, { status: 400 });
    }

    // Get booking with partner info
    const booking = db.prepare(`
      SELECT b.user_id, b.venue_id, pv.partner_id 
      FROM bookings b
      LEFT JOIN partner_venues pv ON b.venue_id = pv.venue_id
      WHERE b.id = ?
    `).get(booking_id) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const resolved_partner_id = booking.partner_id || partner_id;

    // Validate partner exists for this booking
    if (!resolved_partner_id) {
      return NextResponse.json({ error: 'Partner not found for booking' }, { status: 400 });
    }

    // Authorization: verify sender is part of this booking
    if (sender_type === 'customer' && booking.user_id !== sender_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (sender_type === 'partner' && resolved_partner_id !== sender_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Instagram check for customers
    if (sender_type === 'customer') {
      const user = db.prepare('SELECT instagram_handle FROM users WHERE id = ?').get(sender_id) as any;
      if (!user?.instagram_handle) {
        return NextResponse.json({ 
          error: 'Link your Instagram to message venues',
          code: 'INSTAGRAM_REQUIRED'
        }, { status: 403 });
      }
    }

    const conversation_id = `booking_${booking_id}`;
    const recipient_id = sender_type === 'customer' ? resolved_partner_id : booking.user_id;
    const recipient_type = sender_type === 'customer' ? 'partner' : 'customer';

    const result = db.prepare(`
      INSERT INTO direct_messages (
        conversation_id, booking_id, venue_id, partner_id,
        sender_type, sender_id, recipient_type, recipient_id, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      conversation_id, booking_id, booking.venue_id, resolved_partner_id,
      sender_type, sender_id, recipient_type, recipient_id, message.trim()
    );

    const newMessage = db.prepare('SELECT * FROM direct_messages WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ success: true, message: newMessage, conversation_id });

  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
