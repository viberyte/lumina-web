import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const openai = new OpenAI({ 
  apiKey: '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'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const ANALYSIS_PROMPT = `You are a nightlife intelligence analyst for Lumina. Extract structured facts from Instagram content.

LAYER 1 - VIBE & CONTEXT SIGNALS:
- energy_level: low/medium/high
- crowd_density: empty/social/packed
- music_genres: array of genres
- dress_code: casual/upscale/luxury
- audience_composition: male_heavy/female_heavy/mixed
- dating_energy: low/medium/high
- table_culture: casual/bottle_centric
- gatekeeping_level: open/selective/strict
- line_intensity: none/moderate/long
- inclusivity_lgbtq: low/medium/high

LAYER 2 - DAY-OF-WEEK INTELLIGENCE:
For each day: score (0.0-1.0) and confidence (low/medium/high)

LAYER 3 - MOMENTUM:
rising/stable/fading

LAYER 4 - TIME-OF-NIGHT:
- opens_at, peak_hours, kitchen_hours, late_night (bool)

LAYER 5 - PRICE INTELLIGENCE:
- cover_charge, cover_amount, bottle_minimum, drink_prices, reservation_required

LAYER 6 - GROUP SUITABILITY:
- solo_friendly, date_friendly, small_group, large_group, birthday_viable

LAYER 7 - WARNINGS:
Array of red flags detected

LAYER 8 - FOOD INTELLIGENCE:
- quality_score, instagram_worthy, signature_dishes, dietary_options

LAYER 9 - CROWD FLOW:
- early_crowd, transition, peak, late

LAYER 10 - SUMMARY & TAGS:
- summary (1-2 sentences), explore_tags (array)

Return ONLY valid JSON matching this structure exactly.`;

export async function POST(request: Request) {
  try {
    const { venueId } = await request.json();
    
    if (!venueId) {
      return NextResponse.json(
        { error: 'venueId required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = new Database(dbPath);
    
    const media = db.prepare(`
      SELECT 
        id, venue_id, caption, likes, comments, posted_at, media_type
      FROM venue_instagram_media
      WHERE venue_id = ?
      ORDER BY posted_at DESC
      LIMIT 50
    `).all(venueId);

    if (media.length === 0) {
      db.close();
      return NextResponse.json(
        { error: 'No Instagram media found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const contextData = media.map((m: any) => ({
      type: m.media_type,
      caption: m.caption || '',
      likes: m.likes || 0,
      comments: m.comments || 0,
      posted_at: m.posted_at,
      day_of_week: new Date(m.posted_at).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    }));

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { 
          role: 'user', 
          content: `Analyze these ${media.length} Instagram posts:\n\n${JSON.stringify(contextData, null, 2)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    db.exec(`
      CREATE TABLE IF NOT EXISTS venue_intelligence (
        venue_id INTEGER PRIMARY KEY,
        energy_level TEXT,
        crowd_density TEXT,
        music_genres TEXT,
        dress_code TEXT,
        audience_composition TEXT,
        dating_energy TEXT,
        table_culture TEXT,
        gatekeeping_level TEXT,
        line_intensity TEXT,
        inclusivity_lgbtq TEXT,
        weekly_profile TEXT,
        momentum TEXT,
        time_profile TEXT,
        pricing_signals TEXT,
        group_suitability TEXT,
        warnings TEXT,
        food_intelligence TEXT,
        crowd_flow TEXT,
        summary TEXT,
        explore_tags TEXT,
        analyzed_at TEXT,
        FOREIGN KEY (venue_id) REFERENCES venues(id)
      )
    `);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO venue_intelligence (
        venue_id, energy_level, crowd_density, music_genres, dress_code,
        audience_composition, dating_energy, table_culture, gatekeeping_level,
        line_intensity, inclusivity_lgbtq, weekly_profile, momentum,
        time_profile, pricing_signals, group_suitability, warnings,
        food_intelligence, crowd_flow, summary, explore_tags, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      venueId,
      analysis.energy_level || 'medium',
      analysis.crowd_density || 'social',
      JSON.stringify(analysis.music_genres || []),
      analysis.dress_code || 'casual',
      analysis.audience_composition || 'mixed',
      analysis.dating_energy || 'medium',
      analysis.table_culture || 'casual',
      analysis.gatekeeping_level || 'open',
      analysis.line_intensity || 'none',
      analysis.inclusivity_lgbtq || 'medium',
      JSON.stringify(analysis.weekly_profile || {}),
      analysis.momentum || 'stable',
      JSON.stringify(analysis.time_profile || {}),
      JSON.stringify(analysis.pricing_signals || {}),
      JSON.stringify(analysis.group_suitability || {}),
      JSON.stringify(analysis.warnings || []),
      JSON.stringify(analysis.food_intelligence || {}),
      JSON.stringify(analysis.crowd_flow || {}),
      analysis.summary || '',
      JSON.stringify(analysis.explore_tags || []),
      new Date().toISOString()
    );

    db.close();

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      intelligence: analysis,
      posts_analyzed: media.length
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
