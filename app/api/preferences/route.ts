import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Fetch user preferences
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders });
  }

  const db = new Database(dbPath, { readonly: true });
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  db.close();

  if (!prefs) {
    return NextResponse.json({ exists: false, preferences: null }, { headers: corsHeaders });
  }

  const parsed = {
    ...prefs,
    music_genres: JSON.parse(prefs.music_genres || '[]'),
    night_style: JSON.parse(prefs.night_style || '[]'),
    support_preferences: JSON.parse(prefs.support_preferences || '[]'),
    extras: JSON.parse(prefs.extras || '[]'),
    daytime_interests: JSON.parse(prefs.daytime_interests || '[]'),
    dietary: JSON.parse(prefs.dietary || '[]'),
  };

  return NextResponse.json({ exists: true, preferences: parsed }, { headers: corsHeaders });
}

// POST - Create or update preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...prefs } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);

    const musicGenres = JSON.stringify(prefs.music_genres || []);
    const nightStyle = JSON.stringify(prefs.night_style || []);
    const supportPrefs = JSON.stringify(prefs.support_preferences || []);
    const extras = JSON.stringify(prefs.extras || []);
    const daytimeInterests = JSON.stringify(prefs.daytime_interests || []);
    const dietary = JSON.stringify(prefs.dietary || []);

    db.prepare(`
      INSERT INTO user_preferences (
        user_id, music_genres, energy_level, crowd_vibe, night_style, support_preferences,
        extras, relationship_status, daytime_interests, dietary, home_city,
        onboarding_complete, notify_vegan, notify_halal, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        music_genres = excluded.music_genres,
        energy_level = excluded.energy_level,
        crowd_vibe = excluded.crowd_vibe,
        night_style = excluded.night_style,
        support_preferences = excluded.support_preferences,
        extras = excluded.extras,
        relationship_status = excluded.relationship_status,
        daytime_interests = excluded.daytime_interests,
        dietary = excluded.dietary,
        home_city = excluded.home_city,
        onboarding_complete = excluded.onboarding_complete,
        notify_vegan = excluded.notify_vegan,
        notify_halal = excluded.notify_halal,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      userId,
      musicGenres,
      prefs.energy_level || 'social',
      prefs.crowd_vibe || null,
      nightStyle,
      supportPrefs,
      extras,
      prefs.relationship_status || null,
      daytimeInterests,
      dietary,
      prefs.home_city || 'Manhattan',
      prefs.onboarding_complete ? 1 : 0,
      prefs.notify_vegan ? 1 : 0,
      prefs.notify_halal ? 1 : 0
    );

    db.close();

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Preferences API error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
