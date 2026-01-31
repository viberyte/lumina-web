import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Database from 'better-sqlite3';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const CATEGORY_MAP: Record<string, string[]> = {
  restaurant: ['restaurant', 'dining'],
  lounge: ['lounge', 'bar', 'cocktail_bar', 'wine_bar', 'rooftop', 'speakeasy'],
  club: ['club', 'night_club', 'nightclub'],
};

const MUSIC_MAP: Record<string, string[]> = {
  'hip-hop': ['hip-hop', 'hiphop', 'rap', 'rnb', 'r&b'],
  'house': ['house', 'techno', 'electronic', 'edm'],
  'afrobeats': ['afrobeats', 'afro', 'amapiano'],
  'latin': ['latin', 'reggaeton', 'salsa', 'bachata'],
  'live': ['live', 'jazz', 'acoustic'],
  'top40': ['top40', 'pop', 'hits'],
};

const CITY_FLOWS: Record<string, string[][]> = {
  'Manhattan': [['Manhattan', 'Manhattan', 'Brooklyn'], ['Manhattan', 'Brooklyn', 'Brooklyn']],
  'Brooklyn': [['Brooklyn', 'Brooklyn', 'Manhattan'], ['Brooklyn', 'Manhattan', 'Manhattan']],
  'North Jersey': [['North Jersey', 'Manhattan', 'Manhattan'], ['North Jersey', 'North Jersey', 'Manhattan']],
};

function getCityFlow(city: string, travelMode: string, stops: number): string[] {
  if (travelMode === 'local') return Array(stops).fill(city);
  if (travelMode === 'city-hop') {
    const flows = CITY_FLOWS[city] || [[city, 'Manhattan', 'Manhattan']];
    return flows[Math.floor(Math.random() * flows.length)].slice(0, stops);
  }
  return Array(stops).fill(null);
}

function getStopTimes(startTime: string | null, stops: number): string[] {
  if (!startTime) return ['7:30 PM', '9:30 PM', '11:30 PM'].slice(0, stops);
  const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return ['7:30 PM', '9:30 PM', '11:30 PM'].slice(0, stops);
  let hour = parseInt(match[1]);
  const mins = match[2];
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  const times: string[] = [];
  for (let i = 0; i < stops; i++) {
    const h = hour + (i * 2);
    const displayH = h > 12 ? h - 12 : h;
    const suffix = h >= 12 && h < 24 ? 'PM' : 'AM';
    times.push(`${displayH}:${mins} ${suffix}`);
  }
  return times;
}

function getPhotoUrl(venue: any): string | null {
  if (venue.google_photos) {
    try {
      const photos = JSON.parse(venue.google_photos);
      if (Array.isArray(photos) && photos.length > 0) return photos[0];
    } catch {}
  }
  return venue.professional_photo_url || venue.image_url || null;
}

function getVenues(db: any, category: string, context: any, targetCity: string | null, limit: number, usedIds: Set<number>): any[] {
  const { cuisine, occasion, mood, musicPreference, venueType } = context;
  
  const params: any[] = [];
  const conditions: string[] = ['should_exclude = 0'];
  
  // Category filter
  const cats = CATEGORY_MAP[category] || [category];
  conditions.push(`(${cats.map(() => 'LOWER(category) = ?').join(' OR ')})`);
  cats.forEach(c => params.push(c.toLowerCase()));
  
  // City filter
  if (targetCity) {
    conditions.push('city = ?');
    params.push(targetCity);
  }
  
  // Quality filter for nightlife
  if (category === 'lounge' || category === 'club') {
    conditions.push('(rating IS NULL OR rating >= 4.0)');
    conditions.push('(tiktok_score IS NULL OR tiktok_score >= 50)');
  }
  
  // Music preference filter
  if (musicPreference && category !== 'restaurant') {
    const musicKeys = MUSIC_MAP[musicPreference] || [musicPreference];
    const musicConditions = musicKeys.map(() => "LOWER(tiktok_tags) LIKE ?").join(' OR ');
    conditions.push(`(${musicConditions})`);
    musicKeys.forEach(m => params.push(`%music:${m}%`));
    console.log('🎵 FILTERING BY MUSIC:', musicPreference, '→', musicKeys);
  }
  
  // Venue type filter
  if (venueType && category !== 'restaurant') {
    conditions.push('LOWER(category) LIKE ?');
    params.push(`%${venueType}%`);
  }
  
  // Occasion filter
  if (occasion === 'date') {
    conditions.push("(LOWER(vibe_tags) LIKE '%romantic%' OR LOWER(vibe_tags) LIKE '%intimate%' OR LOWER(tiktok_tags) LIKE '%vibe:intimate%' OR LOWER(tiktok_tags) LIKE '%vibe:upscale%')");
  }
  
  // Mood filter
  if (mood === 'chill') {
    conditions.push("(LOWER(tiktok_tags) LIKE '%vibe:chill%' OR LOWER(vibe_tags) LIKE '%chill%')");
  } else if (mood === 'turnup') {
    conditions.push("(LOWER(tiktok_tags) LIKE '%vibe:turn-up%' OR LOWER(vibe_tags) LIKE '%energetic%')");
  }
  
  // Get today's best tag
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  
  const query = `
    SELECT *, 
      CASE WHEN LOWER(tiktok_tags) LIKE '%best:${today}%' THEN 1 ELSE 0 END as best_tonight,
      COALESCE(tiktok_score, 50) as score
    FROM venues 
    WHERE ${conditions.join(' AND ')}
    ORDER BY best_tonight DESC, score DESC, rating DESC
    LIMIT 30
  `;
  
  console.log('📊 QUERY:', query.replace(/\s+/g, ' ').substring(0, 200));
  
  let results = db.prepare(query).all(...params);
  
  // Fallback if too few results
  if (results.length < 2 && musicPreference) {
    console.log('⚠️ Too few results, expanding search...');
    const fallbackParams: any[] = [];
    const fallbackConds = ['should_exclude = 0', '(rating IS NULL OR rating >= 4.0)'];
    fallbackConds.push(`(${cats.map(() => 'LOWER(category) = ?').join(' OR ')})`);
    cats.forEach(c => fallbackParams.push(c.toLowerCase()));
    if (targetCity) {
      fallbackConds.push('city = ?');
      fallbackParams.push(targetCity);
    }
    const fallbackQuery = `SELECT *, COALESCE(tiktok_score, 50) as score FROM venues WHERE ${fallbackConds.join(' AND ')} ORDER BY score DESC, rating DESC LIMIT 20`;
    results = db.prepare(fallbackQuery).all(...fallbackParams);
  }
  
  // Filter out used venues
  results = results.filter(v => !usedIds.has(v.id));
  
  // Cuisine scoring for restaurants
  if (category === 'restaurant' && cuisine) {
    results = results.map(v => ({
      ...v,
      cuisineScore: v.cuisine_primary?.toLowerCase().includes(cuisine.toLowerCase()) ? 1 : 0
    }));
    results.sort((a, b) => b.cuisineScore - a.cuisineScore);
  }
  
  // Shuffle top results for variety
  const top = results.slice(0, 10).sort(() => Math.random() - 0.5);
  return top.slice(0, limit);
}

async function buildNightFlow(context: any, city: string) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    const { primaryChoice, maxStops = 2, travelMode = 'local', startTime, musicPreference, occasion } = context;
    
    console.log('🌙 Building night flow...');
    console.log('🎵 Music preference:', musicPreference);
    console.log('📍 Primary choice:', primaryChoice);
    console.log('🎯 Max stops:', maxStops);
    
    const cityFlow = getCityFlow(city, travelMode, maxStops);
    const stopTimes = getStopTimes(startTime, maxStops);
    
    console.log('📍 City flow:', cityFlow.join(' → '));
    console.log('⏰ Times:', stopTimes.join(' → '));
    
    const reasons: Record<string, Record<string, string>> = {
      date: { restaurant: 'Set the mood', lounge: 'Keep it intimate', club: 'End on a high note' },
      friends: { restaurant: 'Fuel up first', lounge: 'Get the vibes going', club: 'Turn up time' },
      default: { restaurant: 'Great start', lounge: 'Keep the momentum', club: 'Late night energy' },
    };
    const reasonMap = reasons[occasion as string] || reasons.default;
    
    // Build flow based on primary choice
    let categories: string[] = [];
    if (primaryChoice === 'dinner') {
      categories = ['restaurant', 'lounge', 'club'].slice(0, maxStops);
    } else if (primaryChoice === 'drinks') {
      categories = ['lounge', 'lounge', 'club'].slice(0, maxStops);
    } else if (primaryChoice === 'nightlife') {
      categories = ['lounge', 'club', 'club'].slice(0, maxStops);
    } else {
      categories = ['restaurant', 'lounge', 'club'].slice(0, maxStops);
    }
    
    const usedIds = new Set<number>();
    const timeline: any[] = [];
    
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const targetCity = cityFlow[i] || city;
      const time = stopTimes[i];
      
      const venues = getVenues(db, cat, context, targetCity, 3, usedIds);
      
      if (venues.length > 0) {
        const primary = venues[0];
        usedIds.add(primary.id);
        
        const photoUrl = getPhotoUrl(primary);
        const fullUrl = photoUrl?.startsWith('http') ? photoUrl : photoUrl ? `https://lumina.viberyte.com${photoUrl}` : null;
        
        const slot = {
          time,
          category: cat,
          primary: {
            id: String(primary.id),
            name: primary.name,
            category: primary.category,
            cuisine_primary: primary.cuisine_primary,
            address: primary.address,
            city: primary.city,
            rating: primary.rating,
            price_tier: primary.price_tier,
            vibe_tags: primary.vibe_tags,
            tiktok_tags: primary.tiktok_tags,
            image_url: fullUrl,
            professional_photo_url: fullUrl,
          },
          alternates: venues.slice(1, 3).map(v => {
            const pUrl = getPhotoUrl(v);
            const fUrl = pUrl?.startsWith('http') ? pUrl : pUrl ? `https://lumina.viberyte.com${pUrl}` : null;
            return {
              id: String(v.id),
              name: v.name,
              category: v.category,
              address: v.address,
              city: v.city,
              rating: v.rating,
              price_tier: v.price_tier,
              image_url: fUrl,
            };
          }),
          role: i === 0 ? 'safe' : i === 1 ? 'elevated' : 'wildcard',
          reason: reasonMap[cat] || 'Great pick',
        };
        
        timeline.push(slot);
      }
    }
    
    db.close();
    console.log('✅ Built timeline with', timeline.length, 'slots');
    return { timeline, meta: { cityFlow, stopTimes, travelMode } };
    
  } catch (e) {
    console.error('Error building flow:', e);
    db.close();
    return { timeline: [], meta: {} };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionContext = {}, city = 'Manhattan' } = body;
    
    // Fallback: extract music from message if not in sessionContext
    if (!sessionContext.musicPreference && message) {
      if (/hip.?hop|r&b/i.test(message)) sessionContext.musicPreference = 'hip-hop';
      else if (/afro|amapiano/i.test(message)) sessionContext.musicPreference = 'afrobeats';
      else if (/house|edm|techno|electronic/i.test(message)) sessionContext.musicPreference = 'house';
      else if (/latin|reggaeton/i.test(message)) sessionContext.musicPreference = 'latin';
      else if (/live|jazz/i.test(message)) sessionContext.musicPreference = 'live';
    }
    
    // Fallback: extract music from message if not in sessionContext
    if (!sessionContext.musicPreference && message) {
      if (/hip.?hop|r&b/i.test(message)) sessionContext.musicPreference = 'hip-hop';
      else if (/afro|amapiano/i.test(message)) sessionContext.musicPreference = 'afrobeats';
      else if (/house|edm|techno|electronic/i.test(message)) sessionContext.musicPreference = 'house';
      else if (/latin|reggaeton/i.test(message)) sessionContext.musicPreference = 'latin';
      else if (/live|jazz/i.test(message)) sessionContext.musicPreference = 'live';
    }
    
    console.log('📨 Request:', { 
      message, 
      city, 
      primaryChoice: sessionContext?.primaryChoice,
      musicPreference: sessionContext?.musicPreference,
      venueType: sessionContext?.venueType,
      maxStops: sessionContext?.maxStops,
    });
    
    if (sessionContext?.primaryChoice) {
      console.log('⚡ FAST-TRACK with context:', JSON.stringify(sessionContext, null, 2));
      
      const results = await buildNightFlow(sessionContext, city);
      
      if (!results.timeline || results.timeline.length === 0) {
        return Response.json({
          response: "No spots match your vibe right now. Try different filters?",
          multiStop: null,
          timeline: [],
          status: 'NO_RESULTS',
        }, { headers: corsHeaders });
      }
      
      const timeline = results.timeline.map(slot => ({
        ...slot,
        travelTime: '~10 min',
      }));
      
      const multiStop = {
        safe: timeline.filter(s => s.role === 'safe').map(s => ({ ...s.primary, role: 'safe', ai_reasoning: s.reason, time: s.time })),
        elevated: timeline.filter(s => s.role === 'elevated').map(s => ({ ...s.primary, role: 'elevated', ai_reasoning: s.reason, time: s.time })),
        wildcard: timeline.filter(s => s.role === 'wildcard').map(s => ({ ...s.primary, role: 'wildcard', ai_reasoning: s.reason, time: s.time })),
        meta: results.meta,
      };
      
      let responseText = `Locked in ${timeline.length} stop${timeline.length > 1 ? 's' : ''}`;
      if (sessionContext.musicPreference) {
        responseText += ` with ${sessionContext.musicPreference} vibes`;
      }
      responseText += '! 💜';
      
      console.log('🚀 SENDING:', { slots: timeline.length, musicPreference: sessionContext.musicPreference });
      
      return Response.json({
        response: responseText,
        timeline,
        multiStop,
        meta: results.meta,
        status: 'COMPLETE',
      }, { headers: corsHeaders });
    }
    
    // Chat mode
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are Lumina, a warm nightlife expert for ${city}. Keep responses under 3 sentences. One emoji max.` },
        { role: 'user', content: message },
      ],
    });
    
    return Response.json({
      response: completion.choices[0].message.content,
      status: 'CONVERSATION',
    }, { headers: corsHeaders });
    
  } catch (err) {
    console.error('Server error:', err);
    return Response.json({ error: 'Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// Get events matching date and music preference
function getMatchingEvents(db: any, date: string, musicPreference: string | null, city: string, limit: number = 5): any[] {
  const params: any[] = [];
  const conditions: string[] = ['event_date = ?'];
  params.push(date);
  
  if (city) {
    conditions.push('(city = ? OR city = ?)');
    params.push(city, 'New York');
  }
  
  // Music genre mapping
  if (musicPreference) {
    const genreMap: Record<string, string[]> = {
      'hip-hop': ['Hip-Hop', 'R&B'],
      'afrobeats': ['Afrobeats'],
      'house': ['House', 'Electronic', 'EDM'],
      'latin': ['Latin', 'Reggaeton'],
      'live': ['Jazz', 'Live'],
    };
    const genres = genreMap[musicPreference] || [];
    if (genres.length > 0) {
      conditions.push(`(${genres.map(() => 'music_genre = ?').join(' OR ')})`);
      genres.forEach(g => params.push(g));
    }
  }
  
  const query = `
    SELECT name, venue_name, date, time, music_genre, ticket_url, image_url, city
    FROM events 
    WHERE ${conditions.join(' AND ')}
    ORDER BY confidence_score DESC
    LIMIT ?
  `;
  params.push(limit);
  
  try {
    return db.prepare(query).all(...params);
  } catch (e) {
    console.error('Event query error:', e);
    return [];
  }
}
