export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const db = getDb();
  
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's bookings with event details
    const bookings = db.prepare(`
      SELECT 
        b.booking_id,
        b.event_id,
        b.ticket_price,
        b.lumina_fee,
        b.total_amount,
        b.status,
        b.created_at,
        e.title as event_title,
        e.venue_name,
        e.date as event_date,
        e.image_url as event_image
      FROM bookings b
      LEFT JOIN events e ON b.event_id = e.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    return NextResponse.json({
      bookings,
      count: bookings.length
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Get bookings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bookings' },
      { status: 500, headers: corsHeaders }
    );
  }
}
