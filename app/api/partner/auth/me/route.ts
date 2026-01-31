import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('partner_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/partner_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

// Define tier permissions
const TIER_PERMISSIONS = {
  claimed: {
    can_create_events: true,
    can_edit_profile: true,
    can_view_analytics: true,
    can_create_specials: true,
    can_manage_bookings: false,
    can_manage_tables: false,
    can_use_door_system: false,
    can_stripe_connect: false,
    events_sync_to_explore: true,
    specials_featured: false,
    next_stop_priority: false,
    max_events_per_month: 10,
    analytics_depth: 'basic'
  },
  marketing: {
    can_create_events: true,
    can_edit_profile: true,
    can_view_analytics: true,
    can_create_specials: true,
    can_manage_bookings: true,
    can_manage_tables: false,
    can_use_door_system: false,
    can_stripe_connect: false,
    events_sync_to_explore: true,
    specials_featured: true,
    next_stop_priority: true,
    max_events_per_month: 50,
    analytics_depth: 'detailed'
  },
  premium: {
    can_create_events: true,
    can_edit_profile: true,
    can_view_analytics: true,
    can_create_specials: true,
    can_manage_bookings: true,
    can_manage_tables: true,
    can_use_door_system: true,
    can_stripe_connect: true,
    events_sync_to_explore: true,
    specials_featured: true,
    next_stop_priority: true,
    max_events_per_month: -1, // unlimited
    analytics_depth: 'full'
  }
};

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = new Database(DB_PATH);

    const session = db.prepare(`
      SELECT partner_id FROM partner_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;

    if (!session) {
      db.close();
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const partner = db.prepare(`
      SELECT 
        id, email, name, phone, created_at, tier,
        instagram_connected, instagram_username,
        cancel_at_period_end, subscription_ends_at
      FROM partners WHERE id = ?
    `).get(session.partner_id) as any;

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const venues = db.prepare(`
      SELECT id, name, address, is_home, subscription_status, trial_ends_at, stripe_connected
      FROM partner_venues WHERE partner_id = ?
      ORDER BY is_home DESC
    `).all(partner.id) as any[];

    // Get claimed venues from main venues table
    const claimedVenues = db.prepare(`
      SELECT id, name, address, category, google_rating
      FROM venues WHERE partner_id = ?
    `).all(partner.id) as any[];

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const venueIds = venues.map(v => v.id);
    const claimedVenueIds = claimedVenues.map(v => v.id);
    const allVenueIds = [...venueIds, ...claimedVenueIds];

    let stats = { todayBookings: 0, weekBookings: 0, monthRevenue: 0, nextStopImpressions: 0 };

    if (allVenueIds.length > 0) {
      const todayBookings = db.prepare(`
        SELECT COUNT(*) as count FROM partner_bookings 
        WHERE venue_id IN (${venueIds.join(',') || 0}) AND booking_date = ?
      `).get(today) as any;

      const weekBookings = db.prepare(`
        SELECT COUNT(*) as count FROM partner_bookings 
        WHERE venue_id IN (${venueIds.join(',') || 0}) AND booking_date >= ?
      `).get(weekAgo) as any;

      const monthRevenue = db.prepare(`
        SELECT COALESCE(SUM(funded_amount), 0) as total FROM partner_bookings 
        WHERE venue_id IN (${venueIds.join(',') || 0}) AND booking_date >= ? AND status = 'funded'
      `).get(monthStart) as any;

      const nextStopStats = db.prepare(`
        SELECT COUNT(*) as count FROM next_stop_conversions
        WHERE to_venue_id IN (${claimedVenueIds.join(',') || 0})
        AND created_at >= ?
      `).get(weekAgo) as any;

      stats = {
        todayBookings: todayBookings?.count || 0,
        weekBookings: weekBookings?.count || 0,
        monthRevenue: monthRevenue?.total || 0,
        nextStopImpressions: nextStopStats?.count || 0
      };
    }

    // Get tier permissions
    const tier = partner.tier || 'claimed';
    const permissions = TIER_PERMISSIONS[tier as keyof typeof TIER_PERMISSIONS] || TIER_PERMISSIONS.claimed;

    // Check subscription status
    let subscription_status = 'active';
    let days_until_renewal = null;
    let trial_active = false;

    if (partner.subscription_ends_at) {
      const endsAt = new Date(partner.subscription_ends_at);
      const now = new Date();
      days_until_renewal = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (partner.cancel_at_period_end) {
        subscription_status = 'canceling';
      }
    }

    // Check trial status for venues
    if (venues.length > 0 && venues[0].trial_ends_at) {
      const trialEnds = new Date(venues[0].trial_ends_at);
      const now = new Date();
      if (trialEnds > now) {
        trial_active = true;
        days_until_renewal = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Upgrade recommendations
    const upgrade_prompts = [];
    if (tier === 'claimed') {
      if (claimedVenues.length > 0) {
        upgrade_prompts.push({
          feature: 'bookings',
          message: 'Upgrade to Marketing ($20/mo) to accept table reservations',
          cta: 'Enable Bookings'
        });
      }
      if (stats.nextStopImpressions > 10) {
        upgrade_prompts.push({
          feature: 'priority',
          message: `You got ${stats.nextStopImpressions} Next Stop recommendations! Upgrade for 3x priority placement`,
          cta: 'Boost Visibility'
        });
      }
    } else if (tier === 'marketing') {
      if (stats.weekBookings > 5) {
        upgrade_prompts.push({
          feature: 'tables',
          message: 'Upgrade to Premium ($50/mo) for full table management + door system',
          cta: 'Unlock Pro Features'
        });
      }
    }

    db.close();

    return NextResponse.json({
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        phone: partner.phone,
        tier: tier,
        created_at: partner.created_at,
        instagram_connected: partner.instagram_connected === 1,
        instagram_username: partner.instagram_username
      },
      subscription: {
        status: subscription_status,
        days_until_renewal,
        trial_active,
        cancel_at_period_end: partner.cancel_at_period_end === 1
      },
      venues,
      claimed_venues: claimedVenues,
      stats,
      permissions,
      upgrade_prompts,
      features: {
        claimed: tier === 'claimed' ? null : 'You have full access',
        marketing: tier === 'marketing' || tier === 'premium' ? null : 'Upgrade for featured specials + bookings',
        premium: tier === 'premium' ? null : 'Upgrade for table management + door system'
      }
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
