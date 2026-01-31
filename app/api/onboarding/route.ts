import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

function computeVoiceKey(gender: string | null, ageRange: string | null): string {
  if (gender === 'male' && (ageRange === '21-25' || ageRange === '26-34')) {
    return 'young_male';
  }
  if (gender === 'female' && (ageRange === '21-25' || ageRange === '26-34')) {
    return 'young_female';
  }
  if (ageRange === '35-44' || ageRange === '45+') {
    return 'mature_professional';
  }
  return 'neutral';
}

export async function POST(request: NextRequest) {
  let db: any = null;
  
  try {
    const body = await request.json();
    
    const userId = Number(body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 });
    }

    const { 
      gender, 
      age_range, 
      life_stage, 
      primary_goal,
      energy_ceiling,
      preferred_scenes,
      exclude_vibes,
      budget_tier,
      allowed_scenes
    } = body;

    const validGenders = ['male', 'female', 'other'];
    const validAgeRanges = ['21-25', '26-34', '35-44', '45+'];
    const validLifeStages = ['single', 'dating', 'married'];
    const validGoals = ['social', 'dating', 'business', 'exploring'];
    const validBudgets = ['budget', 'moderate', 'splurge'];
    const validScenes = ['straight', 'lgbtq', 'mixed'];

    if (gender && !validGenders.includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }
    if (age_range && !validAgeRanges.includes(age_range)) {
      return NextResponse.json({ error: 'Invalid age_range' }, { status: 400 });
    }
    if (life_stage && !validLifeStages.includes(life_stage)) {
      return NextResponse.json({ error: 'Invalid life_stage' }, { status: 400 });
    }
    if (primary_goal && !validGoals.includes(primary_goal)) {
      return NextResponse.json({ error: 'Invalid primary_goal' }, { status: 400 });
    }
    if (budget_tier && !validBudgets.includes(budget_tier)) {
      return NextResponse.json({ error: 'Invalid budget_tier' }, { status: 400 });
    }
    
    // Validate allowed_scenes array
    if (allowed_scenes && Array.isArray(allowed_scenes)) {
      for (const scene of allowed_scenes) {
        if (!validScenes.includes(scene)) {
          return NextResponse.json({ error: `Invalid scene: ${scene}` }, { status: 400 });
        }
      }
    }

    db = new Database(dbPath);

    const existing = db.prepare(`SELECT gender, age_range, voice_key FROM member_profiles WHERE user_id = ?`).get(userId);
    
    const newGender = gender || existing?.gender || null;
    const newAgeRange = age_range || existing?.age_range || null;
    const voice_key = computeVoiceKey(newGender, newAgeRange);

    const stmt = db.prepare(`
      INSERT INTO member_profiles (
        user_id, gender, age_range, life_stage, primary_goal,
        energy_ceiling, preferred_scenes, exclude_vibes, budget_tier, voice_key, allowed_scenes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        gender = COALESCE(excluded.gender, gender),
        age_range = COALESCE(excluded.age_range, age_range),
        life_stage = COALESCE(excluded.life_stage, life_stage),
        primary_goal = COALESCE(excluded.primary_goal, primary_goal),
        energy_ceiling = COALESCE(excluded.energy_ceiling, energy_ceiling),
        preferred_scenes = COALESCE(excluded.preferred_scenes, preferred_scenes),
        exclude_vibes = COALESCE(excluded.exclude_vibes, exclude_vibes),
        budget_tier = COALESCE(excluded.budget_tier, budget_tier),
        voice_key = excluded.voice_key,
        allowed_scenes = COALESCE(excluded.allowed_scenes, allowed_scenes),
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      userId,
      gender || null,
      age_range || null,
      life_stage || null,
      primary_goal || null,
      energy_ceiling || 5,
      preferred_scenes ? JSON.stringify(preferred_scenes) : null,
      exclude_vibes ? JSON.stringify(exclude_vibes) : null,
      budget_tier || null,
      voice_key,
      allowed_scenes ? JSON.stringify(allowed_scenes) : '["mixed"]'
    );

    const profile = db.prepare(`SELECT * FROM member_profiles WHERE user_id = ?`).get(userId);
    db.close();

    return NextResponse.json({
      success: true,
      profile: {
        user_id: profile.user_id,
        gender: profile.gender,
        age_range: profile.age_range,
        life_stage: profile.life_stage,
        primary_goal: profile.primary_goal,
        energy_ceiling: profile.energy_ceiling,
        preferred_scenes: profile.preferred_scenes ? JSON.parse(profile.preferred_scenes) : null,
        exclude_vibes: profile.exclude_vibes ? JSON.parse(profile.exclude_vibes) : null,
        budget_tier: profile.budget_tier,
        voice_key: profile.voice_key,
        allowed_scenes: profile.allowed_scenes ? JSON.parse(profile.allowed_scenes) : ['mixed'],
      }
    });

  } catch (err) {
    console.error('[API /onboarding] Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  let db: any = null;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = Number(searchParams.get('user_id'));
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 });
    }

    db = new Database(dbPath, { readonly: true });
    const profile = db.prepare(`SELECT * FROM member_profiles WHERE user_id = ?`).get(userId);
    db.close();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      user_id: profile.user_id,
      gender: profile.gender,
      age_range: profile.age_range,
      life_stage: profile.life_stage,
      primary_goal: profile.primary_goal,
      energy_ceiling: profile.energy_ceiling,
      preferred_scenes: profile.preferred_scenes ? JSON.parse(profile.preferred_scenes) : null,
      exclude_vibes: profile.exclude_vibes ? JSON.parse(profile.exclude_vibes) : null,
      budget_tier: profile.budget_tier,
      voice_key: profile.voice_key,
      allowed_scenes: profile.allowed_scenes ? JSON.parse(profile.allowed_scenes) : ['mixed'],
    });

  } catch (err) {
    console.error('[API /onboarding] Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
