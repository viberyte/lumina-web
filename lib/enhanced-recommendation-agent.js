/**
 * ENHANCED RECOMMENDATION AGENT V4 - WITH AI SUMMARIES
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CITY_NEIGHBORHOOD_MAP = {
  "new york city": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "NYC", "New York", "New York City"],
  "nyc": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "NYC", "New York", "New York City"],
  "manhattan": ["Manhattan", "New York City", "NYC"],
  "brooklyn": ["Brooklyn", "New York City", "NYC"],
  "queens": ["Queens", "New York City", "NYC"],
  "miami": ["Miami", "South Beach", "Brickell", "Wynwood", "Miami Beach"],
  "new jersey": ["Newark", "Jersey City", "Hoboken", "NJ", "New Jersey", "North Jersey", "South Jersey", "Central Jersey"],
  "nj": ["Newark", "Jersey City", "Hoboken", "NJ", "New Jersey", "North Jersey", "South Jersey", "Central Jersey"],
  "newark": ["Newark", "NJ", "New Jersey"],
  "jersey city": ["Jersey City", "NJ", "New Jersey"],
  "hoboken": ["Hoboken", "NJ", "New Jersey"],
  "north jersey": ["Newark", "Jersey City", "Hoboken", "Paterson", "Elizabeth", "North Jersey", "NJ"],
  "central jersey": ["New Brunswick", "Edison", "Woodbridge", "Central Jersey", "NJ"],
  "south jersey": ["Camden", "Cherry Hill", "Atlantic City", "South Jersey", "NJ"]
};

const CITY_COORDINATES = {
  "new york city": { lat: 40.730610, lon: -73.935242 },
  "nyc": { lat: 40.730610, lon: -73.935242 },
  "manhattan": { lat: 40.758896, lon: -73.985130 },
  "brooklyn": { lat: 40.650002, lon: -73.949997 },
  "queens": { lat: 40.742054, lon: -73.769417 },
  "miami": { lat: 25.789106, lon: -80.226529 },
  "new jersey": { lat: 40.058324, lon: -74.405661 },
  "nj": { lat: 40.058324, lon: -74.405661 },
  "newark": { lat: 40.735657, lon: -74.172367 },
  "jersey city": { lat: 40.728157, lon: -74.077644 },
  "hoboken": { lat: 40.743992, lon: -74.028630 },
  "north jersey": { lat: 40.917577, lon: -74.171811 },
  "central jersey": { lat: 40.486427, lon: -74.451819 },
  "south jersey": { lat: 39.926947, lon: -75.144523 }
};

const DEFAULT_LIMIT = 4;

async function generateWhyPerfect(venue, userContext) {
  try {
    const prompt = `Generate brief 1-2 sentence "Why Perfect" summary.

Context: ${userContext.who || 'going out'} • ${userContext.vibe || 'dining'}
Venue: ${venue.name} - ${venue.category}
Tags: ${venue.vibe_tags}

Be specific, warm, mention details.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 80
    });

    return completion.choices[0].message.content?.trim() || 'Perfect for your vibe';
  } catch (error) {
    return 'Great spot for your vibe tonight';
  }
}

export async function getEnhancedRecommendations(userContext, dbPath) {
  const db = new Database(dbPath);
  
  const limit = userContext.limit || DEFAULT_LIMIT;
  const offset = userContext.offset || 0;
  const cityInput = userContext.city?.toLowerCase() || 'new york city';
  const centerCoords = CITY_COORDINATES[cityInput] || CITY_COORDINATES['nyc'];

  console.log(`\n🎯 Recommendations: ${userContext.city} | ${userContext.vibe} | Limit: ${limit}`);

  let venues = getVenues(db, userContext, 'strict', limit, offset, centerCoords);

  if (venues.length < limit) {
    venues = getVenues(db, userContext, 'relaxed', limit, offset, centerCoords);
  }

  db.close();

  // Generate AI summaries
  const venuesWithSummaries = await Promise.all(
    venues.slice(0, limit).map(async (venue) => {
      const whyPerfect = await generateWhyPerfect(venue, userContext);
      return { ...venue, whyPerfect };
    })
  );

  return {
    ok: true,
    venues: venuesWithSummaries,
    count: venuesWithSummaries.length,
    offset,
    hasMore: venues.length >= limit
  };
}

function getVenues(db, ctx, level, limit, offset, centerCoords) {
  const params = [];
  const conditions = [];
  
  const cityInput = ctx.city?.toLowerCase() || 'new york city';
  let searchCities = CITY_NEIGHBORHOOD_MAP[cityInput] || [ctx.city];
  
  if (['manhattan', 'brooklyn', 'queens', 'bronx'].includes(cityInput)) {
    searchCities = [...new Set([...searchCities, 'New York City', 'NYC'])];
  }

  const cityPlaceholders = searchCities.map(() => '?').join(',');
  conditions.push(`city IN (${cityPlaceholders})`);
  params.push(...searchCities);

  conditions.push(`(viberyte_certified = 1 OR viberyte_score >= 7)`);
  conditions.push(`should_exclude = 0`);

  if (ctx.vibe) {
    const vibeMap = {
      'Dinner': 'dining',
      'Lounge': 'lounge',
      'Nightclub': 'nightlife',
      'Brunch': 'dining',
      'Bar': 'bar'
    };
    const category = vibeMap[ctx.vibe] || ctx.vibe.toLowerCase();
    conditions.push(`(category LIKE ? OR standardized_category LIKE ?)`);
    params.push(`%${category}%`, `%${category}%`);
  }

  if (ctx.cuisine && level === 'strict') {
    conditions.push(`(cuisine_types LIKE ? OR cuisine_primary LIKE ?)`);
    params.push(`%${ctx.cuisine}%`, `%${ctx.cuisine}%`);
  }

  if (ctx.musicGenre && level === 'strict') {
    conditions.push(`music_genres_normalized LIKE ?`);
    params.push(`%${ctx.musicGenre.toLowerCase()}%`);
  }

  const sql = `
    SELECT 
      id, name, neighborhood, city, address, latitude, longitude,
      category, standardized_category, business_type, professional_photo_url as photo_url,
      cuisine, cuisine_types, cuisine_primary,
      music_genres, music_genres_normalized,
      vibe_tags, mood_tags, context_tags, dress_code, vibe_intensity,
      price_tier, google_rating, yelp_rating,
      website, instagram_handle, phone,
      description, bio,
      professional_photos, yelp_photos_json,
      viberyte_certified, viberyte_score
    FROM venues
    WHERE ${conditions.join(' AND ')}
    ORDER BY RANDOM(), viberyte_score DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit * 2, offset);
  
  try {
    const rawVenues = db.prepare(sql).all(...params);
    
    return rawVenues.map(v => {
      let photos = [];
      
      // 1. Try professional_photos first
      if (v.professional_photos) {
        if (typeof v.professional_photos === 'string' && !v.professional_photos.startsWith('[')) {
          // Plain URL string
          photos = [v.professional_photos];
        } else {
          // JSON array
          try {
            const parsed = typeof v.professional_photos === 'string'
              ? JSON.parse(v.professional_photos)
              : v.professional_photos;
            if (Array.isArray(parsed)) photos = parsed;
          } catch (e) {}
        }
      }
      
      // 2. Fallback to yelp photos
      if (photos.length === 0 && v.yelp_photos_json) {
        try {
          const parsed = JSON.parse(v.yelp_photos_json);
          if (Array.isArray(parsed)) photos = parsed;
        } catch (e) {}
      }
      
      // 3. Fallback to placeholder
      if (photos.length === 0) {
        photos = ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'];
      }
      
      return {
        id: v.id,
        name: v.name,
        neighborhood: v.neighborhood,
        city: v.city,
        address: v.address,
        latitude: v.latitude,
        photo_url: v.photo_url,
        longitude: v.longitude,
        category: v.category,
        standardized_category: v.standardized_category,
        business_type: v.business_type,
        cuisine: v.cuisine,
        cuisine_types: v.cuisine_types,
        cuisine_primary: v.cuisine_primary,
        music_genres: v.music_genres,
        music_genres_normalized: v.music_genres_normalized,
        vibe_tags: v.vibe_tags,
        mood_tags: v.mood_tags,
        context_tags: v.context_tags,
        dress_code: v.dress_code,
        vibe_intensity: v.vibe_intensity,
        price_tier: v.price_tier,
        google_rating: v.google_rating,
        yelp_rating: v.yelp_rating,
        website: v.website,
        instagram_handle: v.instagram_handle,
        phone: v.phone,
        description: v.description,
        bio: v.bio,
        viberyte_certified: v.viberyte_certified,
        viberyte_score: v.viberyte_score,
        photos: photos.slice(0, 5)
      };
    });
    
  } catch (error) {
    console.error('Query error:', error.message);
    return [];
  }
}
