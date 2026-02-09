import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function safeParse(json: string | null): any {
  try { return json ? JSON.parse(json) : null; } catch { return null; }
}

function isTruthy(val: any): boolean {
  return val === 1 || val === '1' || val === true;
}

function getPhotoUrl(venue: any): string | null {
  const gallery = safeParse(venue.gallery_photos);
  if (Array.isArray(gallery) && gallery.length > 0) return gallery[0];
  const google = safeParse(venue.google_photos);
  if (Array.isArray(google) && google.length > 0) return google[0];
  return venue.image_url || null;
}

function getVibeTags(venue: any): string[] {
  const tags: string[] = [];
  if (venue.energy_level === 'low' || venue.energy_level === 'chill') tags.push('chill');
  if (venue.energy_level === 'high' || venue.energy_level === 'lively') tags.push('lit');
  if (venue.cuisine_style === 'upscale' || (venue.google_price_level || 0) >= 3) tags.push('upscale');
  if (venue.cuisine_style === 'casual' || venue.dress_code === 'casual') tags.push('casual');
  if ((venue.score_first_date || 0) > 40) tags.push('date-night');
  if ((venue.score_group_night || 0) > 40) tags.push('crew');
  if (isTruthy(venue.late_night_spot)) tags.push('late-night');
  if (isTruthy(venue.pregame_spot)) tags.push('pregame');
  const category = (venue.category || venue.primary_category || '').toLowerCase();
  const loungeType = (venue.lounge_type || '').toLowerCase();
  if (category.includes('rooftop') || loungeType.includes('rooftop')) tags.push('rooftop');
  return [...new Set(tags)].slice(0, 3);
}

function processVenue(venue: any): any {
  return {
    id: venue.id,
    name: venue.name,
    image_url: getPhotoUrl(venue),
    neighborhood: venue.neighborhood,
    city: venue.city,
    category: venue.category || venue.primary_category,
    lounge_type: venue.lounge_type,
    energy_level: venue.energy_level,
    price_level: venue.google_price_level || venue.price_tier,
    rating: venue.rating || venue.google_rating,
    vibe_tags: getVibeTags(venue),
  };
}

function shuffleWithSeed(array: any[], seed: number): any[] {
  const result = [...array];
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getDailySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

const MOODS = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'chill', label: 'Chill', emoji: '💆' },
  { key: 'upscale', label: 'Upscale', emoji: '✨' },
  { key: 'late_night', label: 'Late Night', emoji: '🌙' },
  { key: 'date_night', label: 'Date Night', emoji: '💕' },
  { key: 'crew', label: 'Crew', emoji: '👥' },
  { key: 'lit', label: 'Lit', emoji: '🔥' },
];

const MOOD_FILTERS: Record<string, (v: any) => boolean> = {
  all: () => true,
  chill: (v) => v.energy_level === 'low' || v.energy_level === 'chill' || v.energy_level === 'medium',
  upscale: (v) => v.cuisine_style === 'upscale' || (v.google_price_level || 0) >= 3,
  late_night: (v) => isTruthy(v.late_night_spot),
  date_night: (v) => (v.score_first_date || 0) > 25,
  crew: (v) => (v.score_group_night || 0) > 25,
  lit: (v) => v.energy_level === 'high' || v.energy_level === 'lively',
};

const ROW_CONFIGS: Record<string, { title: string; emoji: string; filter: (v: any) => boolean }> = {
  trending: { title: 'Trending Tonight', emoji: '🔥', filter: () => true },
  chill_lounges: { title: 'Chill Lounges', emoji: '💆', filter: v => (v.energy_level === 'low' || v.energy_level === 'chill' || v.energy_level === 'medium') && ((v.category || '').toLowerCase().includes('lounge') || (v.lounge_type || '') !== '') },
  upscale: { title: 'Upscale Vibes', emoji: '✨', filter: v => v.cuisine_style === 'upscale' || (v.google_price_level || 0) >= 3 },
  date_night: { title: 'Date Night Vibes', emoji: '💕', filter: v => (v.score_first_date || 0) > 25 },
  crew: { title: 'Crew Vibes', emoji: '👥', filter: v => (v.score_group_night || 0) > 25 },
  late_night: { title: 'Late Night', emoji: '🌙', filter: v => isTruthy(v.late_night_spot) },
  lit_bars: { title: 'Lit Bars', emoji: '🍻', filter: v => (v.energy_level === 'high' || v.energy_level === 'lively') && (v.category || '').toLowerCase().includes('bar') },
  clubs: { title: 'Clubs', emoji: '🪩', filter: v => (v.category || '').toLowerCase().includes('club') || (v.category || '').toLowerCase().includes('nightclub') },
  rooftops: { title: 'Rooftops', emoji: '🌆', filter: v => (v.category || '').toLowerCase().includes('rooftop') || (v.lounge_type || '').toLowerCase().includes('rooftop') },
  hookah: { title: 'Hookah Lounges', emoji: '💨', filter: v => isTruthy(v.has_hookah) || (v.lounge_type || '').toLowerCase().includes('hookah') },
};

const ROW_ORDER = ['trending', 'chill_lounges', 'upscale', 'date_night', 'crew', 'late_night', 'lit_bars', 'clubs', 'rooftops', 'hookah'];

// ============================================
// SOUND & CULTURE FILTERS
// ============================================
const SOUND_FILTERS: Record<string, (v: any) => boolean> = {
  all: () => true,
  afro: (v) => {
    const scene = (v.primary_scene || '').toLowerCase();
    const genres = (typeof v.music_genres === 'string' ? v.music_genres : JSON.stringify(v.music_genres || '')).toLowerCase();
    return scene === 'afrobeats' || genres.includes('afrobeat') || genres.includes('dancehall') || genres.includes('soca');
  },
  hiphop: (v) => {
    const scene = (v.primary_scene || '').toLowerCase();
    const genres = (typeof v.music_genres === 'string' ? v.music_genres : JSON.stringify(v.music_genres || '')).toLowerCase();
    return scene === 'hiphop' || genres.includes('hip-hop') || genres.includes('hip hop') || genres.includes('r&b') || genres.includes('rnb') || genres.includes('rap');
  },
  latin: (v) => {
    const scene = (v.primary_scene || '').toLowerCase();
    const genres = (typeof v.music_genres === 'string' ? v.music_genres : JSON.stringify(v.music_genres || '')).toLowerCase();
    return scene === 'latin' || genres.includes('reggaeton') || genres.includes('salsa') || genres.includes('bachata') || genres.includes('latin');
  },
};

const SOUNDS = [
  { key: 'all', label: 'All Sounds', emoji: '🎵' },
  { key: 'afro', label: 'Afro', emoji: '🌍' },
  { key: 'hiphop', label: 'Hip-Hop & R&B', emoji: '🎤' },
  { key: 'latin', label: 'Latin', emoji: '💃' },
];

export async function GET(request: NextRequest) {
  let db: any = null;
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city') || 'Manhattan';
    const mood = searchParams.get('mood') || 'all';
    const sound = searchParams.get('sound') || 'all';
    const row = searchParams.get('row');
    const limit = parseInt(searchParams.get('limit') || '20');

    db = new Database(dbPath, { readonly: true });

    // ============================================
    // CATEGORY HARD WALL — nightlife venues ONLY
    // No restaurants, no food trucks, no museums
    // ============================================
    const venues = db.prepare(`
      SELECT * FROM venues
      WHERE should_exclude = 0
        AND city = ?
        AND category IN ('nightclub', 'lounge', 'bar', 'rooftop', 'live_music')
        AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
          OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
          OR (image_url IS NOT NULL AND image_url != ''))
      LIMIT 2000
    `).all(city);

    db.close();

    const moodFilter = MOOD_FILTERS[mood] || MOOD_FILTERS.all;
    const soundFilter = SOUND_FILTERS[sound] || SOUND_FILTERS.all;
    const filtered = venues.filter(v => moodFilter(v) && soundFilter(v));
    
    const seed = getDailySeed();
    const shuffled = shuffleWithSeed(filtered, seed);

    // SINGLE ROW MODE (see-all)
    if (row && ROW_CONFIGS[row]) {
      const config = ROW_CONFIGS[row];
      let list = shuffled.filter(config.filter);
      list = list.slice(0, Math.min(limit, 100));

      return NextResponse.json({
        mode: 'see-all',
        row,
        title: config.title,
        emoji: config.emoji,
        city,
        total_venues: list.length,
        venues: list.map(processVenue),
      }, { headers: corsHeaders });
    }

    // FEED MODE
    const sections = ROW_ORDER.map(key => {
      const config = ROW_CONFIGS[key];
      const list = shuffled.filter(config.filter);

      return {
        key,
        title: config.title,
        emoji: config.emoji,
        venues: list.slice(0, limit).map(processVenue),
        total: list.length,
        total_matching: list.length,
        was_expanded: false,
        areas_included: [city],
      };
    }).filter(s => s.venues.length > 0);

    return NextResponse.json({
      mode: 'feed',
      moods: MOODS,
      sounds: SOUNDS,
      city,
      mood,
      sound,
      total_venues: filtered.length,
      section_count: sections.length,
      sections,
    }, { headers: corsHeaders });

  } catch (error: any) {
    if (db) db.close();
    console.error('Nightlife API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nightlife venues', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
