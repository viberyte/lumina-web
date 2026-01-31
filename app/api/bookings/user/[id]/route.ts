import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let whereClause = 'WHERE b.user_id = ?';
    const today = new Date().toISOString().split('T')[0];

    if (filter === 'upcoming') {
      whereClause += ` AND b.booking_date >= '${today}' AND b.status != 'cancelled'`;
    } else if (filter === 'past') {
      whereClause += ` AND (b.booking_date < '${today}' OR b.status = 'completed' OR b.status = 'cancelled')`;
    }

    const bookings = db.prepare(`
      SELECT 
        b.id,
        b.venue_id,
        b.booking_type,
        b.booking_date,
        b.booking_time,
        b.party_size,
        b.status,
        b.confirmation_code,
        b.total_amount,
        b.special_requests,
        b.created_at,
        v.name as venue_name,
        v.professional_photo_url as venue_photo,
        v.address as venue_address
      FROM bookings b
      LEFT JOIN venues v ON b.venue_id = v.id
      ${whereClause}
      ORDER BY b.booking_date DESC, b.created_at DESC
    `).all(userId);

    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length
    });

  } catch (error: any) {
    console.error('Fetch user bookings error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
