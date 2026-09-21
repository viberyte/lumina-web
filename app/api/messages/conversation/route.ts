import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

// Canonical conversation ID format
function getConversationId(bookingId: number): string {
  return `booking_${bookingId}`;
}

// 🔐 Resolve identity from session (cookie OR bearer) - server decides who you are
async function getSessionIdentity(request: NextRequest): Promise<{
  userId?: number;
  partnerId?: number;
} | null> {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    // Try user_token cookie first
    const cookieToken = request.cookies.get('user_token')?.value;
    
    if (cookieToken) {
      const session = db.prepare(`
        SELECT us.user_id, u.partner_id
        FROM user_sessions us
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.token = ? AND us.expires_at > datetime('now')
      `).get(cookieToken) as any;
      
      if (session) {
        return {
          userId: session.user_id || undefined,
          partnerId: session.partner_id || undefined
        };
      }
    }
    
    // Try bearer token
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = db.prepare(`
        SELECT us.user_id, u.partner_id
        FROM user_sessions us
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.token = ? AND us.expires_at > datetime('now')
      `).get(token) as any;
      
      if (session) {
        return {
          userId: session.user_id || undefined,
          partnerId: session.partner_id || undefined
        };
      }
    }
    
    // Try partner_token cookie (for partner portal)
    const partnerToken = request.cookies.get('partner_token')?.value;
    if (partnerToken) {
      const partnerSession = db.prepare(`
        SELECT partner_id FROM partner_sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(partnerToken) as any;
      
      if (partnerSession?.partner_id) {
        return { partnerId: partnerSession.partner_id };
      }
    }
    
    return null;
  } finally {
    db.close();
  }
}

export async function GET(request: NextRequest) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    // 🔐 Only accept booking_id - identity comes from session
    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    const bookingIdNum = Number(bookingId);
    if (!Number.isInteger(bookingIdNum) || bookingIdNum <= 0) {
      return NextResponse.json({ error: 'Invalid booking_id' }, { status: 400 });
    }

    // 🔐 Get identity from session (server decides who you are)
    const identity = await getSessionIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const conversation_id = getConversationId(bookingIdNum);

    // Get booking with all details
    const booking = db.prepare(`
      SELECT 
        b.id,
        b.user_id,
        b.venue_id,
        b.partner_id as booking_partner_id,
        b.confirmation_code,
        b.booking_date,
        b.booking_time,
        b.party_size,
        b.status,
        v.name as venue_name,
        v.professional_photo_url as venue_photo,
        u.name as customer_name,
        u.instagram_handle as customer_instagram
      FROM bookings b
      LEFT JOIN venues v ON b.venue_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).get(bookingIdNum) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Resolve partner ID from booking or messages
    let resolvedPartnerId = booking.booking_partner_id;
    if (!resolvedPartnerId) {
      const partnerFromMessages = db.prepare(`
        SELECT partner_id FROM direct_messages WHERE booking_id = ? LIMIT 1
      `).get(bookingIdNum) as any;
      resolvedPartnerId = partnerFromMessages?.partner_id;
    }

    // 🔐 Early exit: partner trying to access booking with no assigned partner
    if (!resolvedPartnerId && identity.partnerId) {
      return NextResponse.json({ error: 'No partner assigned to this booking' }, { status: 403 });
    }

    // Get partner details
    let partnerDetails = null;
    if (resolvedPartnerId) {
      partnerDetails = db.prepare(`
        SELECT business_name, instagram_handle
        FROM partners
        WHERE id = ?
      `).get(resolvedPartnerId) as any;
    }

    // 🔐 Determine role from session (server decides, not client)
    let role: 'customer' | 'partner' | null = null;
    
    if (identity.userId && identity.userId === booking.user_id) {
      role = 'customer';
    } else if (identity.partnerId && identity.partnerId === resolvedPartnerId) {
      role = 'partner';
    }

    if (!role) {
      return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
    }

    // Mark messages as read based on determined role
    if (role === 'customer' && identity.userId) {
      db.prepare(`
        UPDATE direct_messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
          AND recipient_type = 'customer'
          AND recipient_id = ?
          AND read_at IS NULL
      `).run(conversation_id, identity.userId);
    } else if (role === 'partner' && identity.partnerId) {
      db.prepare(`
        UPDATE direct_messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
          AND recipient_type = 'partner'
          AND recipient_id = ?
          AND read_at IS NULL
      `).run(conversation_id, identity.partnerId);
    }

    // Get messages
    const messages = db.prepare(`
      SELECT 
        dm.id,
        dm.conversation_id,
        dm.booking_id,
        dm.sender_type,
        dm.sender_id,
        dm.message,
        dm.read_at,
        dm.created_at,
        CASE 
          WHEN dm.sender_type = 'customer' THEN u.name
          WHEN dm.sender_type = 'partner' THEN p.business_name
          WHEN dm.sender_type = 'system' THEN 'Viberyte'
        END as sender_name,
        CASE 
          WHEN dm.sender_type = 'customer' THEN u.instagram_handle
          ELSE NULL
        END as sender_instagram
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_type = 'customer' AND dm.sender_id = u.id
      LEFT JOIN partners p ON dm.sender_type = 'partner' AND dm.sender_id = p.id
      WHERE dm.conversation_id = ?
      ORDER BY dm.created_at ASC
    `).all(conversation_id);

    return NextResponse.json({ 
      conversation_id,
      role,
      booking: {
        id: booking.id,
        confirmation_code: booking.confirmation_code,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        party_size: booking.party_size,
        status: booking.status,
        venue_name: booking.venue_name || 'Unknown Venue',
        venue_photo: booking.venue_photo || null,
        partner_id: resolvedPartnerId,
        partner_name: partnerDetails?.business_name || null,
        partner_instagram: partnerDetails?.instagram_handle || null,
        customer_name: booking.customer_name || null,
        customer_instagram: booking.customer_instagram || null
      },
      messages,
      message_count: messages.length
    });

  } catch (error: any) {
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}
