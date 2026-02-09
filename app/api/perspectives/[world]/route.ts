import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================
// TYPES
// ============================================
type WorldType = 'dining' | 'nightlife';

interface WorldConfig {
  key: string;
  title: string;
  tone: string;
  gradient: [string, string];
  world_type: WorldType;
  cuisineMatchers: string[];
  tagMatchers: string[];
  subCuisines: { key: string; title: string; matchers: string[]; field?: string }[];
  neighbors: string[];
  allowedDials?: string[];
  requiredScene?: string | string[];
}

interface UmbrellaConfig {
  key: string;
  title: string;
  emoji: string;
  tone: string;
  gradient: [string, string];
  children: { key: string; title: string; lenses: string[] }[];
  neighbors: string[];
}

// ============================================
// CATEGORY HARD WALL
// Dining = restaurants only. Nightlife = venues only. No exceptions.
// ============================================
const CATEGORY_FILTERS: Record<WorldType, string> = {
  dining: "AND category IN ('restaurant','food_truck','cafe','bistro','bakery')",
  nightlife: "AND category IN ('nightclub','lounge','bar','rooftop','live_music')",
};

// ============================================
// UMBRELLA WORLDS (aggregators — recommendations only)
// ============================================
const UMBRELLAS: Record<string, UmbrellaConfig> = {
  soul: {
    key: 'soul',
    title: 'Soul',
    emoji: '🍗',
    tone: 'The culture. The roots. The flavor.',
    gradient: ['#1a1510', '#0a0a08'],
    children: [
      { key: 'soul_food', title: 'Soul Food', lenses: ['soul_food'] },
      { key: 'african', title: 'African', lenses: ['african'] },
      { key: 'caribbean', title: 'Caribbean', lenses: ['caribbean'] },
    ],
    neighbors: ['latin', 'european'],
  },
  asia: {
    key: 'asia',
    title: 'Asia',
    emoji: '🥢',
    tone: 'From quiet counters to neon nights.',
    gradient: ['#10121a', '#08080d'],
    children: [
      { key: 'japanese', title: 'Japanese', lenses: ['japanese'] },
      { key: 'chinese', title: 'Chinese', lenses: ['chinese'] },
      { key: 'korean', title: 'Korean', lenses: ['korean'] },
      { key: 'thai', title: 'Thai & Vietnamese', lenses: ['thai'] },
      { key: 'indian', title: 'Indian', lenses: ['indian'] },
    ],
    neighbors: ['soul', 'european'],
  },
  latin_umbrella: {
    key: 'latin_umbrella',
    title: 'Latin',
    emoji: '💃',
    tone: 'Passion on every plate.',
    gradient: ['#1a0a0f', '#0d0508'],
    children: [
      { key: 'mexican', title: 'Mexican', lenses: ['mexican'] },
      { key: 'latin', title: 'Latin American', lenses: ['latin', 'latin_american'] },
    ],
    neighbors: ['soul', 'european'],
  },
  european: {
    key: 'european',
    title: 'European',
    emoji: '🍝',
    tone: 'Old world charm, timeless taste.',
    gradient: ['#18100a', '#0a0805'],
    children: [
      { key: 'italian', title: 'Italian', lenses: ['italian'] },
      { key: 'french', title: 'French', lenses: ['french'] },
      { key: 'mediterranean', title: 'Mediterranean', lenses: ['mediterranean'] },
      { key: 'american', title: 'American', lenses: ['american'] },
    ],
    neighbors: ['asia', 'prime'],
  },
  prime: {
    key: 'prime',
    title: 'Prime',
    emoji: '🥩',
    tone: 'For the bold appetite.',
    gradient: ['#1a0a08', '#0d0504'],
    children: [
      { key: 'steakhouse', title: 'Steakhouse', lenses: ['steakhouse'] },
      { key: 'seafood', title: 'Seafood', lenses: ['seafood'] },
    ],
    neighbors: ['european', 'asia'],
  },
};

// ============================================
// DINING WORLDS — world_type: 'dining' enforces restaurant-only
// ============================================
const DINING_WORLDS: Record<string, WorldConfig> = {
  caribbean: { key: 'caribbean', world_type: 'dining', title: 'Caribbean', tone: 'Bold flavors, music-forward dining', gradient: ['#1a1510', '#0d0a08'], cuisineMatchers: ['Caribbean', 'Jamaican', 'Haitian', 'Dominican', 'Trinidadian', 'Puerto Rican', 'Cuban'], tagMatchers: ['caribbean', 'jamaican', 'haitian', 'jerk', 'oxtail'], subCuisines: [{ key: 'jamaican', title: 'Jamaican Classics', matchers: ['jamaican', 'jerk'] }, { key: 'haitian', title: 'Haitian & Dominican', matchers: ['haitian', 'dominican'] }], neighbors: ['soul_food', 'african', 'latin'] },
  mexican: { key: 'mexican', world_type: 'dining', title: 'Mexican', tone: 'From taco counters to mezcal bars', gradient: ['#1a1008', '#0d0804'], cuisineMatchers: ['Mexican', 'Tex-Mex'], tagMatchers: ['mexican', 'taco', 'mezcal'], subCuisines: [], neighbors: ['latin', 'caribbean'] },
  italian: { key: 'italian', world_type: 'dining', title: 'Italian', tone: 'Pasta, wine, and the art of slowing down', gradient: ['#18100a', '#0a0805'], cuisineMatchers: ['Italian'], tagMatchers: ['italian', 'pasta', 'pizza'], subCuisines: [], neighbors: ['french', 'mediterranean'] },
  japanese: { key: 'japanese', world_type: 'dining', title: 'Japanese', tone: 'From quiet counters to neon-lit nights', gradient: ['#10121a', '#08080d'], cuisineMatchers: ['Japanese', 'Sushi', 'Ramen'], tagMatchers: ['japanese', 'sushi', 'ramen', 'omakase'], subCuisines: [], neighbors: ['korean', 'chinese'] },
  mediterranean: { key: 'mediterranean', world_type: 'dining', title: 'Mediterranean', tone: 'Fresh plates, shared tables', gradient: ['#0a1518', '#050a0c'], cuisineMatchers: ['Mediterranean', 'Greek', 'Lebanese', 'Turkish'], tagMatchers: ['mediterranean', 'greek', 'hummus'], subCuisines: [], neighbors: ['italian', 'french'] },
  soul_food: { key: 'soul_food', world_type: 'dining', title: 'Soul Food', tone: 'Food made with history and heart', gradient: ['#1a1510', '#0a0a08'], cuisineMatchers: ['Soul Food', 'Soul Food & Southern', 'Southern'], tagMatchers: ['soul food', 'southern'], subCuisines: [], neighbors: ['caribbean', 'african', 'american'] },
  african: { key: 'african', world_type: 'dining', title: 'African', tone: 'Flavors from the continent', gradient: ['#1a1510', '#0d0a08'], cuisineMatchers: ['African', 'Ethiopian', 'Nigerian', 'Senegalese', 'Ghanaian', 'West African', 'East African'], tagMatchers: ['african', 'ethiopian', 'nigerian', 'jollof'], subCuisines: [], neighbors: ['soul_food', 'caribbean'] },
  thai: { key: 'thai', world_type: 'dining', title: 'Thai', tone: 'Bold flavor, comforting heat', gradient: ['#1a1208', '#0d0904'], cuisineMatchers: ['Thai', 'Vietnamese'], tagMatchers: ['thai', 'pad thai', 'curry', 'pho', 'vietnamese'], subCuisines: [], neighbors: ['chinese', 'korean'] },
  korean: { key: 'korean', world_type: 'dining', title: 'Korean', tone: 'BBQ smoke and banchan spreads', gradient: ['#1a1015', '#0d080a'], cuisineMatchers: ['Korean', 'Korean BBQ'], tagMatchers: ['korean', 'bbq', 'kimchi'], subCuisines: [], neighbors: ['japanese', 'chinese'] },
  chinese: { key: 'chinese', world_type: 'dining', title: 'Chinese', tone: 'Dim sum carts to late-night dumplings', gradient: ['#1a1008', '#0d0804'], cuisineMatchers: ['Chinese', 'Cantonese', 'Sichuan'], tagMatchers: ['chinese', 'dim sum', 'dumpling'], subCuisines: [], neighbors: ['japanese', 'korean'] },
  indian: { key: 'indian', world_type: 'dining', title: 'Indian', tone: 'Spiced, aromatic, deeply flavorful', gradient: ['#1a1208', '#0d0904'], cuisineMatchers: ['Indian', 'Pakistani'], tagMatchers: ['indian', 'curry', 'tandoori'], subCuisines: [], neighbors: ['thai', 'mediterranean'] },
  seafood: { key: 'seafood', world_type: 'dining', title: 'Seafood', tone: 'Oysters and ocean-to-table freshness', gradient: ['#0a1520', '#050a10'], cuisineMatchers: ['Seafood'], tagMatchers: ['seafood', 'oyster', 'lobster'], subCuisines: [], neighbors: ['steakhouse', 'american'] },
  steakhouse: { key: 'steakhouse', world_type: 'dining', title: 'Steakhouse', tone: 'Dry-aged, perfectly seared', gradient: ['#1a0a08', '#0d0504'], cuisineMatchers: ['Steakhouse', 'Steakhouse & Seafood'], tagMatchers: ['steakhouse', 'steak'], subCuisines: [], neighbors: ['seafood', 'american'] },
  latin_american: { key: 'latin_american', world_type: 'dining', title: 'Latin American', tone: 'Passion, flavor, vibrant nights', gradient: ['#1a1008', '#0d0804'], cuisineMatchers: ['Latin American', 'Peruvian', 'Colombian', 'Brazilian', 'Venezuelan', 'Ecuadorian'], tagMatchers: ['latin', 'peruvian', 'colombian'], subCuisines: [], neighbors: ['mexican', 'caribbean'] },
  latin: { key: 'latin', world_type: 'dining', title: 'Latin American', tone: 'Passion, flavor, vibrant nights', gradient: ['#1a1008', '#0d0804'], cuisineMatchers: ['Latin American', 'Peruvian', 'Colombian', 'Brazilian', 'Venezuelan', 'Ecuadorian'], tagMatchers: ['latin', 'peruvian', 'colombian'], subCuisines: [], neighbors: ['mexican', 'caribbean'] },
  french: { key: 'french', world_type: 'dining', title: 'French', tone: 'Bistros and buttery indulgence', gradient: ['#14101a', '#0a080d'], cuisineMatchers: ['French', 'Bistro'], tagMatchers: ['french', 'bistro'], subCuisines: [], neighbors: ['italian', 'mediterranean'] },
  american: { key: 'american', world_type: 'dining', title: 'American', tone: 'Burgers, BBQ, everything in between', gradient: ['#1a1210', '#0d0908'], cuisineMatchers: ['American', 'New American'], tagMatchers: ['american', 'burger', 'bbq'], subCuisines: [], neighbors: ['steakhouse', 'soul_food'] },
};

// ============================================
// NIGHTLIFE WORLDS — world_type: 'nightlife' enforces venue-only
// ============================================
const NIGHTLIFE_WORLDS: Record<string, WorldConfig> = {
  outside: { key: 'outside', world_type: 'nightlife', title: 'Outside', tone: 'Afrobeats, Hip-Hop & R&B nights', gradient: ['#1a0f0a', '#0d0805'], cuisineMatchers: [], tagMatchers: [], subCuisines: [{ key: 'hookah_lounges', title: 'Hookah Lounges', matchers: ['hookah'], field: 'has_hookah' }, { key: 'dinner_vibes', title: 'Dinner → Vibes', matchers: ['restaurant'] }, { key: 'late_night', title: 'Late Night Spots', matchers: ['late-night'] }, { key: 'chill_lounges', title: 'Chill Lounges', matchers: ['lounge'] }], neighbors: ['latin_nights', 'main_stage'], allowedDials: ['all', 'hookah_lounges', 'dinner_vibes', 'late_night', 'chill_lounges'], requiredScene: 'afrobeats' },
  latin_nights: { key: 'latin_nights', world_type: 'nightlife', title: 'Latin Nights', tone: 'Reggaeton, Salsa & Bachata', gradient: ['#1a0a0f', '#0d0508'], cuisineMatchers: [], tagMatchers: [], subCuisines: [{ key: 'latin_restaurants', title: 'Latin Restaurants', matchers: ['restaurant'] }, { key: 'latin_lounges', title: 'Latin Lounges', matchers: ['lounge'] }, { key: 'hookah_latin', title: 'Hookah Latin Spots', matchers: ['hookah'], field: 'has_hookah' }, { key: 'turn_up', title: 'Turn Up Latin', matchers: ['nightclub', 'high-energy'] }], neighbors: ['outside', 'main_stage'], allowedDials: ['all', 'latin_restaurants', 'latin_lounges', 'hookah_latin', 'turn_up'], requiredScene: 'latin' },
  pulse: { key: 'pulse', world_type: 'nightlife', title: 'Pulse', tone: 'EDM, House & Techno', gradient: ['#0a0f1a', '#050810'], cuisineMatchers: [], tagMatchers: [], subCuisines: [{ key: 'warehouse', title: 'Warehouse & Underground', matchers: ['warehouse', 'underground'] }, { key: 'megaclubs', title: 'Megaclubs', matchers: ['nightclub', 'upscale'] }, { key: 'rooftop_pulse', title: 'Rooftop Sets', matchers: ['rooftop'] }], neighbors: ['main_stage', 'low_light'], allowedDials: ['all', 'warehouse', 'megaclubs', 'rooftop_pulse'], requiredScene: ['house', 'edm'] },
  main_stage: { key: 'main_stage', world_type: 'nightlife', title: 'Main Stage', tone: 'Hip-Hop, R&B & Top-40', gradient: ['#14101a', '#0a080d'], cuisineMatchers: [], tagMatchers: [], subCuisines: [{ key: 'bottle_service', title: 'Bottle Service', matchers: ['bottle-service', 'upscale'] }, { key: 'dance_floors', title: 'Dance Floors', matchers: ['dancing', 'nightclub'] }, { key: 'rooftop_party', title: 'Rooftop Parties', matchers: ['rooftop'] }], neighbors: ['pulse', 'outside'], allowedDials: ['all', 'bottle_service', 'dance_floors', 'rooftop_party'], requiredScene: 'hiphop' },
  low_light: { key: 'low_light', world_type: 'nightlife', title: 'Low Light', tone: 'Lounges, Cocktails & Chill', gradient: ['#0f0a14', '#08050a'], cuisineMatchers: [], tagMatchers: [], subCuisines: [{ key: 'speakeasy', title: 'Speakeasies', matchers: ['speakeasy'] }, { key: 'live_jazz', title: 'Live Jazz', matchers: ['live-jazz', 'jazz'] }, { key: 'wine_bars', title: 'Wine Bars', matchers: ['wine'] }, { key: 'cocktail_dens', title: 'Cocktail Dens', matchers: ['cocktail'] }], neighbors: ['pulse', 'latin_nights'], allowedDials: ['all', 'speakeasy', 'live_jazz', 'wine_bars', 'cocktail_dens'], requiredScene: 'mixed' },
  lounges: { key: 'lounges', world_type: 'nightlife', title: 'Lounges', tone: 'Where the night takes shape', gradient: ['#14101a', '#0a080d'], cuisineMatchers: [], tagMatchers: ['lounge'], subCuisines: [{ key: 'upscale_lounge', title: 'Upscale Lounges', matchers: ['upscale'] }, { key: 'cocktail_lounge', title: 'Cocktail Lounges', matchers: ['cocktail', 'speakeasy'] }, { key: 'hookah', title: 'Hookah Lounges', matchers: ['hookah', 'shisha'], field: 'has_hookah' }], neighbors: ['bars', 'rooftops', 'clubs'], allowedDials: ['all', 'pregame', 'high_energy', 'upscale', 'casual', 'late_night', 'hookah'] },
  bars: { key: 'bars', world_type: 'nightlife', title: 'Bars', tone: 'From dive bars to craft cocktails', gradient: ['#14101a', '#0a080d'], cuisineMatchers: [], tagMatchers: ['bar'], subCuisines: [{ key: 'cocktail_bar', title: 'Cocktail Bars', matchers: ['cocktail', 'speakeasy'] }, { key: 'dive', title: 'Dive Bars', matchers: ['dive'] }, { key: 'sports', title: 'Sports Bars', matchers: ['sports'] }], neighbors: ['lounges', 'clubs'], allowedDials: ['all', 'pregame', 'high_energy', 'casual', 'late_night'] },
  clubs: { key: 'clubs', world_type: 'nightlife', title: 'Clubs', tone: 'When you came to move, not talk', gradient: ['#1a0812', '#0d0408'], cuisineMatchers: [], tagMatchers: ['club', 'nightclub'], subCuisines: [{ key: 'upscale_club', title: 'Upscale Clubs', matchers: ['upscale'] }, { key: 'hiphop', title: 'Hip-Hop & R&B', matchers: ['hip-hop', 'r&b'], field: 'music_genres' }, { key: 'afrobeats', title: 'Afrobeats & Caribbean', matchers: ['afrobeats', 'dancehall', 'soca'], field: 'music_genres' }, { key: 'latin', title: 'Latin Nights', matchers: ['latin', 'reggaeton', 'salsa', 'bachata'], field: 'music_genres' }, { key: 'edm', title: 'House & EDM', matchers: ['house', 'edm', 'techno', 'top-40', 'electronic'], field: 'music_genres' }], neighbors: ['lounges', 'bars'], allowedDials: ['all', 'pregame', 'late_night', 'high_energy', 'upscale'] },
  rooftops: { key: 'rooftops', world_type: 'nightlife', title: 'Rooftops', tone: 'City lights, good company', gradient: ['#081520', '#040a10'], cuisineMatchers: [], tagMatchers: ['rooftop'], subCuisines: [], neighbors: ['lounges', 'bars'], allowedDials: ['all', 'pregame', 'upscale', 'casual'] },
};

// Merged lookup
const WORLDS: Record<string, WorldConfig> = { ...DINING_WORLDS, ...NIGHTLIFE_WORLDS };

// ============================================
// HELPERS
// ============================================
function safeParse(json: string | null): any { try { return json ? JSON.parse(json) : null; } catch { return null; } }
function isTruthy(val: any): boolean { return val === 1 || val === '1' || val === true; }

function matchesWorld(venue: any, config: WorldConfig): boolean {
  // ============================================
  // DINING WORLDS: Match on primary_lens ONLY
  // primary_lens is canonical. No secondary/tag scanning.
  // This prevents American restaurants with "Soul Food" in
  // cuisine_secondary from appearing in Soul Food world.
  // ============================================
  if (config.world_type === 'dining') {
    const lens = (venue.primary_lens || '').toLowerCase();
    return lens === config.key.toLowerCase();
  }

  // ============================================
  // NIGHTLIFE WORLDS: Full matching pipeline
  // ============================================

  // Scene-based matching for vibe lenses (outside, latin_nights, pulse, main_stage, low_light)
  if (config.requiredScene) {
    const venueScene = (venue.primary_scene || '').toLowerCase();
    if (!venueScene || venueScene === 'none') return false;
    if (Array.isArray(config.requiredScene)) {
      return config.requiredScene.some(s => venueScene === s.toLowerCase());
    }
    return venueScene === config.requiredScene.toLowerCase();
  }

  // Hookah special case for lounges
  if (config.key === 'lounges' && isTruthy(venue.has_hookah)) return true;

  // Tag matching for venue-type worlds (lounges, bars, clubs, rooftops)
  const category = (venue.category || venue.primary_category || '').toLowerCase();
  const loungeType = (venue.lounge_type || '').toLowerCase();
  if (config.tagMatchers.some(t => category.includes(t) || loungeType.includes(t))) return true;

  return false;
}

function matchesSubCuisine(venue: any, matchers: string[], field?: string): boolean {
  if (field === 'has_hookah' && isTruthy(venue.has_hookah)) return true;
  if (field === 'has_hookah' && (venue.lounge_type || '').toLowerCase().includes('hookah')) return true;
  if (field === 'music_genres') {
    const genres = safeParse(venue.music_genres) || [];
    const str = (Array.isArray(genres) ? genres.join(' ') : String(genres)).toLowerCase();
    if (matchers.some(m => str.includes(m.toLowerCase()))) return true;
  }
  const searchText = [venue.cuisine_primary, venue.cuisine_secondary, venue.cuisine_style, venue.lounge_type, venue.bio, JSON.stringify(safeParse(venue.unified_tags) || []), JSON.stringify(safeParse(venue.music_genres) || [])].join(' ').toLowerCase();
  return matchers.some(m => searchText.includes(m.toLowerCase()));
}

function getPhotoUrl(venue: any): string | null {
  const gallery = safeParse(venue.gallery_photos);
  if (Array.isArray(gallery) && gallery.length > 0) return gallery[0];
  const google = safeParse(venue.google_photos);
  if (Array.isArray(google) && google.length > 0) return google[0];
  return venue.image_url || null;
}

function bullseyeScore(v: any, config: WorldConfig): number {
  let score = (v.viberyte_score || 0) * 2 + (v.quality_score || 0) + (v.popularity || 0) + (v.rating || 0) * 10;
  if (config.world_type === 'nightlife') {
    score += (v.score_group_night || 0) * 1.5 + (v.late_night_spot || 0) * 20;
    const energyBonus: Record<string, number> = { high: 15, lively: 10, medium: 5 };
    score += energyBonus[v.energy_level] || 0;
  } else {
    score += (v.score_first_date || 0) * 0.5 + (v.score_group_night || 0) * 0.3;
  }
  return score;
}

function processVenue(venue: any): any {
  return {
    id: venue.id,
    name: venue.name,
    image_url: getPhotoUrl(venue),
    category: venue.category || venue.primary_category,
    cuisine_primary: venue.cuisine_primary,
    cuisine_style: venue.cuisine_style,
    lounge_type: venue.lounge_type,
    neighborhood: venue.neighborhood,
    city: venue.city,
    energy_level: venue.energy_level,
    price_level: venue.google_price_level || venue.price_tier,
    dress_code: venue.dress_code,
    rating: venue.rating || venue.google_rating,
    score_first_date: venue.score_first_date || 0,
    score_group_night: venue.score_group_night || 0,
    late_night_spot: venue.late_night_spot || 0,
    has_hookah: venue.has_hookah || 0,
    primary_scene: venue.primary_scene,
    music_genres: safeParse(venue.music_genres) || [],
  };
}

// ============================================
// DIAL SYSTEM
// ============================================
function getDialConfig(dial: string, config: WorldConfig): any {
  const dialConfigs: Record<string, any> = {
    date_night: { title: `${config.title} Date Night`, filter: (v: any) => (v.score_first_date || 0) > 20, sort: (a: any, b: any) => (b.score_first_date || 0) - (a.score_first_date || 0) },
    upscale: { title: `Upscale ${config.title}`, filter: (v: any) => v.cuisine_style === 'upscale' || (v.google_price_level || 0) >= 3, sort: (a: any, b: any) => (b.google_price_level || 0) - (a.google_price_level || 0) },
    casual: { title: `Casual ${config.title}`, filter: (v: any) => v.cuisine_style === 'casual' || v.dress_code === 'casual', sort: (a: any, b: any) => (b.quality_score || 0) - (a.quality_score || 0) },
    late_night: { title: `Late-Night ${config.title}`, filter: (v: any) => isTruthy(v.late_night_spot), sort: (a: any, b: any) => (b.score_afterparty || 0) - (a.score_afterparty || 0) },
    high_energy: { title: `High Energy ${config.title}`, filter: (v: any) => ['high', 'lively'].includes(v.energy_level), sort: (a: any, b: any) => bullseyeScore(b, config) - bullseyeScore(a, config) },
    pregame: { title: `${config.title} Pregame`, filter: (v: any) => isTruthy(v.pregame_spot) || (v.score_pregame || 0) > 50, sort: (a: any, b: any) => (b.score_pregame || 0) - (a.score_pregame || 0) },
    hookah: { title: 'Hookah Lounges', filter: (v: any) => isTruthy(v.has_hookah) || (v.lounge_type || '').toLowerCase().includes('hookah') || (v.name || '').toLowerCase().includes('hookah'), sort: (a: any, b: any) => bullseyeScore(b, config) - bullseyeScore(a, config) },
  };

  const sub = config.subCuisines.find(s => s.key === dial);
  if (sub) return { title: sub.title, filter: (v: any) => matchesSubCuisine(v, sub.matchers, sub.field), sort: (a: any, b: any) => bullseyeScore(b, config) - bullseyeScore(a, config) };

  return dialConfigs[dial] || null;
}

// ============================================
// SECTION BUILDERS
// ============================================
function buildLensSection(venues: any[], config: WorldConfig, dialConfig: any): any[] {
  let filtered = venues.filter(dialConfig.filter);
  filtered.sort(dialConfig.sort);
  filtered = filtered.slice(0, 30);
  if (filtered.length === 0) return [];
  return [{ key: 'lens', title: dialConfig.title, venue_count: filtered.length, venues: filtered.map(processVenue) }];
}

function buildFullSections(venues: any[], config: WorldConfig, city: string): any[] {
  const sections: any[] = [];
  const used = new Map<number, number>();
  const MAX = 2;
  const isNightlife = config.world_type === 'nightlife';

  const add = (key: string, title: string, filter: (v: any) => boolean, sort?: (a: any, b: any) => number, limit = 10) => {
    let list = venues.filter(v => (used.get(v.id) || 0) < MAX && filter(v));
    if (sort) list.sort(sort);
    list = list.slice(0, limit);
    if (list.length >= 2) {
      list.forEach(v => used.set(v.id, (used.get(v.id) || 0) + 1));
      sections.push({ key, title, venue_count: list.length, venues: list.map(processVenue) });
    }
  };

  // Bullseye — always first
  add('bullseye', `Best ${config.title} for You`, () => true, (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);

  // Sub-cuisines
  config.subCuisines.forEach(sub => add(sub.key, sub.title, v => matchesSubCuisine(v, sub.matchers, sub.field), (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10));

  if (isNightlife) {
    add('pregame', 'Great for Pregame', v => isTruthy(v.pregame_spot) || (v.score_pregame || 0) > 50, (a, b) => (b.score_pregame || 0) - (a.score_pregame || 0), 10);
    add('late_night', 'Late Night Energy', v => isTruthy(v.late_night_spot), (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);
    add('high_energy', 'High Energy', v => ['high', 'lively'].includes(v.energy_level), (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);
  } else {
    add('date_night', `${config.title} Date Night`, v => (v.score_first_date || 0) > 30, (a, b) => (b.score_first_date || 0) - (a.score_first_date || 0), 10);
    add('social', 'Social & High Energy', v => ['high', 'lively'].includes(v.energy_level), (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);
    add('late_night', `Late-Night ${config.title}`, v => isTruthy(v.late_night_spot), (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);
  }

  add('casual', `Casual ${config.title}`, v => v.cuisine_style === 'casual' || v.dress_code === 'casual', (a, b) => bullseyeScore(b, config) - bullseyeScore(a, config), 10);
  add('upscale', `Upscale ${config.title}`, v => v.cuisine_style === 'upscale' || (v.google_price_level || 0) >= 3, (a, b) => (b.google_price_level || 0) - (a.google_price_level || 0), 10);

  // Worth the Ride — for Manhattan, show outer boroughs
  const primaryCities = ['Manhattan', 'New York'];
  if (primaryCities.includes(city)) {
    const outerCities = ['Brooklyn', 'Queens', 'Bronx', 'North Jersey', 'Jersey City', 'The Bronx'];
    const outer = venues.filter(v => (used.get(v.id) || 0) < MAX && !primaryCities.includes(v.city) && outerCities.includes(v.city));
    outer.sort((a, b) => bullseyeScore(b, config) - bullseyeScore(a, config));
    if (outer.slice(0, 10).length >= 2) {
      sections.push({ key: 'worth_uber', title: 'Worth the Ride', venue_count: outer.slice(0, 10).length, venues: outer.slice(0, 10).map(processVenue) });
    }
  }

  return sections;
}

// ============================================
// FETCH — with CATEGORY HARD WALL
// ============================================
function fetchVenuesForCity(db: any, city: string, worldType: WorldType): any[] {
  const categoryFilter = CATEGORY_FILTERS[worldType];

  return db.prepare(`
    SELECT * FROM venues
    WHERE should_exclude = 0
      AND (city = ? OR region = ?)
      AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
        OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
        OR (image_url IS NOT NULL AND image_url != ''))
      ${categoryFilter}
    LIMIT 2000
  `).all(city, city);
}

// ============================================
// UMBRELLA HANDLER
// ============================================
function handleUmbrella(umbrella: UmbrellaConfig, city: string, sub: string | null, dial: string | null, db: any): any {
  // Umbrellas are always dining
  const allCityVenues = fetchVenuesForCity(db, city, 'dining');

  const allVenues: any[] = [];
  const childCounts: { key: string; title: string; count: number }[] = [];

  for (const child of umbrella.children) {
    let childVenues: any[] = [];
    for (const lensKey of child.lenses) {
      const config = WORLDS[lensKey];
      if (!config) continue;
      const matched = allCityVenues.filter((v: any) => matchesWorld(v, config));
      childVenues.push(...matched);
    }

    // Dedupe within child
    const seen = new Set<number>();
    childVenues = childVenues.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    childCounts.push({ key: child.key, title: child.title, count: childVenues.length });
    allVenues.push(...childVenues.map(v => ({ ...v, _childKey: child.key })));
  }

  // Dedupe across children
  const globalSeen = new Set<number>();
  const deduped = allVenues.filter(v => {
    if (globalSeen.has(v.id)) return false;
    globalSeen.add(v.id);
    return true;
  });

  let activeVenues = deduped;
  let activeSub = 'all';
  if (sub && sub !== 'all') {
    activeVenues = deduped.filter(v => v._childKey === sub);
    activeSub = sub;
  }

  const virtualConfig: WorldConfig = {
    key: umbrella.key,
    title: activeSub === 'all' ? umbrella.title : (umbrella.children.find(c => c.key === activeSub)?.title || umbrella.title),
    tone: umbrella.tone,
    gradient: umbrella.gradient,
    world_type: 'dining',
    cuisineMatchers: ['_umbrella_'],
    tagMatchers: [],
    subCuisines: [],
    neighbors: umbrella.neighbors,
  };

  const sections: any[] = [];
  const used = new Map<number, number>();
  const MAX = 2;

  const add = (key: string, title: string, filter: (v: any) => boolean, sort?: (a: any, b: any) => number, limit = 12) => {
    let list = activeVenues.filter(v => (used.get(v.id) || 0) < MAX && filter(v));
    if (sort) list.sort(sort);
    list = list.slice(0, limit);
    if (list.length >= 2) {
      list.forEach(v => used.set(v.id, (used.get(v.id) || 0) + 1));
      sections.push({ key, title, venue_count: list.length, venues: list.map(processVenue) });
    }
  };

  add('bullseye', `Best ${virtualConfig.title} for You`, () => true, (a, b) => bullseyeScore(b, virtualConfig) - bullseyeScore(a, virtualConfig), 12);

  if (activeSub === 'all') {
    for (const child of umbrella.children) {
      add(child.key, child.title, v => v._childKey === child.key, (a, b) => bullseyeScore(b, virtualConfig) - bullseyeScore(a, virtualConfig), 12);
    }
  }

  add('date_night', `${virtualConfig.title} Date Night`, v => (v.score_first_date || 0) > 20, (a, b) => (b.score_first_date || 0) - (a.score_first_date || 0), 10);
  add('upscale', `Upscale ${virtualConfig.title}`, v => v.cuisine_style === 'upscale' || (v.google_price_level || 0) >= 3, (a, b) => (b.google_price_level || 0) - (a.google_price_level || 0), 10);
  add('casual', `Casual ${virtualConfig.title}`, v => v.cuisine_style === 'casual' || v.dress_code === 'casual', (a, b) => bullseyeScore(b, virtualConfig) - bullseyeScore(a, virtualConfig), 10);
  add('late_night', `Late-Night ${virtualConfig.title}`, v => isTruthy(v.late_night_spot), (a, b) => bullseyeScore(b, virtualConfig) - bullseyeScore(a, virtualConfig), 10);
  add('group', `${virtualConfig.title} for Groups`, v => (v.score_group_night || 0) > 30, (a, b) => (b.score_group_night || 0) - (a.score_group_night || 0), 10);

  const primaryCities = ['Manhattan', 'New York'];
  if (primaryCities.includes(city)) {
    const outer = activeVenues.filter(v => (used.get(v.id) || 0) < MAX && !primaryCities.includes(v.city) && ['Brooklyn', 'Queens', 'Bronx', 'North Jersey', 'Jersey City', 'The Bronx'].includes(v.city));
    outer.sort((a, b) => bullseyeScore(b, virtualConfig) - bullseyeScore(a, virtualConfig));
    if (outer.slice(0, 10).length >= 2) sections.push({ key: 'worth_uber', title: 'Worth the Ride', venue_count: outer.slice(0, 10).length, venues: outer.slice(0, 10).map(processVenue) });
  }

  const defaultDials = ['all', 'date_night', 'upscale', 'casual', 'late_night'];

  return {
    world: umbrella.key,
    title: virtualConfig.title,
    emoji: umbrella.emoji,
    tone: umbrella.tone,
    gradient: umbrella.gradient,
    city,
    is_umbrella: true,
    sub_cuisines: [
      { key: 'all', title: 'All', count: deduped.length, active: activeSub === 'all' },
      ...childCounts.map(c => ({ ...c, active: activeSub === c.key })),
    ],
    active_sub: activeSub,
    dial_active: dial || 'all',
    dials: defaultDials,
    neighbors: umbrella.neighbors,
    section_count: sections.length,
    total_venues: activeSub === 'all' ? deduped.length : activeVenues.length,
    sections,
    is_nightlife: false,
    lens_mode: false,
  };
}

// ============================================
// MAIN HANDLER
// ============================================
export async function GET(request: NextRequest, { params }: { params: { world: string } }) {
  let db: any = null;
  try {
    const worldKey = params.world.toLowerCase();
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city') || 'Manhattan';
    const dial = searchParams.get('dial');
    const sub = searchParams.get('sub');

    // Check umbrella worlds first
    const umbrella = UMBRELLAS[worldKey];
    if (umbrella) {
      db = new Database(dbPath, { readonly: true });
      const result = handleUmbrella(umbrella, city, sub, dial, db);
      db.close();
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // Regular world
    const config = WORLDS[worldKey];
    if (!config) {
      return NextResponse.json({
        error: 'World not found',
        available: [...Object.keys(WORLDS), ...Object.keys(UMBRELLAS)],
      }, { status: 404, headers: corsHeaders });
    }

    db = new Database(dbPath, { readonly: true });

    // CATEGORY HARD WALL applied here via fetchVenuesForCity
    let worldVenues = fetchVenuesForCity(db, city, config.world_type).filter((v: any) => matchesWorld(v, config));

    // Fallback for small results
    const FALLBACKS: Record<string, string[]> = {
      'South Jersey': ['Philadelphia'],
      'North Jersey': ['Jersey City', 'Newark', 'Hoboken', 'Manhattan'],
      'Manhattan': ['Brooklyn', 'Queens', 'The Bronx'],
      'Brooklyn': ['Manhattan', 'Queens'],
      'Queens': ['Manhattan', 'Brooklyn'],
      'Philadelphia': ['South Jersey'],
      'Washington DC': ['Arlington', 'Alexandria'],
      'Baltimore': ['Washington DC'],
    };

    if (worldVenues.length < 15) {
      const fallbackCities = FALLBACKS[city] || [];
      if (fallbackCities.length > 0) {
        const placeholders = fallbackCities.map(() => '?').join(',');
        const catFilter = CATEGORY_FILTERS[config.world_type];
        const fallbackVenues = db.prepare(`
          SELECT * FROM venues
          WHERE should_exclude = 0
            AND (city IN (${placeholders}) OR region IN (${placeholders}))
            AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
              OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
              OR (image_url IS NOT NULL AND image_url != ''))
            ${catFilter}
          LIMIT 500
        `).all(...fallbackCities, ...fallbackCities);
        const existingIds = new Set(worldVenues.map((v: any) => v.id));
        const newVenues = fallbackVenues.filter((v: any) => matchesWorld(v, config) && !existingIds.has(v.id));
        worldVenues = [...worldVenues, ...newVenues];
      }
    }

    db.close();

    let sections: any[], lensMode = false, lensTitle = '';
    if (dial && dial !== 'all') {
      const dialConfig = getDialConfig(dial, config);
      if (dialConfig) {
        sections = buildLensSection(worldVenues, config, dialConfig);
        lensMode = true;
        lensTitle = dialConfig.title;
      } else {
        sections = buildFullSections(worldVenues, config, city);
      }
    } else {
      sections = buildFullSections(worldVenues, config, city);
    }

    const isNightlife = config.world_type === 'nightlife';
    const defaultDials = isNightlife
      ? ['all', 'pregame', 'late_night', 'high_energy', 'upscale', 'casual']
      : ['all', 'date_night', 'upscale', 'casual', 'late_night', 'high_energy'];
    let dials = config.allowedDials ?? defaultDials;
    config.subCuisines.forEach(sub => { if (!dials.includes(sub.key)) dials = [...dials, sub.key]; });

    return NextResponse.json({
      world: config.key,
      title: lensMode ? lensTitle : config.title,
      tone: config.tone,
      gradient: config.gradient,
      city,
      is_umbrella: false,
      dial_active: dial || 'all',
      dials,
      neighbors: config.neighbors,
      section_count: sections.length,
      total_venues: worldVenues.length,
      sections,
      is_nightlife: isNightlife,
      lens_mode: lensMode,
      scene_filter: config.requiredScene || null,
    }, { headers: corsHeaders });
  } catch (err) {
    console.error('[API /perspectives] Error:', err);
    if (db) try { db.close(); } catch {}
    return NextResponse.json({ error: 'Failed to fetch perspective' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
