import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const analyticsPath = '/opt/viberyte/lumina-web/data/search_analytics.jsonl';

// OpenAI config
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FINE_TUNED_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

// ============ ANALYTICS LOGGER ============
function logSearchAnalytics(data: any) {
  try {
    const line = JSON.stringify({ ...data, timestamp: new Date().toISOString() }) + '\n';
    fs.appendFileSync(analyticsPath, line);
  } catch (e) {}
}

// ============ AI INTENT PARSER ============
interface AIIntent {
  category: 'nightlife' | 'dining' | 'events' | 'general';
  venueType: string | null;
  vibe: string[];
  music: string[];
  cuisine: string | null;
  occasion: string | null;
  priceRange: 'budget' | 'moderate' | 'upscale' | null;
  energyLevel: 'low' | 'medium' | 'high' | null;
  features: string[];
  timeContext: string | null;
  reasoning: string;
  confidence: number;
  matchTags: string[];
}

async function parseWithAI(query: string): Promise<AIIntent | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const systemPrompt = `You are Viberyte's nightlife AI. Parse user search queries and extract structured intent.

Return JSON only:
{
  "category": "nightlife" | "dining" | "events" | "general",
  "venueType": "club" | "lounge" | "bar" | "rooftop" | "restaurant" | "speakeasy" | null,
  "vibe": ["chill", "upscale", "intimate", "lively", "trendy"],
  "music": ["afrobeats", "hip-hop", "latin", "house", "r&b", "jazz"],
  "cuisine": "italian" | "japanese" | "mexican" | "caribbean" | "soul food" | null,
  "occasion": "date_night" | "first_date" | "group_night" | "birthday" | "solo" | null,
  "priceRange": "budget" | "moderate" | "upscale" | null,
  "energyLevel": "low" | "medium" | "high" | null,
  "features": ["rooftop", "hookah", "live_music", "dj", "bottle_service", "outdoor"],
  "timeContext": "tonight" | "weekend" | "late_night" | "happy_hour" | null,
  "reasoning": "Conversational one-liner starting with 'Got it —'",
  "confidence": 0-100,
  "matchTags": ["key", "tags"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: FINE_TUNED_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    let jsonStr = content.includes('```') 
      ? content.replace(/```json?\n?/g, '').replace(/```/g, '').trim() 
      : content;
    
    const parsed = JSON.parse(jsonStr);
    console.log('🤖 AI Intent:', parsed.reasoning);
    return parsed as AIIntent;
  } catch (error) {
    console.error('AI parsing error:', error);
    return null;
  }
}

// ============ RULE-BASED FALLBACK ============
const SLANG_MAP: Record<string, string[]> = {
  'lit': ['high energy', 'lively', 'club', 'party'],
  'turnt': ['high energy', 'club', 'party'],
  'vibes': ['chill', 'lounge'],
  'bougie': ['upscale', 'fancy'],
  'boujee': ['upscale', 'fancy'],
  'chill': ['calm', 'relaxed', 'lounge', 'intimate'],
  'lowkey': ['intimate', 'quiet', 'speakeasy'],
  'poppin': ['popular', 'high energy'],
  'sexy': ['romantic', 'intimate', 'date night'],
  'fun': ['lively', 'energetic'],
  'wild': ['high energy', 'club', 'party'],
  'dope': ['trendy', 'cool'],
};

const VIBES = ['calm', 'romantic', 'chill', 'high energy', 'upscale', 'trendy', 'intimate', 'cozy', 'lively', 'vibrant', 'classy', 'bougie', 'fancy', 'lowkey', 'lit', 'sexy', 'sophisticated', 'hidden gem', 'exclusive'];
const MUSIC = ['house', 'afrobeats', 'hip hop', 'hip-hop', 'hiphop', 'latin', 'r&b', 'rnb', 'jazz', 'edm', 'reggaeton', 'amapiano', 'dancehall', 'techno', 'disco', 'soca', 'kompa', 'reggae', 'salsa', 'bachata'];
const FEATURES = ['hookah', 'byob', 'rooftop', 'outdoor', 'live music', 'dj', 'bottle service', 'speakeasy', 'private room', 'patio', 'karaoke'];
const CUISINE = ['italian', 'japanese', 'mexican', 'steakhouse', 'seafood', 'sushi', 'thai', 'chinese', 'korean', 'indian', 'mediterranean', 'french', 'american', 'caribbean', 'soul food', 'african', 'peruvian', 'spanish', 'ethiopian', 'jamaican', 'cuban', 'dominican', 'southern'];

function parseQueryFallback(query: string) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  
  let expandedTerms: string[] = [];
  words.forEach(word => {
    const cleanWord = word.replace(/[?!.,]/g, '');
    if (SLANG_MAP[cleanWord]) expandedTerms.push(...SLANG_MAP[cleanWord]);
  });
  
  const vibes = [...VIBES.filter(v => q.includes(v)), ...expandedTerms.filter(t => VIBES.some(v => t.includes(v)))];
  const music = MUSIC.filter(m => q.includes(m.replace('-', ' ')) || q.includes(m));
  const features = FEATURES.filter(f => q.includes(f));
  const cuisine = CUISINE.filter(c => q.includes(c));
  
  let occasion: string | null = null;
  if (/first date/.test(q)) occasion = 'first_date';
  else if (/date|romantic|anniversary|girlfriend|boyfriend|bae|impress/.test(q)) occasion = 'date_night';
  else if (/group|friends|squad|crew|birthday|party|celebration/.test(q)) occasion = 'group_night';
  else if (/solo|alone|myself/.test(q)) occasion = 'solo';
  
  let energyLevel: 'low' | 'high' | null = null;
  if (/chill|calm|quiet|intimate|relaxed|lowkey|cozy/.test(q)) energyLevel = 'low';
  if (/lit|turnt|wild|party|club|dance|loud|high energy|hype/.test(q)) energyLevel = 'high';
  
  let category: 'nightlife' | 'dining' | 'events' | 'general' = 'general';
  if (/eat|food|dinner|lunch|restaurant|hungry|brunch/.test(q)) category = 'dining';
  else if (/club|lounge|bar|dance|drinks|nightlife|rooftop/.test(q)) category = 'nightlife';
  else if (/event|concert|party|tonight|show/.test(q)) category = 'events';
  
  let venueType: string | null = null;
  if (/club/.test(q)) venueType = 'club';
  else if (/lounge/.test(q)) venueType = 'lounge';
  else if (/bar/.test(q)) venueType = 'bar';
  else if (/rooftop|roof/.test(q)) venueType = 'rooftop';
  else if (/restaurant/.test(q)) venueType = 'restaurant';
  
  let timeContext: string | null = null;
  if (/tonight|right now|later tonight/.test(q)) timeContext = 'tonight';
  else if (/weekend|friday|saturday/.test(q)) timeContext = 'weekend';
  else if (/late|after|2am|3am|still open/.test(q)) timeContext = 'late_night';
  else if (/happy hour/.test(q)) timeContext = 'happy_hour';
  
  let priceRange: 'budget' | 'upscale' | null = null;
  if (/cheap|budget|affordable/.test(q)) priceRange = 'budget';
  else if (/upscale|fancy|bougie|boujee|nice|expensive|vip/.test(q)) priceRange = 'upscale';
  
  // Generate reasoning
  let reasoning = 'Got it — searching for spots';
  const tags: string[] = [];
  const reasonParts: string[] = [];
  
  if (occasion === 'date_night') reasonParts.push('date night');
  else if (occasion === 'first_date') reasonParts.push('first date');
  else if (occasion === 'group_night') reasonParts.push('group outing');
  
  if (energyLevel === 'low') reasonParts.push('chill');
  else if (energyLevel === 'high') reasonParts.push('high energy');
  
  if (venueType) reasonParts.push(venueType);
  
  if (music.length > 0) {
    reasonParts.push(music[0].charAt(0).toUpperCase() + music[0].slice(1));
    tags.push(music[0].charAt(0).toUpperCase() + music[0].slice(1));
  }
  
  if (cuisine.length > 0) {
    reasonParts.push(cuisine[0] + ' food');
    tags.push(cuisine[0].charAt(0).toUpperCase() + cuisine[0].slice(1));
  }
  
  if (timeContext === 'late_night') {
    reasonParts.push('late night');
    tags.push('Late Night');
  }
  
  if (reasonParts.length > 0) {
    reasoning = `Got it — ${reasonParts.slice(0, 3).join(' ')} vibes`;
  }
  
  if (occasion) tags.push(occasion === 'date_night' ? 'Date Night' : occasion === 'group_night' ? 'Groups' : occasion);
  if (venueType) tags.push(venueType.charAt(0).toUpperCase() + venueType.slice(1));
  if (energyLevel === 'low') tags.push('Chill');
  if (energyLevel === 'high') tags.push('High Energy');
  
  const confidence = Math.min(
    (vibes.length * 10) + (music.length * 15) + (features.length * 10) + 
    (occasion ? 20 : 0) + (venueType ? 15 : 0) + (cuisine.length * 12),
    90
  );
  
  return {
    category, venueType,
    vibe: [...new Set(vibes)],
    music: [...new Set(music)],
    cuisine: cuisine[0] || null,
    occasion, priceRange, energyLevel, features, timeContext, reasoning,
    confidence: Math.max(confidence, 25),
    matchTags: [...new Set(tags)],
    expandedTerms: [...new Set(expandedTerms)],
    raw: query
  };
}

// ============ VENUE SCORING ============
function scoreVenue(venue: any, intent: any): { score: number; matchReasons: string[] } {
  let score = 0;
  const matchReasons: string[] = [];
  
  const haystack = [
    venue.vibe_tags, venue.primary_vibes, venue.music_genres, 
    venue.special_features, venue.cuisine_primary, venue.name, 
    venue.neighborhood, venue.category, venue.bio
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Venue type
  if (intent.venueType) {
    const cat = (venue.category || '').toLowerCase();
    if (cat.includes(intent.venueType) || haystack.includes(intent.venueType)) {
      score += 15;
      matchReasons.push(`${intent.venueType.charAt(0).toUpperCase() + intent.venueType.slice(1)}`);
    }
  }
  
  // Vibe
  (intent.vibe || []).forEach((v: string) => { 
    if (haystack.includes(v.toLowerCase())) {
      score += 6;
      if (['upscale', 'intimate', 'chill', 'lively', 'trendy', 'cozy'].includes(v.toLowerCase())) {
        matchReasons.push(`${v.charAt(0).toUpperCase() + v.slice(1)} vibes`);
      }
    }
  });
  
  // Music
  (intent.music || []).forEach((m: string) => { 
    if (haystack.includes(m.toLowerCase())) {
      score += 12;
      matchReasons.push(`${m.charAt(0).toUpperCase() + m.slice(1)} music`);
    }
  });
  
  // Cuisine
  if (intent.cuisine && haystack.includes(intent.cuisine.toLowerCase())) {
    score += 14;
    matchReasons.push(`${intent.cuisine.charAt(0).toUpperCase() + intent.cuisine.slice(1)} cuisine`);
  }
  
  // Features
  (intent.features || []).forEach((f: string) => { 
    if (haystack.includes(f.toLowerCase().replace('_', ' '))) {
      score += 8;
      matchReasons.push(f.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  });
  
  // Occasion
  if (intent.occasion === 'date_night' || intent.occasion === 'first_date') {
    if (venue.score_first_date > 60) {
      score += 12;
      matchReasons.push('Great for dates');
    } else if (haystack.includes('intimate') || haystack.includes('romantic')) {
      score += 8;
      matchReasons.push('Romantic atmosphere');
    }
    if (haystack.includes('loud') || (venue.category || '').toLowerCase() === 'club') {
      score -= 8;
    }
  }
  
  if (intent.occasion === 'group_night' || intent.occasion === 'birthday') {
    if (venue.score_group_night > 70) {
      score += 12;
      matchReasons.push('Perfect for groups');
    } else if (haystack.includes('group') || haystack.includes('party')) {
      score += 8;
      matchReasons.push('Group-friendly');
    }
  }
  
  // Energy
  if (intent.energyLevel === 'low') {
    if (haystack.includes('intimate') || haystack.includes('cozy') || haystack.includes('quiet') || venue.energy_level === 'relaxed') {
      score += 10;
      matchReasons.push('Chill atmosphere');
    }
    if (haystack.includes('loud') || haystack.includes('club') || venue.energy_level === 'lively') {
      score -= 8;
    }
  } else if (intent.energyLevel === 'high') {
    if (haystack.includes('club') || haystack.includes('high energy') || haystack.includes('party') || venue.energy_level === 'lively') {
      score += 10;
      matchReasons.push('High energy');
    }
  }
  
  // Late night
  if (intent.timeContext === 'late_night') {
    if (venue.late_night_spot || haystack.includes('late night') || haystack.includes('after hours')) {
      score += 10;
      matchReasons.push('Open late');
    }
  }
  
  // Price - use google_price_level
  if (intent.priceRange === 'upscale') {
    if (venue.google_price_level >= 3 || haystack.includes('upscale') || haystack.includes('fine dining')) {
      score += 8;
      matchReasons.push('Upscale');
    }
  } else if (intent.priceRange === 'budget') {
    if (venue.google_price_level && venue.google_price_level <= 2) {
      score += 6;
      matchReasons.push('Budget-friendly');
    }
  }
  
  // Quality
  if (venue.google_rating >= 4.5) {
    score += 10;
    matchReasons.push('Highly rated');
  } else if (venue.google_rating >= 4.2) {
    score += 5;
  }
  
  // Direct name match
  if (intent.raw && venue.name?.toLowerCase().includes(intent.raw.toLowerCase())) {
    score += 25;
    matchReasons.unshift('Direct match');
  }
  
  return { score, matchReasons: [...new Set(matchReasons)].slice(0, 3) };
}

// ============ MAIN HANDLER ============
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const useAI = searchParams.get('ai') !== 'false';
  
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400, headers: corsHeaders });
  }
  
  const db = new Database(dbPath);
  const startTime = Date.now();
  
  try {
    console.log('🔍 Viberyte AI Search:', query);
    
    let intent: any;
    let aiUsed = false;
    
    if (useAI && query.length >= 3) {
      const aiIntent = await parseWithAI(query);
      if (aiIntent && aiIntent.confidence > 25) {
        intent = { ...aiIntent, raw: query };
        aiUsed = true;
        console.log('🤖 AI powered:', intent.reasoning);
      }
    }
    
    if (!intent) {
      intent = parseQueryFallback(query);
      console.log('📋 Rule-based:', intent.reasoning);
    }
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // ============ VENUE SEARCH ============
    let rawVenues: any[] = [];
    
    const searchTerms = [
      ...(intent.vibe || []),
      ...(intent.music || []),
      ...(intent.features || []),
      intent.cuisine,
      intent.venueType,
      ...(intent.matchTags || []),
      ...(intent.expandedTerms || []),
    ].filter(Boolean);
    
    if (searchTerms.length > 0) {
      const termPatterns = searchTerms.map(t => `%${t.toLowerCase()}%`);
      const whereClauses = termPatterns.map(() => `(
        LOWER(vibe_tags) LIKE ? OR 
        LOWER(primary_vibes) LIKE ? OR 
        LOWER(music_genres) LIKE ? OR 
        LOWER(category) LIKE ? OR
        LOWER(cuisine_primary) LIKE ? OR
        LOWER(special_features) LIKE ? OR
        LOWER(bio) LIKE ?
      )`).join(' OR ');
      
      const params: string[] = [];
      termPatterns.forEach(p => params.push(p, p, p, p, p, p, p));
      
      rawVenues = db.prepare(`
        SELECT id, name, category, cuisine_primary, neighborhood, city, 
               COALESCE(professional_photo_url, json_extract(google_photos, '$[0]')) as image_url, 
               rating, google_rating, yelp_review_count, google_price_level, price_tier, vibe_tags, primary_vibes,
               music_genres, special_features, bio, energy_level, late_night_spot, 
               score_first_date, score_group_night
        FROM venues 
        WHERE should_exclude = 0 AND (${whereClauses})
        LIMIT 100
      `).all(...params) as any[];
    }
    
    // Text search
    const textMatches = db.prepare(`
      SELECT id, name, category, cuisine_primary, neighborhood, city, 
             COALESCE(professional_photo_url, json_extract(google_photos, '$[0]')) as image_url, 
             rating, google_rating, yelp_review_count, google_price_level, price_tier, vibe_tags, primary_vibes,
             music_genres, special_features, bio, energy_level, late_night_spot,
             score_first_date, score_group_night
      FROM venues 
      WHERE should_exclude = 0
        AND (LOWER(name) LIKE ? OR LOWER(cuisine_primary) LIKE ? OR LOWER(neighborhood) LIKE ? 
             OR LOWER(vibe_tags) LIKE ? OR LOWER(music_genres) LIKE ?)
      LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm) as any[];
    
    const existingIds = new Set(rawVenues.map(v => v.id));
    textMatches.forEach(v => { if (!existingIds.has(v.id)) rawVenues.push(v); });
    
    // Fallback
    let fallbackUsed = false;
    if (rawVenues.length < 5) {
      fallbackUsed = true;
      const popularVenues = db.prepare(`
        SELECT id, name, category, cuisine_primary, neighborhood, city, 
               COALESCE(professional_photo_url, json_extract(google_photos, '$[0]')) as image_url, 
               rating, google_rating, yelp_review_count, google_price_level, price_tier, vibe_tags, primary_vibes,
               music_genres, special_features, bio, energy_level, late_night_spot,
               score_first_date, score_group_night
        FROM venues 
        WHERE should_exclude = 0 AND google_rating >= 4.0
        ORDER BY google_rating DESC
        LIMIT 30
      `).all() as any[];
      
      popularVenues.forEach(v => {
        if (!existingIds.has(v.id)) { rawVenues.push(v); existingIds.add(v.id); }
      });
    }
    
    // Score with confidence weighting
    const confidenceMultiplier = 0.5 + (intent.confidence / 200);
    
    const venues = rawVenues
      .map(v => {
        const { score, matchReasons } = scoreVenue(v, intent);
        const finalScore = score * confidenceMultiplier;
        return { 
          ...v, 
          score: Math.round(finalScore),
          matchReason: matchReasons.length > 0 ? matchReasons.join(' · ') : null
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // ============ EVENTS ============
    let events: any[] = [];
    
    if (intent.category === 'events' || intent.timeContext || (intent.music && intent.music.length > 0)) {
      if (intent.music && intent.music.length > 0) {
        const musicTerms = intent.music.map((m: string) => `%${m}%`);
        const musicWhere = musicTerms.map(() => `LOWER(music_genre) LIKE ? OR LOWER(music_genres) LIKE ?`).join(' OR ');
        const musicParams: string[] = [];
        musicTerms.forEach((m: string) => musicParams.push(m, m));
        
        events = db.prepare(`
          SELECT id, name, venue_name, date, event_date, city, image_url, cover_image_url, music_genre, music_genres
          FROM events WHERE date >= date('now') AND (${musicWhere})
          ORDER BY date ASC LIMIT 15
        `).all(...musicParams) as any[];
      }
      
      if (events.length < 10) {
        const upcoming = db.prepare(`
          SELECT id, name, venue_name, date, event_date, city, image_url, cover_image_url, music_genre, music_genres
          FROM events WHERE date >= date('now') ORDER BY date ASC LIMIT 15
        `).all() as any[];
        const ids = new Set(events.map(e => e.id));
        upcoming.forEach(e => { if (!ids.has(e.id)) events.push(e); });
      }
    } else {
      events = db.prepare(`
        SELECT id, name, venue_name, date, event_date, city, image_url, cover_image_url, music_genre, music_genres
        FROM events WHERE LOWER(name) LIKE ? OR LOWER(venue_name) LIKE ? OR LOWER(music_genre) LIKE ?
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, limit) as any[];
    }
    
    // ============ PROMOTERS ============
    let promoters: any[] = [];
    try {
      promoters = db.prepare(`
        SELECT id, instagram_handle as handle, business_name, name,
               profile_picture as profile_image_url, follower_count, is_verified as verified
        FROM partners WHERE status = 'approved'
          AND (LOWER(instagram_handle) LIKE ? OR LOWER(business_name) LIKE ? OR LOWER(name) LIKE ?)
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, limit).map((p: any) => ({
        ...p, business_name: p.business_name || p.name || p.handle
      }));
    } catch (e) {}
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${venues.length} venues, ${events.length} events, ${promoters.length} promoters in ${duration}ms`);
    
    // Log analytics
    logSearchAnalytics({
      query,
      intent: {
        category: intent.category,
        venueType: intent.venueType,
        music: intent.music,
        vibe: intent.vibe,
        occasion: intent.occasion,
        energyLevel: intent.energyLevel,
        timeContext: intent.timeContext,
        confidence: intent.confidence,
      },
      aiUsed,
      resultCount: venues.length + events.length + promoters.length,
    });
    
    return NextResponse.json({
      query,
      aiPowered: aiUsed,
      intent: {
        category: intent.category,
        venueType: intent.venueType,
        vibe: intent.vibe,
        music: intent.music,
        cuisine: intent.cuisine,
        occasion: intent.occasion,
        priceRange: intent.priceRange,
        energyLevel: intent.energyLevel,
        features: intent.features,
        timeContext: intent.timeContext,
        reasoning: intent.reasoning,
        confidence: intent.confidence,
        matchTags: intent.matchTags || [],
      },
      venues,
      events: events.slice(0, limit),
      promoters,
      total: venues.length + events.length + promoters.length,
      fallbackUsed,
      searchDuration: duration,
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('❌ Search error:', error);
    return NextResponse.json({ error: 'Search failed', message: error.message }, { status: 500, headers: corsHeaders });
  } finally {
    db.close();
  }
}
