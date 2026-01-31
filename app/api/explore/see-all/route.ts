import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'lumina.db');
const BASE_URL = 'https://lumina.viberyte.com';

// Lounge subgroups based on AI-enriched lounge_type and special_features
const LOUNGE_SUBGROUPS = {
  'upscale-lounges': {
    title: 'Upscale Lounges',
    subtitle: 'Elegant & sophisticated',
    sql: `lounge_type = 'upscale-lounge' OR lounge_type LIKE '%upscale%lounge%'`,
  },
  'hookah-lounges': {
    title: 'Hookah Lounges',
    subtitle: 'Shisha & chill vibes',
    sql: `lounge_type LIKE '%hookah%' OR special_features LIKE '%"has_hookah":true%' OR name LIKE '%hookah%' OR name LIKE '%shisha%'`,
  },
  'cocktail-lounges': {
    title: 'Cocktail Lounges',
    subtitle: 'Craft cocktails & mixology',
    sql: `lounge_type = 'cocktail-lounge' OR lounge_type LIKE '%cocktail%'`,
  },
  'speakeasies': {
    title: 'Speakeasies',
    subtitle: 'Hidden gems & secret bars',
    sql: `lounge_type = 'speakeasy' OR lounge_type LIKE '%speakeasy%' OR vibe_tags LIKE '%speakeasy%' OR vibe_tags LIKE '%hidden%'`,
  },
  'rooftop-lounges': {
    title: 'Rooftop Lounges',
    subtitle: 'Views & outdoor vibes',
    sql: `lounge_type LIKE '%rooftop%' OR vibe_tags LIKE '%rooftop%' OR name LIKE '%rooftop%'`,
  },
  'wine-bars': {
    title: 'Wine Bars',
    subtitle: 'Wine selections & tastings',
    sql: `lounge_type = 'wine-bar' OR lounge_type LIKE '%wine%'`,
  },
  'jazz-lounges': {
    title: 'Jazz Lounges',
    subtitle: 'Live jazz & soul',
    sql: `lounge_type = 'jazz-lounge' OR lounge_type LIKE '%jazz%' OR music_genres LIKE '%jazz%'`,
  },
  'afrobeats-lounges': {
    title: 'Afrobeats Lounges',
    subtitle: 'Afrobeats & amapiano vibes',
    sql: `lounge_type = 'afrobeats-lounge' OR lounge_type LIKE '%afrobeats%' OR music_genres LIKE '%afrobeats%' OR music_genres LIKE '%amapiano%'`,
  },
  'sports-bars': {
    title: 'Sports Bars',
    subtitle: 'Games & big screens',
    sql: `lounge_type = 'sports-bar' OR lounge_type LIKE '%sports%' OR vibe_tags LIKE '%sports%'`,
  },
  'dive-bars': {
    title: 'Dive Bars',
    subtitle: 'Casual & local',
    sql: `lounge_type = 'dive-bar' OR lounge_type LIKE '%dive%'`,
  },
  'karaoke-bars': {
    title: 'Karaoke Bars',
    subtitle: 'Sing your heart out',
    sql: `lounge_type = 'karaoke-bar' OR lounge_type LIKE '%karaoke%' OR name LIKE '%karaoke%'`,
  },
  'cigar-lounges': {
    title: 'Cigar Lounges',
    subtitle: 'Premium cigars & whiskey',
    sql: `lounge_type = 'cigar-lounge' OR lounge_type LIKE '%cigar%' OR name LIKE '%cigar%'`,
  },
  'upscale-clubs': {
    title: 'Upscale Clubs',
    subtitle: 'VIP nightlife',
    sql: `lounge_type = 'upscale-club' OR (category IN ('club', 'nightclub') AND (lounge_type LIKE '%upscale%' OR price_tier IN ('$$$', '$$$$')))`,
  },
  'casual-lounges': {
    title: 'Casual Lounges',
    subtitle: 'Relaxed & chill',
    sql: `lounge_type = 'casual-lounge' OR lounge_type LIKE '%casual%'`,
  },
};

// Dining subgroups
const DINING_SUBGROUPS = {
  'date-night': {
    title: 'Date Night',
    subtitle: 'Romantic dining',
    sql: `first_date_suitable = 1 OR anniversary_suitable = 1 OR primary_vibes LIKE '%romantic%' OR vibe_tags LIKE '%romantic%'`,
  },
  'brunch-spots': {
    title: 'Brunch Spots',
    subtitle: 'Weekend vibes',
    sql: `brunch_spot = 1 OR good_for_brunch = 1 OR lounge_type = 'brunch-spot'`,
  },
  'upscale-dining': {
    title: 'Upscale Dining',
    subtitle: 'Fine dining',
    sql: `lounge_type LIKE '%upscale%dining%' OR price_tier IN ('$$$', '$$$$')`,
  },
  'late-night-eats': {
    title: 'Late Night Eats',
    subtitle: 'After hours food',
    sql: `late_night_spot = 1 OR after_hours_spot = 1`,
  },
};

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

function transformVenue(venue: any) {
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
    google_photos,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category')?.toLowerCase(); // 'lounges' or 'dining'
  const market = searchParams.get('market')?.toLowerCase();
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  try {
    const db = new Database(dbPath, { readonly: true });

    const subgroups = category === 'lounges' ? LOUNGE_SUBGROUPS :
                      category === 'dining' ? DINING_SUBGROUPS : null;

    if (!subgroups) {
      db.close();
      return NextResponse.json({ error: 'Invalid category. Use "lounges" or "dining"' }, { status: 400 });
    }

    // Build base WHERE clause
    let baseWhere = 'WHERE should_exclude = 0';
    const baseParams: any[] = [];

    // Add market filter
    if (market && MARKET_TO_CITIES[market]) {
      const cities = MARKET_TO_CITIES[market];
      const placeholders = cities.map(() => '?').join(',');
      baseWhere += ` AND city IN (${placeholders})`;
      baseParams.push(...cities);
    } else if (market) {
      baseWhere += ' AND (LOWER(city) = ? OR LOWER(city) LIKE ?)';
      baseParams.push(market, `%${market}%`);
    }

    // Add category filter
    if (category === 'lounges') {
      baseWhere += ` AND category IN ('nightlife', 'lounges', 'lounge', 'bar', 'club', 'nightclub')`;
    } else if (category === 'dining') {
      baseWhere += ` AND category IN ('dining', 'restaurant')`;
    }

    const results: Record<string, { title: string; subtitle: string; venues: any[] }> = {};

    // Fetch venues for each subgroup
    for (const [key, config] of Object.entries(subgroups)) {
      const query = `
        SELECT * FROM venues
        ${baseWhere} AND (${config.sql})
        ORDER BY
          CASE WHEN professional_photo_url IS NOT NULL THEN 0 ELSE 1 END,
          COALESCE(google_rating, rating, 0) DESC
        LIMIT ?
      `;

      const rawVenues = db.prepare(query).all(...baseParams, limit);
      const venues = rawVenues.map(transformVenue);

      if (venues.length > 0) {
        results[key] = {
          title: config.title,
          subtitle: config.subtitle,
          venues,
        };
      }
    }

    db.close();

    return NextResponse.json({
      category,
      market: market || 'all',
      subgroups: results,
      subgroup_count: Object.keys(results).length,
    });

  } catch (error) {
    console.error('Error fetching see-all data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
