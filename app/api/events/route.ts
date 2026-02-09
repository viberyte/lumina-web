import { expandRecurringEvents } from '@/lib/recurringEvents';
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const NYC_ALIASES = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'nyc', 'new york city'];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const db = new Database(dbPath);

  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    let city = searchParams.get('city');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const clientLimit = parseInt(searchParams.get('limit') || '500');
    const limit = Math.max(clientLimit, 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (city && NYC_ALIASES.includes(city.toLowerCase())) {
      city = 'New York';
    }

    let events: any[] = [];

    if (source === 'partner') {
      // ── Partner-only mode (for partner dashboard) ──
      let query = `
        SELECT 
          pe.id,
          pe.title as name,
          pe.description,
          pe.event_date as date,
          pe.event_time as time,
          pe.genre,
          pe.image_url,
          pe.packages,
          pe.guest_list_enabled,
          pe.guest_list_price,
          pe.slug,
          pe.boost_level,
          COALESCE(pe.venue_name_cache, pv.name) as venue_name,
          COALESCE(pv.address, '') as venue_address,
          COALESCE(pe.city, pv.city, '') as city,
          p.id as partner_id,
          p.business_name as partner_name,
          p.instagram_handle as partner_instagram,
          p.profile_picture as partner_photo,
          1 as hasBookingOptions,
          'partner' as source
        FROM partner_events pe
        LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
        LEFT JOIN partners p ON pe.partner_id = p.id
        WHERE pe.status = 'published'
          AND pe.event_date >= date('now')
          AND pe.is_demo = 0
      `;
      const params: any[] = [];

      if (genre) { query += ` AND LOWER(pe.genre) LIKE ?`; params.push(`%${genre.toLowerCase()}%`); }
      if (city) { query += ` AND (LOWER(COALESCE(pe.city, pv.city, '')) LIKE ?)`; params.push(`%${city.toLowerCase()}%`); }
      if (search) { query += ` AND (LOWER(pe.title) LIKE ? OR LOWER(COALESCE(pe.venue_name_cache, pv.name, '')) LIKE ?)`; params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }

      query += ` ORDER BY pe.event_date ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      events = db.prepare(query).all(...params);

    } else {
      // ── Default mode: UNION partner + scraped, partner wins ──
      
      // Step 1: Get partner events (authoritative)
      let partnerQuery = `
        SELECT 
          pe.id,
          pe.title as name,
          pe.description,
          pe.event_date as date,
          pe.event_time as time,
          pe.genre as music_genre,
          pe.image_url,
          pe.packages,
          pe.guest_list_enabled,
          pe.guest_list_price,
          pe.slug,
          pe.boost_level,
          pe.event_fingerprint,
          pe.lineup,
          pe.door_time,
          pe.dress_code,
          pe.age_restriction,
          NULL as ticket_url,
          COALESCE(pe.venue_name_cache, pv.name) as venue_name,
          COALESCE(pv.address, '') as venue_address,
          COALESCE(pe.city, pv.city, '') as city,
          pe.venue_id,
          p.id as partner_id,
          p.business_name as partner_name,
          p.instagram_handle as partner_instagram,
          p.profile_picture as partner_photo,
          1 as hasBookingOptions,
          'partner' as source,
          NULL as crowd_type,
          NULL as peak_hours,
          NULL as why_recommended
        FROM partner_events pe
        LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
        LEFT JOIN partners p ON pe.partner_id = p.id
        WHERE pe.status = 'published'
          AND pe.on_explore = 1
          AND pe.is_demo = 0
          AND pe.event_date >= date('now')
      `;
      const partnerParams: any[] = [];

      if (genre) { partnerQuery += ` AND LOWER(pe.genre) LIKE ?`; partnerParams.push(`%${genre.toLowerCase()}%`); }
      if (city) { partnerQuery += ` AND (LOWER(COALESCE(pe.city, pv.city, '')) LIKE ?)`; partnerParams.push(`%${city.toLowerCase()}%`); }
      if (search) { partnerQuery += ` AND (LOWER(pe.title) LIKE ? OR LOWER(COALESCE(pe.venue_name_cache, pv.name, '')) LIKE ?)`; partnerParams.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }

      const partnerEventsSingle = db.prepare(partnerQuery).all(...partnerParams);

      // ── Expand recurring events into virtual instances ──
      const recurringInstances = expandRecurringEvents(db, { city: city || undefined, genre: genre || undefined, search: search || undefined });
      const partnerEvents = [...partnerEventsSingle, ...recurringInstances];

      // Collect partner fingerprints to exclude from scraped
      const partnerFingerprints = new Set(
        partnerEvents
          .map((e: any) => e.event_fingerprint)
          .filter(Boolean)
      );

      // Step 2: Get scraped events (exclude shadows + partner duplicates)
      let scrapedQuery = `
        SELECT 
          e.id,
          e.name,
          e.description,
          e.date,
          e.time,
          e.music_genre,
          e.image_url,
          NULL as packages,
          0 as guest_list_enabled,
          0 as guest_list_price,
          e.slug,
          0 as boost_level,
          e.event_fingerprint,
          e.lineup,
          e.door_time,
          e.dress_code,
          e.age_restriction,
          e.ticket_url,
          e.venue_name,
          '' as venue_address,
          e.city,
          e.venue_id,
          NULL as partner_id,
          e.promoter_name as partner_name,
          e.promoter_handle as partner_instagram,
          NULL as partner_photo,
          CASE WHEN pe_link.id IS NOT NULL THEN 1 ELSE 0 END as hasBookingOptions,
          CASE WHEN pe_link.id IS NOT NULL THEN 'partner' ELSE 'scraped' END as source,
          e.crowd_type,
          e.peak_hours,
          e.why_recommended
        FROM events e
        LEFT JOIN partner_events pe_link ON e.partner_event_id = pe_link.id
        WHERE e.date >= date('now')
          AND e.is_shadow = 0
      `;
      const scrapedParams: any[] = [];

      if (genre) { scrapedQuery += ` AND LOWER(e.music_genre) LIKE ?`; scrapedParams.push(`%${genre.toLowerCase()}%`); }
      if (city) { scrapedQuery += ` AND LOWER(e.city) LIKE ?`; scrapedParams.push(`%${city.toLowerCase()}%`); }
      if (search) { scrapedQuery += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.venue_name) LIKE ?)`; scrapedParams.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }

      let scrapedEvents = db.prepare(scrapedQuery).all(...scrapedParams);

      // Filter out any scraped events whose fingerprint matches a partner event
      if (partnerFingerprints.size > 0) {
        scrapedEvents = scrapedEvents.filter((e: any) => 
          !e.event_fingerprint || !partnerFingerprints.has(e.event_fingerprint)
        );
      }

      // Step 3: Merge — partner events first (boosted), then scraped by date
      const boosted = partnerEvents.filter((e: any) => e.boost_level > 0);
      const normalPartner = partnerEvents.filter((e: any) => !e.boost_level);

      // Sort: boosted first, then all by date
      events = [
        ...boosted.sort((a: any, b: any) => b.boost_level - a.boost_level),
        ...([...normalPartner, ...scrapedEvents].sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        }))
      ].slice(offset, offset + limit);
    }

    // Normalize output
    events = events.map(event => ({
      ...event,
      music_genre: event.music_genre || event.genre,
      image_url: event.image_url && event.image_url.startsWith('/')
        ? 'https://lumina.viberyte.com' + event.image_url
        : event.image_url,
      packages: typeof event.packages === 'string' ? JSON.parse(event.packages) : event.packages || null,
      hasBookingOptions: !!event.hasBookingOptions,
    }));

    return NextResponse.json({
      events,
      count: events.length,
      offset,
      limit
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    db.close();
  }
}
