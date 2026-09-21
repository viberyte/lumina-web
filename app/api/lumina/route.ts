import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_PATH || '/opt/viberyte/lumina-web/data/lumina.db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, flow, preferences, refresh } = body;

    console.log('Viberyte API received:', { city, flow, preferences });

    const db = new Database(dbPath);
    
    const topPicks = getTopPicks(db, city, flow, preferences);
    const afterDinner = getAfterDinnerVenues(db, city, flow, preferences);
    const events = getEvents(db, city, flow);

    db.close();

    return NextResponse.json({
      topPicks,
      afterDinner,
      events,
      message: topPicks.length > 0 
        ? `Found ${topPicks.length} spots perfect for your vibe` 
        : 'No venues found for your criteria'
    });

  } catch (error: any) {
    console.error('Viberyte API error:', error);
    return NextResponse.json({ 
      error: error.message,
      topPicks: [],
      afterDinner: [],
      events: []
    }, { status: 500 });
  }
}

function getTopPicks(db: any, city: string, flow: any, preferences: any) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (city) {
    const cityLower = city.toLowerCase();
    if (['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'].includes(cityLower)) {
      conditions.push('(city LIKE ? OR neighborhood LIKE ?)');
      params.push('%New York%', `%${city}%`);
    } else {
      conditions.push('city LIKE ?');
      params.push(`%${city}%`);
    }
  }

  if (flow?.vibe === 'Dinner' && flow?.cuisine && flow.cuisine !== 'Surprise Me') {
    conditions.push('(cuisine LIKE ? OR cuisine_primary LIKE ?)');
    params.push(`%${flow.cuisine}%`, `%${flow.cuisine}%`);
  }

  if (flow?.vibe === 'Dinner' || flow?.planType === 'Just dinner') {
    conditions.push("(category LIKE '%dining%' OR category LIKE '%restaurant%')");
  } else if (flow?.vibe === 'Nightlife') {
    conditions.push("(category LIKE '%nightlife%' OR category LIKE '%club%')");
  } else if (flow?.vibe === 'Lounge') {
    conditions.push("(category LIKE '%lounge%' OR category LIKE '%bar%')");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT id, name, neighborhood, city, cuisine, cuisine_primary,
           category, vibe_tags, rating, price_tier, bio,
           professional_photos, professional_photo_url,
           viberyte_score, address
    FROM venues
    ${whereClause}
    ORDER BY viberyte_score DESC, rating DESC
    LIMIT 12
  `;

  console.log('Top Picks Query:', query);
  console.log('Top Picks Params:', params);

  const venues = db.prepare(query).all(...params);
  console.log(`Loaded ${venues.length} top picks`);

  return venues;
}

function getAfterDinnerVenues(db: any, city: string, flow: any, preferences: any) {
  if (!flow?.afterDinner || flow.afterDinner === 'Call it a night') {
    return [];
  }

  const conditions: string[] = [];
  const params: any[] = [];

  if (city) {
    const cityLower = city.toLowerCase();
    if (['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'].includes(cityLower)) {
      conditions.push('(city LIKE ? OR neighborhood LIKE ?)');
      params.push('%New York%', `%${city}%`);
    } else {
      conditions.push('city LIKE ?');
      params.push(`%${city}%`);
    }
  }

  if (flow.afterDinner === 'Go to a lounge') {
    conditions.push("(category LIKE '%lounge%' OR category LIKE '%bar%' OR category LIKE '%cocktail%')");
  } else if (flow.afterDinner === 'Find a club') {
    conditions.push("(category LIKE '%nightlife%' OR category LIKE '%club%' OR category LIKE '%night_club%')");
  } else if (flow.afterDinner === 'Keep it light') {
    conditions.push("(category LIKE '%bar%' OR category LIKE '%wine bar%' OR vibe_tags LIKE '%chill%')");
  }

  if (flow?.musicPreference && flow.musicPreference !== "Doesn't Matter") {
    const musicLower = flow.musicPreference.toLowerCase().replace(/\s+/g, '').replace('/', '');
    conditions.push("(music_genres_normalized LIKE ? OR vibe_tags LIKE ? OR bio LIKE ?)");
    params.push(`%${musicLower}%`, `%${flow.musicPreference}%`, `%${flow.musicPreference}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT id, name, neighborhood, city, cuisine, cuisine_primary,
           category, vibe_tags, rating, price_tier, bio,
           professional_photos, professional_photo_url,
           viberyte_score, address, music_genres_normalized
    FROM venues
    ${whereClause}
    ORDER BY viberyte_score DESC, rating DESC
    LIMIT 10
  `;

  console.log('After Dinner Query:', query);
  console.log('After Dinner Params:', params);

  const venues = db.prepare(query).all(...params);
  console.log(`Loaded ${venues.length} after-dinner venues`);

  return venues;
}

function getEvents(db: any, city: string, flow: any) {
  const conditions: string[] = ["start_datetime >= datetime('now')"];
  const params: any[] = [];

  // Filter by music preference
  if (flow?.musicPreference && flow.musicPreference !== "Doesn't Matter") {
    const musicLower = flow.musicPreference.toLowerCase().replace(/\s+/g, '').replace('/', '');
    conditions.push("(LOWER(REPLACE(music_genre, ' ', '')) LIKE ? OR LOWER(REPLACE(music_genre, '/', '')) LIKE ?)");
    params.push(`%${musicLower}%`, `%${flow.musicPreference.toLowerCase()}%`);
  }

  // Date filtering based on "when"
  if (flow?.when === 'Tonight') {
    conditions.push("DATE(start_datetime) = DATE('now')");
  } else if (flow?.when === 'Tomorrow') {
    conditions.push("DATE(start_datetime) = DATE('now', '+1 day')");
  } else if (flow?.when === 'This Weekend') {
    conditions.push("DATE(start_datetime) BETWEEN DATE('now') AND DATE('now', '+7 days')");
    conditions.push("(CAST(strftime('%w', start_datetime) AS INTEGER) IN (5, 6, 0))");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT id, name, venue_id, start_datetime, end_datetime,
           description, music_genre, price, image_url, venue_name
    FROM events
    ${whereClause}
    ORDER BY start_datetime ASC
    LIMIT 20
  `;

  console.log('Events Query:', query);
  console.log('Events Params:', params);

  let events = db.prepare(query).all(...params);
  console.log(`Loaded ${events.length} events`);

  // Fallback: if no events for exact date, get upcoming events
  if (events.length === 0 && flow?.musicPreference) {
    const fallbackConditions = ["start_datetime >= datetime('now')"];
    const fallbackParams: any[] = [];

    const musicLower = flow.musicPreference.toLowerCase().replace(/\s+/g, '').replace('/', '');
    fallbackConditions.push("(LOWER(REPLACE(music_genre, ' ', '')) LIKE ? OR LOWER(REPLACE(music_genre, '/', '')) LIKE ?)");
    fallbackParams.push(`%${musicLower}%`, `%${flow.musicPreference.toLowerCase()}%`);

    const fallbackQuery = `
      SELECT id, name, venue_id, start_datetime, end_datetime,
             description, music_genre, price, image_url, venue_name
      FROM events
      WHERE ${fallbackConditions.join(' AND ')}
      ORDER BY start_datetime ASC
      LIMIT 10
    `;

    console.log('Fallback Events Query:', fallbackQuery);
    events = db.prepare(fallbackQuery).all(...fallbackParams);
    console.log(`Loaded ${events.length} fallback events`);
  }

  return events;
}
