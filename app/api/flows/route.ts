import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Database from 'better-sqlite3';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, who_with, when, vibe, cuisine, music } = body || {};

    if (!city || !who_with || !when || !vibe) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: city, who_with, when, vibe' },
        { status: 400 }
      );
    }

    console.log('Flows API called:', { city, who_with, when, vibe, cuisine, music });

    const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
    const db = new Database(dbPath);

    const venues = db.prepare(`
      SELECT id, name, neighborhood, cuisine, cuisine_primary,
             music_genres_normalized, vibe_tags, viberyte_certified,
             viberyte_score, price_tier, rating,
             professional_photos, professional_photo_url
      FROM venues
      WHERE city LIKE ?
      ORDER BY viberyte_score DESC
      LIMIT 200
    `).all(`%${city}%`);

    const events = db.prepare(`
      SELECT id, name, venue_name, event_date, start_datetime, end_datetime,
             music_genre, vibe_tags
      FROM events
      WHERE event_date >= date('now')
      ORDER BY event_date ASC
      LIMIT 50
    `).all();

    db.close();

    console.log(`Loaded ${venues.length} venues and ${events.length} events`);

    const simplifiedVenues = venues.slice(0, 60).map((v: any) => ({
      id: v.id,
      name: v.name,
      neighborhood: v.neighborhood || null,
      cuisine: v.cuisine_primary || v.cuisine || null,
      vibeTags: v.vibe_tags,
      musicGenres: v.music_genres_normalized,
      isCertified: !!v.viberyte_certified,
      score: v.viberyte_score,
      priceTier: v.price_tier
    }));

    const simplifiedEvents = events.slice(0, 40).map((e: any) => ({
      id: e.id,
      name: e.name,
      venueName: e.venue_name,
      date: e.event_date,
      startTime: e.start_datetime,
      endTime: e.end_datetime,
      musicGenres: e.music_genre,
      vibeTags: e.vibe_tags
    }));

    const prompt = `You are Viberyte, a nightlife concierge creating evening flows for ${city}.

User Context:
- Who: ${who_with}
- When: ${when}
- Main Activity: ${vibe}
- Cuisine: ${cuisine || 'Any'}
- After Dinner: ${music || 'Any'}

YOU MUST ONLY choose stops from the venues and events listed below. DO NOT invent venue names.

Available Venues (JSON):
${JSON.stringify(simplifiedVenues)}

Available Events (JSON):
${JSON.stringify(simplifiedEvents)}

Create 7 complete evening flow experiences. Each flow should have 2-3 stops with specific times, venue names, and reasoning.

CRITICAL: The "name" field in each stop MUST EXACTLY match a venue name from the list above.

Respond with ONLY valid JSON in this exact structure (no markdown):

{
  "topPick": {
    "title": "string",
    "reasoning": "string",
    "stops": [
      {
        "type": "dinner | lounge | bar | club | event | dessert",
        "time": "e.g. 7:00 PM",
        "duration": "e.g. 90 mins",
        "name": "MUST match one of the venue or event names above",
        "venueId": number (the id from the venue list),
        "description": "short why this stop fits the flow and user context",
        "neighborhood": "string or null"
      }
    ],
    "totalTravel": "short description",
    "vibe": "short label"
  },
  "alternatives": [ ... 3 flows same structure ... ],
  "quickOptions": [ ... 3 shorter flows same structure ... ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a JSON generator. Always output a single JSON object that matches the requested schema. Do not include markdown or explanations.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2500
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { ok: false, error: 'Empty response from OpenAI' },
        { status: 500 }
      );
    }

    let flows: any;
    try {
      flows = JSON.parse(content);
    } catch (err: any) {
      console.error('JSON Parse Error:', err.message);
      return NextResponse.json(
        { ok: false, error: `Failed to parse AI response: ${err.message}` },
        { status: 500 }
      );
    }

    if (
      !flows ||
      !flows.topPick ||
      !Array.isArray(flows.alternatives) ||
      !Array.isArray(flows.quickOptions)
    ) {
      console.error('Invalid flow structure:', flows);
      return NextResponse.json(
        { ok: false, error: 'AI returned invalid flow structure' },
        { status: 500 }
      );
    }

    console.log('Successfully generated flows');

    return NextResponse.json({
      ok: true,
      userContext: { who_with, when, vibe, cuisine, music, city },
      flows
    });
  } catch (error: any) {
    console.error('Flows API Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
