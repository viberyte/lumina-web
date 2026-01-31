import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// NYC neighborhood aliases
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
    const limit = Math.max(clientLimit, 500); // Force minimum 500
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Normalize NYC neighborhoods to "New York"
    if (city && NYC_ALIASES.includes(city.toLowerCase())) {
      city = 'New York';
    }
    
    let events: any[] = [];
    
    if (source === 'partner') {
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
          pv.name as venue_name,
          pv.address as venue_address,
          pv.city,
          p.id as partner_id,
          p.business_name as partner_name,
          p.instagram_handle as partner_instagram,
          1 as hasBookingOptions,
          'partner' as source
        FROM partner_events pe
        LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
        LEFT JOIN partners p ON pe.partner_id = p.id
        WHERE pe.status = 'published'
          AND pe.event_date >= date('now')
      `;
      
      const params: any[] = [];
      
      if (genre) {
        query += ` AND LOWER(pe.genre) LIKE ?`;
        params.push(`%${genre.toLowerCase()}%`);
      }
      
      if (city) {
        query += ` AND LOWER(pv.city) LIKE ?`;
        params.push(`%${city.toLowerCase()}%`);
      }
      
      if (search) {
        query += ` AND (LOWER(pe.title) LIKE ? OR LOWER(pv.name) LIKE ?)`;
        params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      }
      
      query += ` ORDER BY pe.event_date ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      events = db.prepare(query).all(...params);
      
    } else {
      let query = `
        SELECT 
          e.id,
          e.name,
          e.description,
          e.date,
          e.time,
          e.music_genre as genre,
          e.image_url,
          e.ticket_url,
          e.venue_id,
          e.venue_name,
          e.city,
          e.lineup,
          e.why_go as why_recommended,
          e.crowd_type,
          e.peak_hours,
          e.partner_event_id,
          CASE WHEN pe.id IS NOT NULL THEN 1 ELSE 0 END as hasBookingOptions,
          CASE WHEN pe.id IS NOT NULL THEN 'partner' ELSE 'scraped' END as source,
          pe.packages,
          p.id as partner_id,
          p.business_name as partner_name,
          p.instagram_handle as partner_instagram
        FROM events e
        LEFT JOIN partner_events pe ON e.partner_event_id = pe.id
        LEFT JOIN partners p ON pe.partner_id = p.id
        WHERE e.date >= date('now')
      `;
      
      const params: any[] = [];
      
      if (genre) {
        query += ` AND LOWER(e.music_genre) LIKE ?`;
        params.push(`%${genre.toLowerCase()}%`);
      }
      
      if (city) {
        query += ` AND LOWER(e.city) LIKE ?`;
        params.push(`%${city.toLowerCase()}%`);
      }
      
      if (search) {
        query += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.venue_name) LIKE ?)`;
        params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      }
      
      query += ` ORDER BY e.date ASC, e.time ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      events = db.prepare(query).all(...params);
    }
    
    events = events.map(event => ({
      ...event,
      music_genre: event.genre,
      image_url: event.image_url && event.image_url.startsWith('/') ? 'https://lumina.viberyte.com' + event.image_url : event.image_url,
      packages: event.packages ? JSON.parse(event.packages) : null,
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
