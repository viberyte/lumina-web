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

  return null;
}

function getPartnerId(token: string): number | null {
  const db = new Database(DB_PATH);
  const session = db.prepare(`
    SELECT partner_id FROM partner_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  db.close();
  return session?.partner_id || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const db = new Database(DB_PATH);
    const events = db.prepare(`
      SELECT 
        pe.id, pe.title, pe.event_date, pe.event_time, pe.genre, 
        pe.description, pe.sections, pe.packages, pe.image_url, pe.status,
        pv.name as venue_name, pv.id as venue_id
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      WHERE pe.partner_id = ?
      ORDER BY pe.event_date DESC
    `).all(partnerId) as any[];
    db.close();

    // Compute real-time display status based on date
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const enrichedEvents = events.map((event: any) => {
      const eventDate = event.event_date; // YYYY-MM-DD
      let display_status: string;

      if (eventDate < today) {
        display_status = 'past';
      } else if (eventDate === today) {
        display_status = 'live';
      } else {
        display_status = 'upcoming';
      }

      return {
        ...event,
        display_status,
      };
    });

    return NextResponse.json({ events: enrichedEvents });
  } catch (error: any) {
    console.error('Events fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const { venue_id, title, event_date, event_time, genre, description, sections, packages, image_url, is_recurring, recurrence_days, recurrence_type, recurrence_end_date, event_category, special_tags, price_note, city, venue_name_cache } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: 'Title and date required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    // Verify venue ownership if provided
    if (venue_id) {
      const venue = db.prepare(`
        SELECT id FROM partner_venues WHERE id = ? AND partner_id = ?
      `).get(venue_id, partnerId) as any;

      if (!venue) {
        db.close();
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }
    }

    // Get partner tier
    const partner = db.prepare('SELECT tier FROM partners WHERE id = ?').get(partnerId) as any;

    const result = db.prepare(`
      INSERT INTO partner_events (
        partner_id, venue_id, title, event_date, event_time, 
        genre, description, sections, packages, image_url, status,
        is_recurring, recurrence_days, recurrence_type, recurrence_end_date,
        event_category, special_tags, price_note, city, venue_name_cache, on_explore
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      partnerId,
      venue_id || null,
      title,
      event_date,
      event_time || null,
      genre || null,
      description || null,
      sections ? JSON.stringify(sections) : null,
      packages ? JSON.stringify(packages) : null,
      image_url || null,
      is_recurring ? 1 : 0,
      recurrence_days ? JSON.stringify(recurrence_days) : null,
      recurrence_type || 'weekly',
      recurrence_end_date || null,
      event_category || 'nightlife',
      special_tags ? JSON.stringify(special_tags) : null,
      price_note || null,
      city || null,
      venue_name_cache || null
    );

    const eventId = result.lastInsertRowid;

    // Save packages (only for premium/marketing tier)
    if ((partner?.tier === 'premium' || partner?.tier === 'marketing') && packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        db.prepare(`
          INSERT INTO event_packages (event_id, name, description, bottle_count, price, section_id, max_guests)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          eventId,
          pkg.name,
          pkg.description || null,
          pkg.bottleCount || 2,
          pkg.price || 0,
          pkg.sectionId || null,
          pkg.maxGuests || 6
        );
      }
    }

    // SYNC TO EXPLORE: All partners get events synced (claimed, marketing, premium)
    let syncedToExplore = false;
    let upgradeMessage = null;

    // Find claimed venue in main venues table
    const claimedVenue = db.prepare(`
      SELECT v.id FROM venues v
      WHERE v.partner_id = ?
      LIMIT 1
    `).get(partnerId) as any;

    if (claimedVenue) {
      // Sync to main events table
      db.prepare(`
        INSERT INTO events (
          venue_id, name, date, time, genre, description, image_url,
          partner_event_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        claimedVenue.id,
        title,
        event_date,
        event_time,
        genre,
        description,
        image_url,
        eventId
      );

      syncedToExplore = true;
      console.log(`✅ Event ${eventId} synced to Explore (tier: ${partner?.tier || 'claimed'})`);

      // Add upgrade message for claimed partners
      if (partner?.tier === 'claimed') {
        upgradeMessage = "Your event is live! Upgrade to Marketing ($20/mo) to add booking links and track performance.";
      }
    } else {
      upgradeMessage = "Event saved! Connect your Instagram to claim your venue and get your events on Viberyte's Explore page.";
    }

    db.close();

    return NextResponse.json({ 
      success: true, 
      event: { id: eventId, title, event_date },
      synced_to_explore: syncedToExplore,
      message: upgradeMessage,
      partner_tier: partner?.tier || 'claimed',
      features: {
        explore_sync: syncedToExplore,
        booking_enabled: partner?.tier === 'premium' || partner?.tier === 'marketing',
        analytics_enabled: partner?.tier === 'premium' || partner?.tier === 'marketing',
        table_management: partner?.tier === 'premium'
      }
    });
  } catch (error: any) {
    console.error('Event create error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
