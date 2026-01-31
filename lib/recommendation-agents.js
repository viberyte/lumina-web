/**
 * AI AGENT SYSTEM FOR RECOMMENDATIONS
 * 
 * 3 Agents:
 * 1. Context Agent - Understands full situation (time, weather, user context)
 * 2. Matching Agent - Scores venues intelligently
 * 3. Fallback Agent - Never returns empty results
 */

import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';

const anthropic = new Anthropic({ 
  apiKey: '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'
});

/**
 * AGENT 1: CONTEXT AGENT
 * Analyzes the full situation
 */
export class ContextAgent {
  async analyze(userContext) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    let timeOfDay = 'evening';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'late-night';
    
    // Get weather (mock for now, integrate OpenWeather later)
    const weather = {
      temp: 55,
      condition: 'clear',
      isGoodForOutdoor: true
    };
    
    const prompt = `CONTEXT ANALYSIS

USER REQUEST:
- Who: ${userContext.who}
- When: ${userContext.when}
- Vibe: ${userContext.vibe}
- Music: ${userContext.musicGenre || 'any'}
- Cuisine: ${userContext.cuisine || 'any'}

SITUATIONAL CONTEXT:
- Time: ${timeOfDay} (${hour}:00)
- Day: ${isWeekend ? 'Weekend' : 'Weekday'}
- Weather: ${weather.temp}°F, ${weather.condition}

CONTEXTUAL DETAILS:
${userContext.date_stage ? `- Date Stage: ${userContext.date_stage}` : ''}
${userContext.date_vibe ? `- Date Vibe: ${userContext.date_vibe}` : ''}
${userContext.energy_level ? `- Energy Level: ${userContext.energy_level}` : ''}
${userContext.group_size ? `- Group Size: ${userContext.group_size}` : ''}
${userContext.business_type ? `- Business Type: ${userContext.business_type}` : ''}
${userContext.solo_purpose ? `- Solo Purpose: ${userContext.solo_purpose}` : ''}

Provide venue requirements in this format:

MUST_HAVE: [list 3-5 critical requirements]
NICE_TO_HAVE: [list 2-3 bonus features]
AVOID: [list 2-3 things to exclude]
FILTERS: [json object with filters]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });
    
    const text = response.content[0].text;
    
    return {
      timeOfDay,
      isWeekend,
      weather,
      requirements: text,
      context: userContext
    };
  }
}

/**
 * AGENT 2: MATCHING AGENT
 * Intelligently scores venues
 */
export class MatchingAgent {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }
  
  async findMatches(contextAnalysis, limit = 12) {
    const ctx = contextAnalysis.context;
    
    // Build base filters
    const filters = ['viberyte_certified = 1', 'should_exclude = 0'];
    const params = {};
    
    // City filter
    params.city = `%${ctx.city.toLowerCase()}%`;
    filters.push('LOWER(city) LIKE @city');
    
    // Category filter
    if (ctx.vibe) {
      const categoryMap = {
        'dinner': 'dining',
        'lounge': 'lounge',
        'nightclub': 'nightlife',
        'brunch': 'dining'
      };
      const category = categoryMap[ctx.vibe.toLowerCase()];
      if (category) {
        params.category = category;
        filters.push('LOWER(category) = @category');
      }
    }
    
    // Music filter
    if (ctx.musicGenre) {
      params.music = `%${ctx.musicGenre.toLowerCase()}%`;
      filters.push('LOWER(music_genres) LIKE @music');
    }
    
    // Cuisine filter
    if (ctx.cuisine) {
      params.cuisine = `%${ctx.cuisine.toLowerCase()}%`;
      filters.push('LOWER(cuisine) LIKE @cuisine');
    }
    
    // Context-aware filters
    
    // First date = quiet
    if (ctx.date_stage === 'first-date' || ctx.date_vibe === 'quiet-intimate') {
      filters.push("(LOWER(vibe_tags) LIKE '%quiet%' OR LOWER(vibe_tags) LIKE '%intimate%')");
    }
    
    // Turn up = high energy
    if (ctx.energy_level === 'turn-up') {
      filters.push("(LOWER(vibe_tags) LIKE '%energetic%' OR LOWER(vibe_tags) LIKE '%lively%')");
    }
    
    // Large group = reservation friendly
    if (ctx.group_size === 'large') {
      filters.push('(opentable_url IS NOT NULL OR resy_url IS NOT NULL)');
    }
    
    const whereClause = filters.join(' AND ');
    
    const sql = `
      SELECT 
        id, name, city, neighborhood, category,
        cuisine, vibe_tags, music_genres, ideal_for,
        dress_code, google_rating, professional_photos,
        bio, opentable_url, resy_url, viberyte_score,
        certification_reasoning
      FROM venues
      WHERE ${whereClause}
      ORDER BY viberyte_score DESC, google_rating DESC
      LIMIT ${limit * 2}
    `;
    
    const venues = this.db.prepare(sql).all(params);
    
    // Score each venue with AI
    const scoredVenues = await this.scoreVenues(venues, contextAnalysis);
    
    // Return top matches
    return scoredVenues
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)
      .map(v => ({
        ...v,
        photos: v.professional_photos ? JSON.parse(v.professional_photos) : [],
        photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null,
        professional_photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null
      }));
  }
  
  async scoreVenues(venues, contextAnalysis) {
    // For now, simple scoring. Can add AI scoring per venue later
    return venues.map(v => ({
      ...v,
      matchScore: v.viberyte_score * 10 + (v.google_rating || 0) * 2
    }));
  }
  
  close() {
    this.db.close();
  }
}

/**
 * AGENT 3: FALLBACK AGENT
 * Never returns empty results
 */
export class FallbackAgent {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }
  
  async getFallbackResults(originalContext, limit = 12) {
    console.log('🔄 Fallback Agent: Relaxing filters...');
    
    const strategies = [
      // Level 1: Remove music genre
      () => this.tryWithout(originalContext, ['musicGenre']),
      
      // Level 2: Remove cuisine
      () => this.tryWithout(originalContext, ['musicGenre', 'cuisine']),
      
      // Level 3: Remove contextual filters
      () => this.tryWithout(originalContext, ['musicGenre', 'cuisine', 'date_stage', 'energy_level']),
      
      // Level 4: Just show top venues in category
      () => this.getTopInCategory(originalContext)
    ];
    
    for (const strategy of strategies) {
      const results = await strategy();
      if (results.length > 0) {
        return results;
      }
    }
    
    // Ultimate fallback: top rated venues in city
    return this.getTopInCity(originalContext, limit);
  }
  
  async tryWithout(context, removeKeys) {
    const relaxedContext = { ...context };
    removeKeys.forEach(key => delete relaxedContext[key]);
    
    const matchingAgent = new MatchingAgent(this.db);
    const contextAgent = new ContextAgent();
    const analysis = await contextAgent.analyze(relaxedContext);
    const results = await matchingAgent.findMatches(analysis, 12);
    matchingAgent.close();
    
    return results;
  }
  
  getTopInCategory(context) {
    const categoryMap = {
      'dinner': 'dining',
      'lounge': 'lounge',
      'nightclub': 'nightlife'
    };
    const category = categoryMap[context.vibe?.toLowerCase()] || 'dining';
    
    const venues = this.db.prepare(`
      SELECT *
      FROM venues
      WHERE viberyte_certified = 1
        AND should_exclude = 0
        AND LOWER(category) = ?
        AND LOWER(city) LIKE ?
      ORDER BY viberyte_score DESC, google_rating DESC
      LIMIT 12
    `).all(category, `%${context.city.toLowerCase()}%`);
    
    return venues.map(v => ({
      ...v,
      photos: v.professional_photos ? JSON.parse(v.professional_photos) : [],
      photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null,
      professional_photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null
    }));
  }
  
  getTopInCity(context, limit) {
    const venues = this.db.prepare(`
      SELECT *
      FROM venues
      WHERE viberyte_certified = 1
        AND should_exclude = 0
        AND LOWER(city) LIKE ?
      ORDER BY viberyte_score DESC, google_rating DESC
      LIMIT ?
    `).all(`%${context.city.toLowerCase()}%`, limit);
    
    return venues.map(v => ({
      ...v,
      photos: v.professional_photos ? JSON.parse(v.professional_photos) : [],
      photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null,
      professional_photo_url: v.professional_photos ? JSON.parse(v.professional_photos)[0] : null
    }));
  }
  
  close() {
    this.db.close();
  }
}

/**
 * ORCHESTRATOR
 * Coordinates all 3 agents
 */
export async function getSmartRecommendations(userContext, dbPath) {
  try {
    // Agent 1: Analyze context
    const contextAgent = new ContextAgent();
    const contextAnalysis = await contextAgent.analyze(userContext);
    
    // Agent 2: Find matches
    const matchingAgent = new MatchingAgent(dbPath);
    let venues = await matchingAgent.findMatches(contextAnalysis);
    matchingAgent.close();
    
    // Agent 3: Fallback if needed
    if (venues.length === 0) {
      const fallbackAgent = new FallbackAgent(dbPath);
      venues = await fallbackAgent.getFallbackResults(userContext);
      fallbackAgent.close();
    }
    
    return {
      ok: true,
      venues,
      context: contextAnalysis
    };
    
  } catch (error) {
    console.error('Agent system error:', error);
    return {
      ok: false,
      error: error.message,
      venues: []
    };
  }
}
