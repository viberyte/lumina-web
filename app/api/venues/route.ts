import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'lumina.db');

// Market to city mapping
const MARKET_TO_CITIES: Record<string, string[]> = {
  'manhattan': ['Manhattan', 'New York'],
  'brooklyn': ['Brooklyn'],
  'queens': ['Queens'],
  'the bronx': ['The Bronx'],
  'bronx': ['The Bronx'],
  'staten island': ['Staten Island'],
  'new jersey': ['North Jersey', 'South Jersey', 'Newark', 'Jersey City'],
  'north jersey': ['North Jersey'],
  'south jersey': ['South Jersey'],
  'philadelphia': ['Philadelphia'],
  'philly': ['Philadelphia'],
  'washington dc': ['Washington', 'Washington D.C.', 'Washington, D.C.', 'Washington DC'],
  'dc': ['Washington', 'Washington D.C.', 'Washington, D.C.', 'Washington DC'],
  'baltimore': ['Baltimore'],
  'richmond': ['Richmond'],
  'norfolk': ['Norfolk'],
  'nyc': ['Manhattan', 'New York', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'],
  'new york city': ['Manhattan', 'New York', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'],
  'new york': ['Manhattan', 'New York', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'],
};

// Category to DB mapping
const CATEGORY_MAP: Record<string, string[]> = {
  'dining': ['restaurant'],
  'restaurant': ['restaurant'],
  'nightlife': ['lounge', 'bar', 'club', 'nightclub', 'live_music'],
  'lounge': ['lounge'],
  'bar': ['bar'],
  'club': ['club', 'nightclub'],
  'nightclub': ['club', 'nightclub'],
  'live_music': ['live_music'],
};

// === CATEGORY FILTERS - Server-side filtering for see-all pages ===
const CATEGORY_FILTERS: Record<string, { sql: string }> = {
  // Dining - Vibe Based
  'date-night': {
    sql: `AND (first_date_suitable = 1 OR anniversary_suitable = 1 OR primary_vibes LIKE '%romantic%' OR vibe_tags LIKE '%romantic%' OR vibe_tags LIKE '%intimate%')`,
  },
  'business': {
    sql: `AND (business_meeting_ok = 1 OR primary_vibes LIKE '%upscale%' OR vibe_tags LIKE '%business%' OR vibe_tags LIKE '%professional%')`,
  },
  'brunch': {
    sql: `AND (brunch_spot = 1 OR good_for_brunch = 1 OR primary_vibes LIKE '%brunch%' OR name LIKE '%brunch%')`,
  },
  'group': {
    sql: `AND (large_group_suitable = 1 OR primary_vibes LIKE '%group%' OR vibe_tags LIKE '%group%' OR vibe_tags LIKE '%family%')`,
  },
  'late-night-eats': {
    sql: `AND (late_night_spot = 1 OR primary_vibes LIKE '%late%' OR vibe_tags LIKE '%late night%')`,
  },
  'upscale-dining': {
    sql: `AND (primary_vibes LIKE '%upscale%' OR vibe_tags LIKE '%upscale%' OR vibe_tags LIKE '%fine dining%')`,
  },
  'casual': {
    sql: `AND (primary_vibes LIKE '%casual%' OR vibe_tags LIKE '%casual%')`,
  },
  'trending': {
    sql: `AND (google_rating >= 4.3 OR rating >= 4.3)`,
  },
  'top-rated': {
    sql: `AND (google_rating >= 4.5 OR rating >= 4.5)`,
  },
  
  // Nightlife
  'rooftop': {
    sql: `AND (lounge_type LIKE '%rooftop%' OR name LIKE '%rooftop%' OR primary_vibes LIKE '%rooftop%' OR vibe_tags LIKE '%rooftop%')`,
  },
  'chill-lounge': {
    sql: `AND (lounge_type IN ('casual', 'casual-lounge') OR primary_vibes LIKE '%chill%' OR primary_vibes LIKE '%relaxed%' OR vibe_tags LIKE '%chill%' OR vibe_tags LIKE '%relaxed%')`,
  },
  'upscale-club': {
    sql: `AND (lounge_type LIKE '%upscale%' OR primary_vibes LIKE '%upscale%' OR primary_vibes LIKE '%vip%' OR primary_vibes LIKE '%exclusive%')`,
  },
  'hookah': {
    sql: `AND (lounge_type LIKE '%hookah%' OR name LIKE '%hookah%' OR name LIKE '%shisha%')`,
  },
  'live-music': {
    sql: `AND (lounge_type LIKE '%live%' OR primary_vibes LIKE '%live music%' OR vibe_tags LIKE '%live music%' OR category = 'live_music')`,
  },
  'dance-club': {
    sql: `AND (category IN ('club', 'nightclub') OR lounge_type LIKE '%club%' OR primary_vibes LIKE '%dance%' OR vibe_tags LIKE '%dance%')`,
  },
  'speakeasy': {
    sql: `AND (lounge_type LIKE '%speakeasy%' OR name LIKE '%speakeasy%' OR vibe_tags LIKE '%speakeasy%' OR vibe_tags LIKE '%hidden%')`,
  },
  'late-night': {
    sql: `AND (late_night_spot = 1 OR lounge_type LIKE '%night%' OR primary_vibes LIKE '%late%' OR vibe_tags LIKE '%late night%' OR vibe_tags LIKE '%after hours%')`,
  },
  
  // Cuisine types
  'italian': { sql: `AND (cuisine_primary LIKE '%italian%' OR cuisine LIKE '%italian%')` },
  'asian': { sql: `AND (cuisine_primary LIKE '%asian%' OR cuisine_primary LIKE '%japanese%' OR cuisine_primary LIKE '%chinese%' OR cuisine_primary LIKE '%korean%' OR cuisine_primary LIKE '%thai%' OR cuisine_primary LIKE '%vietnamese%' OR cuisine_primary LIKE '%sushi%')` },
  'caribbean': { sql: `AND (cuisine_primary LIKE '%caribbean%' OR cuisine_primary LIKE '%jamaican%' OR cuisine_primary LIKE '%haitian%')` },
  'soul-food': { sql: `AND (cuisine_primary LIKE '%soul%' OR cuisine_primary LIKE '%southern%' OR cuisine_primary LIKE '%comfort%')` },
  'mexican': { sql: `AND (cuisine_primary LIKE '%mexican%' OR cuisine_primary LIKE '%tex-mex%')` },
  'seafood': { sql: `AND (cuisine_primary LIKE '%seafood%' OR cuisine_primary LIKE '%fish%' OR cuisine_primary LIKE '%oyster%')` },
  'steakhouse': { sql: `AND (cuisine_primary LIKE '%steak%' OR cuisine_primary LIKE '%chophouse%')` },
  'french': { sql: `AND (cuisine_primary LIKE '%french%' OR cuisine_primary LIKE '%bistro%')` },
  'mediterranean': { sql: `AND (cuisine_primary LIKE '%mediterranean%' OR cuisine_primary LIKE '%greek%' OR cuisine_primary LIKE '%turkish%' OR cuisine_primary LIKE '%lebanese%')` },
  'indian': { sql: `AND (cuisine_primary LIKE '%indian%' OR cuisine_primary LIKE '%pakistani%')` },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketRaw = searchParams.get('market') || searchParams.get('city');
  const limit = parseInt(searchParams.get('limit') || '50');
  const categoryRaw = searchParams.get('category');
  const filterRaw = searchParams.get('filter');
  
  // NEW: Accept cuisines and vibes as comma-separated lists
  const cuisinesRaw = searchParams.get('cuisines');
  const vibesRaw = searchParams.get('vibes');
  const typesRaw = searchParams.get('types'); // For nightlife lounge_type

  const market = marketRaw?.trim().toLowerCase();
  const category = categoryRaw?.trim().toLowerCase();
  const filter = filterRaw?.trim().toLowerCase();
  const cuisines = cuisinesRaw?.split(',').map(c => c.trim()).filter(Boolean);
  const vibes = vibesRaw?.split(',').map(v => v.trim()).filter(Boolean);
  const types = typesRaw?.split(',').map(t => t.trim()).filter(Boolean);

  try {
    const db = new Database(dbPath, { readonly: true });
    
    let query = 'SELECT * FROM venues WHERE should_exclude = 0';
    const params: any[] = [];

    // Market/City filter
    if (market && MARKET_TO_CITIES[market]) {
      const cities = MARKET_TO_CITIES[market];
      const placeholders = cities.map(() => '?').join(',');
      query += ` AND city IN (${placeholders})`;
      params.push(...cities);
    } else if (market) {
      query += ' AND (LOWER(city) = ? OR LOWER(city) LIKE ?)';
      params.push(market, `%${market}%`);
    }

    // Category filter (dining, nightlife, etc.)
    if (category) {
      const dbCategories = CATEGORY_MAP[category] || [categoryRaw];
      const placeholders = dbCategories.map(() => '?').join(',');
      query += ` AND category IN (${placeholders})`;
      params.push(...dbCategories);
    }

    // Specific category filter for see-all pages
    if (filter && CATEGORY_FILTERS[filter]) {
      query += ' ' + CATEGORY_FILTERS[filter].sql;
    }

    // === NEW: Cuisine filter (OR logic) ===
    if (cuisines && cuisines.length > 0) {
      const cuisineConditions = cuisines.map(() => 
        `(cuisine_primary LIKE ? OR cuisine LIKE ?)`
      ).join(' OR ');
      query += ` AND (${cuisineConditions})`;
      cuisines.forEach(c => {
        params.push(`%${c}%`, `%${c}%`);
      });
    }

    // === NEW: Vibe filter (OR logic) ===
    if (vibes && vibes.length > 0) {
      const vibeConditions = vibes.map(() => 
        `(primary_vibes LIKE ? OR vibe_tags LIKE ? OR secondary_vibes LIKE ?)`
      ).join(' OR ');
      query += ` AND (${vibeConditions})`;
      vibes.forEach(v => {
        params.push(`%${v}%`, `%${v}%`, `%${v}%`);
      });
    }

    // === NEW: Lounge type filter for nightlife (OR logic) ===
    if (types && types.length > 0) {
      const typeConditions = types.map(() => 
        `(lounge_type LIKE ? OR name LIKE ?)`
      ).join(' OR ');
      query += ` AND (${typeConditions})`;
      types.forEach(t => {
        params.push(`%${t}%`, `%${t}%`);
      });
    }

    // Quality filter (only if no specific filters applied)
    if (!filter && !cuisines?.length && !vibes?.length && !types?.length) {
      query += ' AND (google_rating >= 3.5 OR rating >= 3.5 OR google_rating IS NULL)';
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    const rawVenues = stmt.all(...params);

    db.close();

    // Transform image URLs to full URLs
    const BASE_URL = 'https://lumina.viberyte.com';
    const venues = rawVenues.map((venue: any) => {
      // Transform professional_photo_url
      let photo_url = null;
      if (venue.professional_photo_url) {
        photo_url = venue.professional_photo_url.startsWith('http')
          ? venue.professional_photo_url
          : `${BASE_URL}${venue.professional_photo_url}`;
      } else if (venue.image_url) {
        photo_url = venue.image_url.startsWith('http')
          ? venue.image_url
          : `${BASE_URL}${venue.image_url}`;
      }

      // Transform google_photos array
      let google_photos = null;
      if (venue.google_photos) {
        try {
          const photos = typeof venue.google_photos === 'string'
            ? JSON.parse(venue.google_photos)
            : venue.google_photos;
          if (Array.isArray(photos)) {
            google_photos = photos.map((p: string) =>
              p.startsWith('http') ? p : `${BASE_URL}${p}`
            );
          }
        } catch {}
      }

      return {
        ...venue,
        photo_url,
        professional_photo_url: photo_url,
        google_photos: google_photos ? JSON.stringify(google_photos) : venue.google_photos,
      };
    });

    return NextResponse.json({
      venues,
      market: marketRaw || 'All',
      filter: filter || null,
      cuisines: cuisines || [],
      vibes: vibes || [],
      types: types || [],
      count: venues.length
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch venues',
      venues: [] 
    }, { status: 500 });
  }
}
