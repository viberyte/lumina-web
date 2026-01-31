import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

// Simple in-memory cache for AI reasoning
const reasoningCache = new Map<string, { reasoning: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper: Pick random item from array
const pickRandom = (arr: any[]) => {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

// Helper: Calculate confidence score
const calculateConfidence = (
  tier: string,
  venueCount: number,
  eventCount: number,
  isEvent: boolean
): number => {
  const totalOptions = venueCount + eventCount;
  
  if (totalOptions === 0) return 0.3;
  if (totalOptions === 1) return 0.5;
  if (totalOptions < 3) return 0.6;
  if (totalOptions < 5) return 0.75;
  
  // Higher confidence for events in wildcard, venues in safe
  if (tier === 'WILDCARD' && isEvent && eventCount > 2) return 0.95;
  if (tier === 'SAFE' && !isEvent && venueCount > 3) return 0.9;
  
  return 0.85;
};

// Vibe match boost helper
const vibeMatch = (venueVibes: string[], desiredVibe?: string) => {
  if (!desiredVibe) return false;
  return venueVibes.some(v => v.toLowerCase().includes(desiredVibe.toLowerCase()));
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Parameter normalization: Support both old and new parameter names
    const primaryVenueId = body.primaryVenueId || body.anchorVenueId;
    const persona = body.persona || body.who || 'friends';
    const timeOfDay = body.timeOfDay || body.when || '21:00';
    const what = body.what;
    const vibe = body.vibe;
    const music = body.music || [];
    const dateSelection = body.dateSelection;
    
    console.log('🌆 Multi-Stop API:', { 
      primaryVenueId, 
      persona, 
      timeOfDay, 
      what, 
      vibe, 
      music,
      dateSelection 
    });
    
    if (!primaryVenueId) {
      return NextResponse.json({ error: 'Missing primaryVenueId or anchorVenueId' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);
    
    const primaryVenue: any = db.prepare('SELECT * FROM venues WHERE id = ?').get(primaryVenueId);
    
    if (!primaryVenue) {
      db.close();
      return NextResponse.json({ error: 'Primary venue not found' }, { status: 404, headers: corsHeaders });
    }

    console.log('🎯 Primary venue:', primaryVenue.name, '| Neighborhood:', primaryVenue.neighborhood);

    // Get venues in same city (neighborhood filter was too strict)
    const allVenues: any[] = db.prepare(`
      SELECT * FROM venues 
      WHERE city = ? 
      AND id != ?
      AND should_exclude = 0
      AND (rating >= 3.5 OR google_rating >= 3.5)
      ORDER BY 
        CASE WHEN neighborhood = ? THEN 0 ELSE 1 END,
        google_rating DESC,
        rating DESC
      LIMIT 200
    `).all(primaryVenue.city || 'New York', primaryVenueId, primaryVenue.neighborhood || '');

    // Get events based on date selection
    let targetDate = new Date().toISOString().split('T')[0];
    let events: any[] = [];
    
    if (dateSelection) {
      if (dateSelection === 'tonight' || dateSelection.type === 'tonight') {
        targetDate = new Date().toISOString().split('T')[0];
        events = db.prepare(`SELECT * FROM events WHERE event_date LIKE ? LIMIT 50`)
          .all(`${targetDate}%`);
      } else if (dateSelection === 'weekend' || dateSelection.type === 'weekend') {
        const today = new Date();
        const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
        const friday = new Date(today);
        friday.setDate(today.getDate() + daysUntilFriday);
        const sunday = new Date(friday);
        sunday.setDate(friday.getDate() + 2);
        
        const fridayStr = friday.toISOString().split('T')[0];
        const sundayStr = sunday.toISOString().split('T')[0];
        
        events = db.prepare(`SELECT * FROM events WHERE event_date >= ? AND event_date <= ? LIMIT 50`)
          .all(fridayStr, sundayStr);
      } else if (dateSelection.type === 'date' && dateSelection.date) {
        targetDate = dateSelection.date;
        events = db.prepare(`SELECT * FROM events WHERE event_date LIKE ? LIMIT 50`)
          .all(`${targetDate}%`);
      }
    } else {
      events = db.prepare(`SELECT * FROM events WHERE event_date LIKE ? LIMIT 50`)
        .all(`${targetDate}%`);
    }
    
    console.log('🎉 Found events for date:', events.length);

    db.close();

    if (allVenues.length < 3) {
      return NextResponse.json({
        error: 'insufficient_venues',
        message: `Not enough venues in ${primaryVenue?.neighborhood || 'this area'} to generate recommendations.`
      }, { headers: corsHeaders });
    }

    const parseVibes = (vibes: any): string[] => {
      if (!vibes) return [];
      if (typeof vibes === 'string') {
        try {
          const parsed = JSON.parse(vibes);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(vibes) ? vibes : [];
    };

    // SAFE MODE: Dessert, cafe, quiet spots
    const safeVenues = allVenues.filter(v => {
      if (what === 'nightlife') return false;
      
      const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
      const category = (v.category || '').toLowerCase();
      const cuisine = (v.cuisine_primary || '').toLowerCase();
      
      if (vibeMatch(vibes, vibe)) return true;
      
      return (
        cuisine.includes('dessert') ||
        cuisine.includes('cafe') ||
        cuisine.includes('bakery') ||
        cuisine.includes('ice cream') ||
        vibes.some((t: string) => ['cozy', 'quiet', 'intimate', 'calm', 'chill'].includes(t)) ||
        (category.includes('dining') && vibes.some((t: string) => ['quiet', 'intimate'].includes(t)))
      );
    });

    const safeEvents = events.filter(e => {
      const genre = (e.music_genre || '').toLowerCase();
      return !genre.includes('club') && !genre.includes('rave');
    });

    // ELEVATED MODE: Lounges, rooftops, speakeasies
    const elevatedVenues = allVenues.filter(v => {
      const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
      const category = (v.category || '').toLowerCase();
      
      if (vibeMatch(vibes, vibe)) return true;
      
      return (
        vibes.some((t: string) => ['rooftop', 'speakeasy', 'trendy', 'hip', 'upscale'].includes(t)) ||
        category.includes('lounge')
      );
    });

    const elevatedEvents = events.filter(e => {
      const genre = (e.music_genre || '').toLowerCase();
      const title = (e.title || '').toLowerCase();
      
      if (music.length > 0) {
        const matchesMusic = music.some((m: string) => genre.includes(m.toLowerCase()));
        if (matchesMusic) return true;
      }
      
      return genre.includes('jazz') || genre.includes('r&b') || title.includes('comedy') || title.includes('concert');
    });

    // WILDCARD MODE: Clubs, high energy
    const wildcardVenues = allVenues.filter(v => {
      const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
      const category = (v.category || '').toLowerCase();
      
      return (
        vibes.some((t: string) => ['club', 'dance', 'party', 'energetic', 'lively', 'mixy'].includes(t)) ||
        category.includes('nightlife') ||
        category.includes('club')
      );
    });

    const wildcardEvents = events.filter(e => {
      const genre = (e.music_genre || '').toLowerCase();
      
      if (music.length > 0) {
        const matchesMusic = music.some((m: string) => genre.includes(m.toLowerCase()));
        if (matchesMusic) return true;
      }
      
      return genre.includes('afrobeats') || genre.includes('amapiano') || genre.includes('hip-hop') || genre.includes('club');
    });

    console.log('📊 Tier distribution:', {
      safe: { venues: safeVenues.length, events: safeEvents.length },
      elevated: { venues: elevatedVenues.length, events: elevatedEvents.length },
      wildcard: { venues: wildcardVenues.length, events: wildcardEvents.length }
    });

    // Pick one from each tier
    const safeOption = pickRandom([
      ...safeEvents.map((e: any) => ({ type: 'event', data: e })),
      ...safeVenues.map((v: any) => ({ type: 'venue', data: v }))
    ]);

    const elevatedOption = pickRandom([
      ...elevatedEvents.map((e: any) => ({ type: 'event', data: e })),
      ...elevatedVenues.map((v: any) => ({ type: 'venue', data: v }))
    ]);

    const wildcardOption = pickRandom([
      ...wildcardEvents.map((e: any) => ({ type: 'event', data: e })),
      ...wildcardVenues.map((v: any) => ({ type: 'venue', data: v }))
    ]);

    // Generate AI reasoning
    const generateReasoning = async (option: any, tier: string): Promise<string> => {
      if (!option || !option.data) {
        return tier === 'SAFE' ? 'Perfect low-key spot to wind down.'
             : tier === 'ELEVATED' ? 'Great vibes to keep the night going.'
             : 'Turn the energy up!';
      }

      const cacheKey = `${tier}-${option.data.id || option.data.title}`;
      const cached = reasoningCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.reasoning;
      }

      try {
        const isEvent = option.type === 'event';
        const item = option.data;
        const name = isEvent ? item.title : item.name;
        const category = isEvent ? item.music_genre : item.cuisine_primary || item.category;

        const prompt = `You're recommending ${name} (${category}) as a ${tier} option after visiting ${primaryVenue.name}.
Context: ${persona} going out around ${timeOfDay}${what ? `, looking for ${what}` : ''}${vibe ? `, wants ${vibe} vibe` : ''}.

Write ONE sentence (15-20 words) explaining why this is a great ${tier.toLowerCase()} choice.
${tier === 'SAFE' ? 'Focus on: relaxed, comfortable, easy ending.' : ''}
${tier === 'ELEVATED' ? 'Focus on: elevated vibes, great atmosphere, next-level experience.' : ''}
${tier === 'WILDCARD' ? 'Focus on: high energy, adventurous, turn-up vibes.' : ''}

Be specific, conversational, and compelling.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.8
        });

        const reasoning = completion.choices[0].message.content?.trim() || 
          'Perfect next stop to continue your night.';
        
        reasoningCache.set(cacheKey, { reasoning, timestamp: Date.now() });
        
        return reasoning;
      } catch (error) {
        console.error('AI reasoning error:', error);
        return 'Perfect next stop to continue your night.';
      }
    };

    const [safeReasoning, elevatedReasoning, wildcardReasoning] = await Promise.all([
      generateReasoning(safeOption, 'SAFE'),
      generateReasoning(elevatedOption, 'ELEVATED'),
      generateReasoning(wildcardOption, 'WILDCARD')
    ]);

    // Calculate confidence scores
    const safeConfidence = calculateConfidence('SAFE', safeVenues.length, safeEvents.length, safeOption?.type === 'event');
    const elevatedConfidence = calculateConfidence('ELEVATED', elevatedVenues.length, elevatedEvents.length, elevatedOption?.type === 'event');
    const wildcardConfidence = calculateConfidence('WILDCARD', wildcardVenues.length, wildcardEvents.length, wildcardOption?.type === 'event');

    // Build response
    const formatOption = (option: any, reasoning: string, tier: string, confidence: number) => {
      if (!option || !option.data) {
        return null;
      }

      const isEvent = option.type === 'event';
      const item = option.data;
      
      if (isEvent) {
        return {
          type: 'event',
          venue: {
            id: item.id,
            name: item.title,
            neighborhood: item.venue_neighborhood || primaryVenue?.neighborhood || 'Nearby',
            cuisine: item.music_genre || 'Event',
            price_tier: item.ticket_price ? `$${item.ticket_price}` : 'Varies',
            rating: '⭐',
            photo: item.image_url,
            address: item.venue_address || item.venue_name,
            eventDate: item.event_date,
            venueName: item.venue_name
          },
          reasoning,
          travelTime: 'Same neighborhood',
          proTip: tier === 'SAFE' ? 'Perfect low-key event to end the night.' 
                : tier === 'ELEVATED' ? 'Great vibe without overwhelming energy.'
                : 'High-energy event to turn the night up!',
          confidence
        };
      } else {
        return {
          type: 'venue',
          venue: {
            id: item.id,
            name: item.name,
            neighborhood: item.neighborhood,
            cuisine: item.cuisine_primary || item.category,
            price_tier: item.price_tier,
            rating: item.rating,
            photo: item.professional_photo_url,
            address: item.address
          },
          reasoning,
          travelTime: 'Same neighborhood',
          proTip: tier === 'SAFE' ? 'Great for a smooth, easy ending.'
                : tier === 'ELEVATED' ? 'Elevated vibes without overwhelming energy.'
                : 'Turn the night up with high-energy vibes.',
          confidence
        };
      }
    };

    const response = {
      anchorVenue: {
        id: primaryVenue.id,
        name: primaryVenue.name,
        neighborhood: primaryVenue.neighborhood
      },
      dateSelection,
      recommendations: {
        safe: formatOption(safeOption, safeReasoning, 'SAFE', safeConfidence),
        elevated: formatOption(elevatedOption, elevatedReasoning, 'ELEVATED', elevatedConfidence),
        wildcard: formatOption(wildcardOption, wildcardReasoning, 'WILDCARD', wildcardConfidence)
      }
    };

    console.log('✅ Multi-stop recommendations generated successfully');

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Multi-stop error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', message: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
