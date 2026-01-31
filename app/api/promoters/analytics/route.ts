import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoterId = searchParams.get('promoter_id');
    const venueId = searchParams.get('venue_id');
    const period = searchParams.get('period') || '30'; // days

    if (!promoterId) {
      return NextResponse.json({ error: 'promoter_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Verify promoter exists
    const promoter = db.prepare('SELECT * FROM promoters WHERE id = ?').get(promoterId) as any;
    if (!promoter) {
      db.close();
      return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
    }

    // Get promoter's venue IDs
    let venueIds: number[] = [];
    if (venueId) {
      venueIds = [parseInt(venueId)];
    } else {
      const venues = db.prepare('SELECT venue_id FROM promoter_venues WHERE promoter_id = ?').all(promoterId) as any[];
      venueIds = venues.map(v => v.venue_id);
    }

    if (venueIds.length === 0) {
      db.close();
      return NextResponse.json({
        success: true,
        promoter_id: promoterId,
        message: 'No venues claimed yet',
        stats: null
      });
    }

    const venueIdList = venueIds.join(',');
    const daysAgo = `date('now', '-${period} days')`;

    // Overall stats
    const overallStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status IN ('confirmed', 'completed') THEN platform_fee ELSE 0 END) as platform_fees,
        AVG(party_size) as avg_party_size
      FROM bookings 
      WHERE venue_id IN (${venueIdList})
      AND created_at >= ${daysAgo}
    `).get() as any;

    // Bookings by day
    const bookingsByDay = db.prepare(`
      SELECT 
        date(booking_date) as date,
        COUNT(*) as bookings,
        SUM(total_amount) as revenue
      FROM bookings 
      WHERE venue_id IN (${venueIdList})
      AND booking_date >= ${daysAgo}
      GROUP BY date(booking_date)
      ORDER BY date DESC
      LIMIT 30
    `).all();

    // Bookings by type
    const bookingsByType = db.prepare(`
      SELECT 
        booking_type,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM bookings 
      WHERE venue_id IN (${venueIdList})
      AND created_at >= ${daysAgo}
      GROUP BY booking_type
    `).all();

    // Top venues
    const topVenues = db.prepare(`
      SELECT 
        v.id,
        v.name,
        COUNT(b.id) as bookings,
        SUM(b.total_amount) as revenue
      FROM venues v
      LEFT JOIN bookings b ON v.id = b.venue_id AND b.created_at >= ${daysAgo}
      WHERE v.id IN (${venueIdList})
      GROUP BY v.id
      ORDER BY bookings DESC
    `).all();

    // Guest list stats
    const guestStats = db.prepare(`
      SELECT 
        COUNT(*) as total_guests,
        SUM(checked_in) as checked_in
      FROM guest_list_entries gle
      JOIN bookings b ON gle.booking_id = b.id
      WHERE b.venue_id IN (${venueIdList})
      AND b.created_at >= ${daysAgo}
    `).get() as any;

    // Recent bookings
    const recentBookings = db.prepare(`
      SELECT 
        b.id,
        b.confirmation_code,
        b.booking_type,
        b.party_size,
        b.booking_date,
        b.status,
        b.total_amount,
        v.name as venue_name,
        b.created_at
      FROM bookings b
      JOIN venues v ON b.venue_id = v.id
      WHERE b.venue_id IN (${venueIdList})
      ORDER BY b.created_at DESC
      LIMIT 10
    `).all();

    db.close();

    return NextResponse.json({
      success: true,
      promoter_id: promoterId,
      period_days: parseInt(period),
      stats: {
        overview: {
          total_bookings: overallStats.total_bookings || 0,
          confirmed_bookings: overallStats.confirmed_bookings || 0,
          completed_bookings: overallStats.completed_bookings || 0,
          cancelled_bookings: overallStats.cancelled_bookings || 0,
          total_revenue: overallStats.total_revenue || 0,
          platform_fees: overallStats.platform_fees || 0,
          avg_party_size: Math.round(overallStats.avg_party_size || 0),
          total_guests: guestStats.total_guests || 0,
          guests_checked_in: guestStats.checked_in || 0
        },
        bookings_by_day: bookingsByDay,
        bookings_by_type: bookingsByType,
        top_venues: topVenues,
        recent_bookings: recentBookings
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
