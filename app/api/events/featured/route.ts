import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const db = new Database(DB_PATH);

  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || '';
    const limit = parseInt(searchParams.get('limit') || '15');

    let query = `
      SELECT 
        pe.id,
        pe.title as name,
        pe.description,
        pe.event_date as date,
        pe.event_time as time,
        pe.genre as music_genre,
        pe.image_url,
        pe.cover_image_url,
        pe.packages,
        pe.slug,
        pe.boost_level,
        pe.event_category,
        pe.is_recurring,
        pe.recurrence_days,
        COALESCE(pe.venue_name_cache, pv.name) as venue_name,
        COALESCE(pv.address, '') as venue_address,
        COALESCE(pe.city, pv.city, '') as city,
        pe.venue_id,
        p.id as partner_id,
        p.business_name as partner_name,
        p.instagram_handle as partner_instagram,
        p.profile_picture as partner_photo,
        p.tier as partner_tier,
        'partner' as source,
        1 as hasBookingOptions,
        1 as is_featured
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      LEFT JOIN partners p ON pe.partner_id = p.id
      WHERE pe.status = 'published'
        AND pe.on_explore = 1
        AND pe.is_demo = 0
        AND (pe.event_date >= date('now') OR pe.is_recurring = 1)
        AND (p.tier IN ('spotlight', 'elite') OR pe.boost_level > 0)
    `;
    const params: any[] = [];

    // NYC alias mapping
    const nycAliases = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'harlem', 'williamsburg', 'bushwick', 'astoria', 'soho', 'tribeca', 'chelsea'];
    let cityFilter = city.toLowerCase();
    if (nycAliases.includes(cityFilter) || cityFilter === 'nyc') {
      cityFilter = 'new york';
    }

    if (cityFilter) {
      query += ` AND (LOWER(COALESCE(pe.city, pv.city, '')) LIKE ?)`;
      params.push('%' + cityFilter + '%');
    }

    query += ` ORDER BY pe.boost_level DESC, pe.event_date ASC LIMIT ?`;
    params.push(limit);

    const events = db.prepare(query).all(...params);

    const normalized = events.map((e: any) => ({
      ...e,
      image_url: e.cover_image_url || e.image_url,
      packages: typeof e.packages === 'string' ? JSON.parse(e.packages || 'null') : e.packages,
      is_featured: true,
    }));

    return NextResponse.json({ events: normalized, count: normalized.length }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Featured events error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  } finally {
    db.close();
  }
}
