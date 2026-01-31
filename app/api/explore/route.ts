import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const VENUES_PER_CATEGORY = 10;

// Safe JSON parse
function safeParse(json: string | null): any {
  try { return json ? JSON.parse(json) : null; } catch { return null; }
}

// Convert filter_json to SQL WHERE clause
// Returns { sql, params } where params are in order of ? placeholders
function buildWhereClause(filter: any, profile: any): { sql: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key.endsWith('_gte')) {
      const col = key.replace('_gte', '');
      conditions.push(`${col} >= ?`);
      params.push(value);
    } else if (key.endsWith('_lte')) {
      const col = key.replace('_lte', '');
      conditions.push(`${col} <= ?`);
      params.push(value);
    } else if (key.endsWith('_contains')) {
      const col = key.replace('_contains', '');
      conditions.push(`${col} LIKE ?`);
      params.push(`%${value}%`);
    } else if (value === 1 || value === true) {
      conditions.push(`${key} = 1`);
    } else if (value === 0 || value === false) {
      conditions.push(`(${key} = 0 OR ${key} IS NULL)`);
    } else {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  // Apply energy_ceiling if profile has it
  if (profile?.energy_ceiling && profile.energy_ceiling < 5) {
    conditions.push(`(acoustic_band <= ? OR acoustic_band IS NULL)`);
    params.push(profile.energy_ceiling);
  }

  return {
    sql: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  };
}

// Build audience scenes filter clause
// SAFETY LOGIC:
// - Users who selected "straight" or "mixed" can see unclassified (NULL) venues
// - Users who ONLY selected "lgbtq" should NOT see unclassified venues (could be unsafe)
// - This prevents mainstream venues from leaking into LGBTQ-only feeds
//
// TODO: Rename allowed_scenes → audience_scenes or visibility_scenes for clarity
function buildScenesClause(profile: any): { sql: string; params: any[] } {
  const allowed = safeParse(profile?.allowed_scenes);
  
  // No profile or no scenes = show everything (guest user)
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return { sql: '1=1', params: [] };
  }
  
  const placeholders = allowed.map(() => '?').join(', ');
  
  // Check if user allows mainstream/unclassified venues
  // Only users who selected "straight" or "mixed" should see NULL scene_type
  const allowsMainstream = allowed.includes('straight') || allowed.includes('mixed');
  
  if (allowsMainstream) {
    // User is OK with mainstream venues - include unclassified
    return {
      sql: `(scene_type IN (${placeholders}) OR scene_type IS NULL OR scene_type = '')`,
      params: [...allowed]
    };
  } else {
    // User only wants LGBTQ spaces - be strict, no unclassified venues
    // This protects LGBTQ users from accidentally seeing non-safe spaces
    return {
      sql: `scene_type IN (${placeholders})`,
      params: [...allowed]
    };
  }
}

// Determine voice_key from profile
function getVoiceKey(profile: any): string {
  if (!profile) return 'neutral';
  
  const age = profile.age_range;
  const gender = profile.gender;
  
  if (gender === 'male' && (age === '21-25' || age === '26-34')) {
    return 'young_male';
  }
  
  if (gender === 'female' && (age === '21-25' || age === '26-34')) {
    return 'young_female';
  }
  
  if (age === '35-44' || age === '45+') {
    return 'mature_professional';
  }
  
  return 'neutral';
}

// Generate reason for showing category
function getCategoryReason(categoryKey: string, profile: any): string | null {
  if (!profile) return null;
  
  const reasons: Record<string, string> = {
    'ladies_night': 'Perfect for your crew',
    'brunch_vibes': 'Weekend vibes',
    'sports_bars': 'Game day ready',
    'late_night_moves': 'For when you want to keep going',
    'date_spots': 'Picked for your dating vibe',
    'intimate_vibes': 'Cozy spots for two',
    'power_dinner': 'Impress the client',
    'upscale_lounges': 'Distinguished selections',
    'rooftop_vibes': 'Views for days',
    'trending_now': 'Hot in your city',
    'pregame_spots': 'Start the night right',
    'chill_spots': 'Low key options',
  };
  
  return reasons[categoryKey] || null;
}

export async function GET(request: NextRequest) {
  let db: any = null;
  
  try {
    db = new Database(dbPath);
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const city = searchParams.get('city') || 'New York';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get member profile if user_id provided
    let profile: any = null;
    let voiceKey = 'neutral';
    
    if (userId) {
      profile = db.prepare(`SELECT * FROM member_profiles WHERE user_id = ?`).get(userId);
      if (profile) {
        // Use stored voice_key or compute and persist it
        if (profile.voice_key) {
          voiceKey = profile.voice_key;
        } else {
          voiceKey = getVoiceKey(profile);
          db.prepare(`UPDATE member_profiles SET voice_key = ? WHERE user_id = ?`).run(voiceKey, userId);
        }
      }
    }
    
    // Build scenes filter from profile
    // Returns { sql, params } - params order matters for query binding
    const { sql: scenesClause, params: scenesParams } = buildScenesClause(profile);
    
    // Get all active categories
    const allCategories = db.prepare(`
      SELECT * FROM persona_categories 
      WHERE is_active = 1 
      ORDER BY display_order ASC
    `).all();
    
    // Filter categories based on user profile
    const matchingCategories = allCategories.filter((cat: any) => {
      // Check gender
      const genders = safeParse(cat.show_for_genders);
      if (genders && profile?.gender) {
        if (!genders.includes(profile.gender)) return false;
      }
      
      // Check age range
      const ages = safeParse(cat.show_for_age_ranges);
      if (ages && profile?.age_range) {
        if (!ages.includes(profile.age_range)) return false;
      }
      
      // Check goal
      const goals = safeParse(cat.show_for_goals);
      if (goals && profile?.primary_goal) {
        if (!goals.includes(profile.primary_goal)) return false;
      }
      
      return true;
    });
    
    // Build response with venues for each category
    const categories = [];
    
    for (const cat of matchingCategories.slice(0, limit)) {
      const filter = safeParse(cat.filter_json) || {};
      const { sql: whereClause, params: whereParams } = buildWhereClause(filter, profile);
      
      // Get title based on voice
      let title = cat.title_neutral;
      if (voiceKey === 'young_male') title = cat.title_young_male;
      else if (voiceKey === 'young_female') title = cat.title_young_female;
      else if (voiceKey === 'mature_professional') title = cat.title_mature_professional;
      
      // ============================================================
      // CRITICAL: SQL PARAMETER ORDER
      // The order of ? placeholders in SQL must match the order of
      // params passed to .all(). If you refactor, keep these aligned:
      //
      // SQL ORDER:           PARAMS ORDER:
      // 1. city = ?          1. city
      // 2. ${scenesClause}   2. ...scenesParams
      // 3. ${whereClause}    3. ...whereParams
      // 4. LIMIT ?           4. VENUES_PER_CATEGORY
      // ============================================================
      const venueQuery = `
        SELECT 
          id, name, category, address, neighborhood,
          google_photos, gallery_photos, image_url,
          energy_level, google_price_level, rating,
          vibe_tags, primary_vibes
        FROM venues
        WHERE city = ?
          AND should_exclude = 0
          AND (event_dependent = 0 OR event_dependent IS NULL)
          AND (
            (google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
            OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
            OR (image_url IS NOT NULL AND image_url != '')
          )
          AND ${scenesClause}
          AND ${whereClause}
        ORDER BY ABS(RANDOM() % 1000)
        LIMIT ?
      `;
      
      // Params MUST be in same order as SQL placeholders above
      const venues = db.prepare(venueQuery).all(
        city,                 // 1. WHERE city = ?
        ...scenesParams,      // 2. AND ${scenesClause}
        ...whereParams,       // 3. AND ${whereClause}
        VENUES_PER_CATEGORY   // 4. LIMIT ?
      );
      
      // Skip category if no venues match
      if (venues.length === 0) continue;
      
      // Process venues
      const processedVenues = venues.map((v: any) => {
        let imageUrl = null;
        
        for (const field of ['google_photos', 'gallery_photos']) {
          if (!imageUrl && v[field] && v[field] !== '' && v[field] !== '[]') {
            try {
              const photos = JSON.parse(v[field]);
              if (Array.isArray(photos) && photos.length > 0) imageUrl = photos[0];
            } catch {}
          }
        }
        if (!imageUrl && v.image_url) imageUrl = v.image_url;
        
        return {
          id: v.id,
          name: v.name,
          category: v.category,
          address: v.address,
          neighborhood: v.neighborhood,
          image_url: imageUrl,
          energy_level: v.energy_level,
          price_level: v.google_price_level,
          rating: v.rating,
        };
      });
      
      categories.push({
        key: cat.category_key,
        title: title,
        display_order: cat.display_order,
        reason: getCategoryReason(cat.category_key, profile),
        venue_count: processedVenues.length,
        venues: processedVenues,
      });
    }
    
    db.close();
    
    return NextResponse.json({
      user_id: userId,
      voice_key: voiceKey,
      city: city,
      // Debug: shows what scenes filter is applied (remove in prod if needed)
      allowed_scenes: profile ? safeParse(profile.allowed_scenes) : null,
      category_count: categories.length,
      categories: categories,
    });
    
  } catch (err) {
    console.error('[API /explore] Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to fetch explore data' }, { status: 500 });
  }
}
