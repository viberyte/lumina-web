import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { checkPartnerTier } from '@/lib/tierCheck';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

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
    const partnerId = tierCheck.partner.p_id;

    // Get venue views (last 30 days)
    const views = db.prepare(`
      SELECT COUNT(*) as total
      FROM venue_views
      WHERE partner_id = ? AND created_at > datetime('now', '-30 days')
    `).get(partnerId) as any;

    // Get bookings stats
    const bookingStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM bookings
      WHERE partner_id = ? AND created_at > datetime('now', '-30 days')
    `).get(partnerId) as any;

    // Get revenue (if tracking)
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM bookings
      WHERE partner_id = ? AND status = 'confirmed' AND created_at > datetime('now', '-30 days')
    `).get(partnerId) as any;

    // Get profile clicks
    const profileClicks = db.prepare(`
      SELECT COUNT(*) as total
      FROM partner_profile_views
      WHERE partner_id = ? AND created_at > datetime('now', '-30 days')
    `).get(partnerId) as any;

    db.close();

    return NextResponse.json({
      period: '30_days',
      metrics: {
        venue_views: views?.total || 0,
        profile_clicks: profileClicks?.total || 0,
        total_bookings: bookingStats?.total_bookings || 0,
        confirmed_bookings: bookingStats?.confirmed || 0,
        pending_bookings: bookingStats?.pending || 0,
        cancelled_bookings: bookingStats?.cancelled || 0,
        revenue: revenue?.total || 0,
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
