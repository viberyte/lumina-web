import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Get user from token (cookie OR header)
async function getUserId(request: NextRequest): Promise<number | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('user_token')?.value;
  
  if (cookieToken) {
    const session = db.prepare(`
      SELECT user_id FROM user_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(cookieToken) as any;
    if (session?.user_id) return session.user_id;
  }
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = db.prepare(`
      SELECT user_id FROM user_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;
    if (session?.user_id) return session.user_id;
  }
  
  return null;
}

function generateConfirmationCode(): string {
  return 'LUM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET - Fetch user's bookings
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const bookings = db.prepare(`
      SELECT 
        b.*,
        pe.title as event_title,
        pe.event_date,
        pe.event_time,
        pe.image_url as event_image,
        pv.name as venue_name,
        p.business_name as partner_name,
        p.instagram_handle as partner_instagram
      FROM bookings b
      LEFT JOIN partner_events pe ON b.event_id = pe.id
      LEFT JOIN partner_venues pv ON b.venue_id = pv.id
      LEFT JOIN partners p ON b.partner_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST - Create new booking request
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    
    // Auth gate
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 🔐 Instagram verification gate (server-side truth)
    const user = db.prepare(`
      SELECT instagram_verified_at, instagram_handle
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    if (!user?.instagram_verified_at) {
      return NextResponse.json(
        { error: 'Instagram verification required', code: 'IG_VERIFICATION_REQUIRED' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { eventId, venueId, partnerId, sectionName, sectionMinSpend, bottles, partySize, notes, paymentMethod } = body;

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }

    // 🔐 Prevent duplicate pending bookings (same user + same event)
    if (eventId) {
      const existingPending = db.prepare(`
        SELECT id FROM bookings 
        WHERE user_id = ? AND event_id = ? AND status = 'pending'
      `).get(userId, eventId) as any;

      if (existingPending) {
        return NextResponse.json(
          { error: 'You already have a pending booking for this event', code: 'DUPLICATE_PENDING' },
          { status: 409 }
        );
      }
    }

    // 🔐 Rate limit: max 5 pending bookings per user
    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count FROM bookings 
      WHERE user_id = ? AND status = 'pending'
    `).get(userId) as any;

    if (pendingCount?.count >= 5) {
      return NextResponse.json(
        { error: 'Maximum pending bookings reached (5). Please wait for existing bookings to be confirmed.', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    let totalEstimate = sectionMinSpend || 0;
    if (bottles && bottles.length > 0) {
      totalEstimate = bottles.reduce((sum: number, b: any) => sum + (b.price * b.quantity), 0);
    }

    const confirmationCode = generateConfirmationCode();

    // Create booking
    const result = db.prepare(`
      INSERT INTO bookings (
        event_id, venue_id, partner_id, user_id, 
        section_name_snapshot, section_min_spend_snapshot,
        party_size, total_amount, payment_method, special_requests,
        confirmation_code, status, booking_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'section')
    `).run(
      eventId || null, 
      venueId || null, 
      partnerId, 
      userId,
      sectionName || null,
      sectionMinSpend || null,
      partySize || 1,
      totalEstimate,
      paymentMethod || null,
      notes || null,
      confirmationCode
    );

    const bookingId = result.lastInsertRowid;

    // Insert bottle items
    if (bottles && bottles.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO booking_items (booking_id, bottle_name_snapshot, quantity, unit_price_snapshot)
        VALUES (?, ?, ?, ?)
      `);
      for (const bottle of bottles) {
        insertItem.run(bookingId, bottle.name, bottle.quantity, bottle.price);
      }
    }

    // Create DM conversation with verified IG handle
    const conversationId = `booking_${bookingId}`;
    
    db.prepare(`
      INSERT INTO direct_messages (conversation_id, booking_id, partner_id, sender_type, sender_id, recipient_type, recipient_id, message)
      VALUES (?, ?, ?, 'customer', ?, 'partner', ?, ?)
    `).run(
      conversationId, 
      bookingId, 
      partnerId, 
      userId, 
      partnerId, 
      `Booking request submitted. Confirmation: ${confirmationCode}. Guest IG: @${user.instagram_handle || 'verified'}`
    );

    console.log('Booking created:', { bookingId, confirmationCode, userId, partnerId, igVerified: true });

    return NextResponse.json({
      success: true,
      booking: {
        id: Number(bookingId),
        confirmationCode,
        status: 'pending',
        totalEstimate,
        conversationId
      },
      message: 'Booking request submitted!'
    });

  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
