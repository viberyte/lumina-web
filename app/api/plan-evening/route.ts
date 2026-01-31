import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ==================== TYPES ====================
type Persona = 'solo' | 'date_night' | 'friends' | 'birthday' | 'business' | 'vibing';
type Gender = 'male' | 'female' | 'non_binary' | 'unknown';
type PrimaryChoice = 'dinner' | 'lounge' | 'brunch' | 'events';
type SpendingVibe = 'casual' | 'nice_night' | 'celebration';
type TravelMode = 'walking' | 'subway' | 'rideshare' | 'driving';
type Duration = 'quick' | 'normal' | 'full_night';

// ==================== WEATHER ====================
async function getWeather(date: string, lat: number = 40.7580, lon: number = -73.9855) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=America/New_York&start_date=${date}&end_date=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      temp_max: Math.round((data.daily.temperature_2m_max[0] * 9/5) + 32),
      temp_min: Math.round((data.daily.temperature_2m_min[0] * 9/5) + 32),
      precipitation: data.daily.precipitation_sum[0],
      wind: data.daily.windspeed_10m_max[0],
      conditions: data.daily.precipitation_sum[0] > 5 ? 'rainy' : 'clear'
    };
  } catch (error) {
    console.error('Weather error:', error);
    return { temp_max: 70, temp_min: 60, precipitation: 0, wind: 5, conditions: 'clear' };
  }
}

// ==================== DISTANCE ====================
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getTravelTime(distance: number, mode: TravelMode): string {
  if (mode === 'walking') {
    const mins = Math.round(distance * 20);
    return mins <= 5 ? 'Same block' : `${mins}-min walk`;
  }
  if (mode === 'subway') {
    const mins = Math.round(distance * 10);
    return `${mins}-min subway`;
  }
  if (mode === 'rideshare') {
    const mins = Math.round(distance * 5);
    return `${mins}-min Uber`;
  }
  return 'Easy drive';
}

// ==================== ANCHOR DETECTION ====================
function determinePrimaryAnchor(context: any): string {
  const { persona, primaryChoice, time } = context;
  
  if (persona === 'birthday') return 'LOUNGE';
  if (persona === 'business') return 'DINNER';
  
  if (primaryChoice === 'brunch') return 'BRUNCH';
  if (primaryChoice === 'lounge') return 'LOUNGE';
  if (primaryChoice === 'dinner') return 'DINNER';
  if (primaryChoice === 'events') return 'EVENT';
  
  const timeMap: any = {
    'brunch': 'BRUNCH',
    'lunch': 'LUNCH',
    'dinner': 'DINNER',
    'night': 'LOUNGE',
    'late': 'LATE_NIGHT_FOOD'
  };
  
  return timeMap[time] || 'DINNER';
}

// ==================== PERSONA SCORING ====================
function getPersonaScore(venue: any, persona: Persona, gender: Gender): number {
  let score = 0;
  
  if (persona === 'solo') {
    if (venue.solo_friendly) score += 20;
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    if (venueEnergy <= 3) score += 10;
    if (!venue.outdoor) score += 5;
    
    if (gender === 'female') {
      if (venueEnergy <= 2) score += 10;
      if (!venue.outdoor) score += 5;
    }
  }
  
  if (persona === 'date_night') {
    if (venue.first_date_suitable) score += 20;
    if (venue.anniversary_suitable) score += 15;
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    if (venueEnergy <= 3) score += 10;
  }
  
  if (persona === 'friends') {
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    if (venueEnergy >= 3) score += 15;
    if (venue.large_group_suitable) score += 15;
    if (venue.girls_night_suitable) score += 10;
    if (venue.guys_night_suitable) score += 10;
  }
  
  if (persona === 'birthday') {
    if (venue.good_for_birthdays) score += 20;
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    if (venueEnergy >= 4) score += 10;
    if (venue.large_group_suitable) score += 10;
  }
  
  if (persona === 'business') {
    if (venue.business_meeting_ok) score += 25;
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    if (venueEnergy <= 2) score += 15;
    if (venue.price_tier && venue.price_tier.includes('$$$')) score += 10;
  }
  
  return score;
}

// ==================== SPENDING VIBE FILTERING (FIXED) ====================
function matchesSpendingVibe(venue: any, spendingVibe: SpendingVibe): boolean {
  const tier = venue.price_tier || '';
  
  // Handle $ symbol format
  if (tier.includes('$')) {
    if (spendingVibe === 'casual') {
      return tier.includes('$') && !tier.includes('$$$');
    }
    if (spendingVibe === 'nice_night') {
      return tier.includes('$$') || tier.includes('$$$');
    }
    if (spendingVibe === 'celebration') {
      return tier.includes('$$$') || tier.includes('$$$$');
    }
  }
  
  // Handle text format (budget, moderate, upscale, luxury)
  const lowerTier = tier.toLowerCase();
  
  if (spendingVibe === 'casual') {
    return lowerTier.includes('budget') || lowerTier.includes('moderate');
  }
  if (spendingVibe === 'nice_night') {
    return lowerTier.includes('moderate') || lowerTier.includes('upscale');
  }
  if (spendingVibe === 'celebration') {
    return lowerTier.includes('upscale') || lowerTier.includes('luxury') || lowerTier.includes('premium');
  }
  
  return true;
}

// ==================== VENUE SCORING ====================
function scoreVenue(venue: any, context: any, prevVenue?: any): number {
  let score = 0;
  
  score += getPersonaScore(venue, context.persona, context.gender);
  
  if (venue.music_genres && context.musicPreferences?.length > 0) {
    try {
      const genres = typeof venue.music_genres === 'string' ? JSON.parse(venue.music_genres) : venue.music_genres;
      if (genres.some((g: string) => context.musicPreferences.includes(g))) {
        score += 40;
      }
    } catch {}
  }
  
  if (venue.energy_level && context.energyLevel) {
    const energyMap: any = { calm: 1, low: 2, moderate: 3, lively: 4, high: 5 };
    const venueEnergy = energyMap[venue.energy_level] || 3;
    const energyDiff = Math.abs(venueEnergy - context.energyLevel);
    score += Math.max(0, 30 - (energyDiff * 10));
  }
  
  if (prevVenue && venue.latitude && venue.longitude && prevVenue.latitude && prevVenue.longitude) {
    const distance = calculateDistance(prevVenue.latitude, prevVenue.longitude, venue.latitude, venue.longitude);
    if (distance < 0.3) score += 15;
    else if (distance < 0.7) score += 10;
    else if (distance < 1.5) score += 5;
  }
  
  if (context.weather.temp_max > 70 && venue.outdoor) score += 10;
  if (context.weather.temp_max < 50 && !venue.outdoor) score += 10;
  
  if (venue.rating >= 4.5) score += 10;
  else if (venue.rating >= 4.0) score += 7;
  
  return score;
}

// ==================== HARD FILTERS ====================
function passesFilters(venue: any, context: any): boolean {
  if (context.weather.temp_max < 50 && venue.outdoor) return false;
  if (context.weather.precipitation > 5 && venue.outdoor) return false;
  
  if (context.spendingVibe && !matchesSpendingVibe(venue, context.spendingVibe)) return false;
  
  if (context.prevVenue && venue.latitude && venue.longitude && context.prevVenue.latitude && context.prevVenue.longitude) {
    const distance = calculateDistance(context.prevVenue.latitude, context.prevVenue.longitude, venue.latitude, venue.longitude);
    
    if (context.travelMode === 'walking' && distance > 0.5) return false;
    if (context.travelMode === 'subway' && distance > 2) return false;
    if (context.travelMode === 'rideshare' && distance > 5) return false;
  }
  
  if (context.groupSize > 8 && !venue.large_group_suitable) return false;
  
  return true;
}

// ==================== FLOW BUILDERS ====================
function buildDinnerFlow(venues: any[], context: any): any[] {
  const flow: any[] = [];
  
  const restaurants = venues.filter(v => v.cuisine_primary && v.cuisine_primary !== 'Unknown');
  if (restaurants.length > 0) {
    flow.push({
      type: 'DINNER',
      time: '7:00 PM - 9:00 PM',
      venue: restaurants[0],
      description: 'Primary dining experience'
    });
    
    if (context.duration !== 'quick') {
      const lounges = venues.filter(v => v.id !== restaurants[0].id && (v.lounge_type || v.energy_level === 'moderate' || v.energy_level === 'lively' || v.energy_level === 'high'));
      if (lounges.length > 0) {
        flow.push({
          type: 'LOUNGE',
          time: '9:30 PM - 11:30 PM',
          venue: lounges[0],
          description: 'Cocktails & vibes'
        });
      }
    }
  }
  
  return flow;
}

function buildLoungeFlow(venues: any[], context: any): any[] {
  const flow: any[] = [];
  
  const lounges = venues.filter(v => v.lounge_type || v.energy_level === 'moderate' || v.energy_level === 'lively' || v.energy_level === 'high');
  if (lounges.length > 0) {
    flow.push({
      type: 'LOUNGE',
      time: '9:00 PM - 11:30 PM',
      venue: lounges[0],
      description: 'PRIMARY - Main lounge experience'
    });
    
    if (context.duration === 'full_night' && context.energyLevel >= 4) {
      const lateSpots = venues.filter(v => v.id !== lounges[0].id && v.late_night_spot);
      if (lateSpots.length > 0) {
        flow.push({
          type: 'LATE_NIGHT',
          time: '12:00 AM+',
          venue: lateSpots[0],
          description: 'Keep the night going',
          optional: true
        });
      }
    }
  }
  
  return flow;
}

function buildBrunchFlow(venues: any[], context: any): any[] {
  const flow: any[] = [];
  
  const brunchSpots = venues.filter(v => v.brunch_spot || v.good_for_brunch);
  if (brunchSpots.length > 0) {
    flow.push({
      type: 'BRUNCH',
      time: '12:00 PM - 2:30 PM',
      venue: brunchSpots[0],
      description: 'Brunch vibes'
    });
  }
  
  return flow;
}

// ==================== VIBE SETS ====================
function generateVibeSets(venues: any[], context: any, usedIds: number[]): any[] {
  const available = venues.filter(v => !usedIds.includes(v.id));
  const vibeSets: any[] = [];
  
  if (context.primaryChoice === 'lounge') {
    const laidBack = available.filter(v => v.energy_level && ['calm', 'low'].includes(v.energy_level)).slice(0, 2);
    if (laidBack.length >= 2) {
      vibeSets.push({
        title: '😌 Laid Back',
        description: 'Chill & conversation',
        venues: laidBack.map(v => ({
          id: v.id,
          name: v.name,
          photo: v.professional_photo_url,
          quickInfo: `${v.cuisine_primary || 'Lounge'} • ${v.neighborhood}`,
          vibeLabel: 'Laid Back',
          oneLiner: v.why_recommended?.substring(0, 60) || 'Relaxed atmosphere'
        }))
      });
    }
    
    const upscale = available.filter(v => 
      !laidBack.includes(v) && 
      (v.dress_code === 'upscale' || v.price_tier?.includes('$$$') || v.price_tier?.toLowerCase().includes('upscale'))
    ).slice(0, 2);
    
    if (upscale.length >= 2) {
      vibeSets.push({
        title: '✨ Upscale',
        description: 'Dress to impress',
        venues: upscale.map(v => ({
          id: v.id,
          name: v.name,
          photo: v.professional_photo_url,
          quickInfo: `${v.cuisine_primary || 'Lounge'} • ${v.neighborhood}`,
          vibeLabel: 'Upscale',
          oneLiner: v.why_recommended?.substring(0, 60) || 'Premium experience'
        }))
      });
    }
    
    const vip = available.filter(v => 
      !laidBack.includes(v) && 
      !upscale.includes(v) &&
      (v.energy_level === 'high' || v.large_group_suitable)
    ).slice(0, 2);
    
    if (vip.length >= 2) {
      vibeSets.push({
        title: '🍾 VIP',
        description: 'Premium tables',
        venues: vip.map(v => ({
          id: v.id,
          name: v.name,
          photo: v.professional_photo_url,
          quickInfo: `${v.cuisine_primary || 'Lounge'} • ${v.neighborhood}`,
          vibeLabel: 'VIP',
          oneLiner: v.why_recommended?.substring(0, 60) || 'VIP experience'
        }))
      });
    }
  }
  
  return vibeSets.slice(0, 3);
}

// ==================== AI REASONING ====================
async function generateReasoning(stop: any, context: any): Promise<string> {
  const prompt = `You're Lumina, a warm nightlife concierge. Explain in 2-3 sentences why ${stop.venue.name} is perfect for this ${context.persona} ${context.primaryChoice || 'evening'}.

Context:
- Persona: ${context.persona}
- Group: ${context.groupSize} people
- Weather: ${context.weather.temp_max}°F, ${context.weather.conditions}
- Spending: ${context.spendingVibe}

Be warm, specific, natural. No quotes.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 120
    });
    return response.choices[0].message.content?.trim() || 'Perfect for your night.';
  } catch (error) {
    return `${stop.venue.name} is a great choice for your ${context.persona}.`;
  }
}

// ==================== MAIN API ====================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      venueId,
      persona = 'vibing' as Persona,
      gender = 'unknown' as Gender,
      primaryChoice = 'dinner' as PrimaryChoice,
      spendingVibe = 'nice_night' as SpendingVibe,
      travelMode = 'subway' as TravelMode,
      duration = 'normal' as Duration,
      groupSize = 2,
      date,
      time = 'night',
      musicPreferences = [],
      energyLevel = 3,
      excludeIds = []
    } = body;
    
    console.log('🎯 Plan Evening v2:', { venueId, persona, primaryChoice, spendingVibe });
    
    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400, headers: corsHeaders });
    }
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
    
    const weather = await getWeather(targetDate);
    console.log('🌤️ Weather:', weather);
    
    const db = new Database(dbPath);
    const primaryVenue: any = db.prepare('SELECT * FROM venues WHERE id = ?').get(venueId);
    
    if (!primaryVenue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: corsHeaders });
    }
    
    const context = {
      persona,
      gender,
      primaryChoice,
      spendingVibe,
      travelMode,
      duration,
      groupSize,
      time,
      musicPreferences,
      energyLevel,
      weather,
      dayOfWeek,
      prevVenue: primaryVenue
    };
    
    const anchor = determinePrimaryAnchor(context);
    console.log('⚓ Anchor:', anchor);
    
    let candidates: any[] = db.prepare(`
      SELECT * FROM venues 
      WHERE neighborhood = ? 
      AND id != ?
      ${excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.join(',')})` : ''}
      LIMIT 300
    `).all(primaryVenue.neighborhood, venueId);
    
    candidates = candidates.filter(v => passesFilters(v, context));
    console.log(`✅ After filters: ${candidates.length}`);
    
    const scored = candidates
      .map(v => ({ ...v, score: scoreVenue(v, context, primaryVenue) }))
      .sort((a, b) => b.score - a.score);
    
    let flow: any[] = [];
    
    if (anchor === 'DINNER') flow = buildDinnerFlow(scored, context);
    else if (anchor === 'LOUNGE') flow = buildLoungeFlow(scored, context);
    else if (anchor === 'BRUNCH') flow = buildBrunchFlow(scored, context);
    else flow = buildDinnerFlow(scored, context);
    
    db.close();
    
    if (flow.length === 0) {
      return NextResponse.json({
        error: 'Could not build flow',
        message: 'Not enough venues found'
      }, { status: 400, headers: corsHeaders });
    }
    
    console.log(`🏗️ Built ${flow.length}-stop flow`);
    
    const flowWithReasoning = await Promise.all(flow.map(async (stop, i) => {
      const reasoning = await generateReasoning(stop, context);
      
      let travelTime = 'Starting point';
      if (i > 0 && flow[i-1].venue.latitude && stop.venue.latitude) {
        const dist = calculateDistance(
          flow[i-1].venue.latitude, flow[i-1].venue.longitude,
          stop.venue.latitude, stop.venue.longitude
        );
        travelTime = getTravelTime(dist, travelMode);
      }
      
      return {
        type: stop.type,
        time: stop.time,
        description: stop.description,
        optional: stop.optional || false,
        reasoning,
        travelTime,
        venue: {
          id: stop.venue.id,
          name: stop.venue.name,
          neighborhood: stop.venue.neighborhood,
          cuisine: stop.venue.cuisine_primary || 'Venue',
          priceTier: stop.venue.price_tier,
          rating: stop.venue.rating,
          photo: stop.venue.professional_photo_url,
          address: stop.venue.address
        }
      };
    }));
    
    const usedIds = flowWithReasoning.map(f => f.venue.id);
    const vibeSets = generateVibeSets(scored, context, usedIds);
    
    console.log(`✨ Generated ${vibeSets.length} vibe sets`);
    
    const response = {
      success: true,
      primaryVenue: {
        id: primaryVenue.id,
        name: primaryVenue.name,
        neighborhood: primaryVenue.neighborhood
      },
      context: {
        persona,
        primaryChoice,
        spendingVibe,
        date: targetDate,
        dayOfWeek,
        weather: {
          temp: weather.temp_max,
          conditions: weather.conditions
        }
      },
      primaryFlow: flowWithReasoning,
      vibeSets,
      canRefresh: true,
      usedVenueIds: [...usedIds, venueId]
    };
    
    console.log('✅ Plan complete!');
    
    return NextResponse.json(response, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
