/**
 * Lumina Next Stops Population Script
 * 
 * Implements Flow Lanes logic:
 * - Band 1 (Entry): Restaurants, cafes, diners
 * - Band 2 (Build): Lounges, bars, cocktail bars, wine bars
 * - Band 3 (Peak): Clubs, nightclubs
 * 
 * Rules:
 * - Same neighborhood = priority
 * - Band can stay same or go UP (never down)
 * - Max 3 next stops per venue
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

// Band assignments based on category
const BAND_MAP = {
  // Band 1 - Entry (dinner, pregame)
  'restaurant': 1,
  'diner': 1,
  'cafe': 1,
  'brunch': 1,
  
  // Band 2 - Build (lounge, cocktails)
  'lounge': 2,
  'bar': 2,
  'cocktail_bar': 2,
  'wine_bar': 2,
  'rooftop': 2,
  'speakeasy': 2,
  
  // Band 3 - Peak (club, party)
  'club': 3,
  'nightclub': 3,
  'night_club': 3,
};

// Energy level to band modifier
const ENERGY_MODIFIER = {
  'low': -0.5,
  'medium': 0,
  'high': 0.5,
};

function getBand(venue) {
  const category = (venue.category || '').toLowerCase();
  let band = BAND_MAP[category] || 2;
  
  const energy = (venue.energy_level || '').toLowerCase();
  if (ENERGY_MODIFIER[energy]) {
    band += ENERGY_MODIFIER[energy];
  }
  
  return Math.max(1, Math.min(3, Math.round(band)));
}

function isValidTransition(fromBand, toBand) {
  return toBand >= fromBand && toBand <= fromBand + 1;
}

function calculateVibeScore(venue1, venue2) {
  let score = 0;
  
  const parseArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  
  // Vibe overlap
  const vibes1 = parseArray(venue1.primary_vibes);
  const vibes2 = parseArray(venue2.primary_vibes);
  const vibeOverlap = vibes1.filter(v => vibes2.includes(v)).length;
  score += vibeOverlap * 10;
  
  // Music genre overlap
  const music1 = parseArray(venue1.music_genres_normalized || venue1.music_genres);
  const music2 = parseArray(venue2.music_genres_normalized || venue2.music_genres);
  const musicOverlap = music1.filter(m => music2.includes(m)).length;
  score += musicOverlap * 8;
  
  // Price tier compatibility
  const priceTiers = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
  const price1 = priceTiers[venue1.price_tier] || 2;
  const price2 = priceTiers[venue2.price_tier] || 2;
  if (Math.abs(price1 - price2) <= 1) {
    score += 5;
  }
  
  // Dress code compatibility
  if (venue1.dress_code && venue2.dress_code && venue1.dress_code === venue2.dress_code) {
    score += 5;
  }
  
  // Same neighborhood = BIG bonus
  if (venue1.neighborhood && venue2.neighborhood && 
      venue1.neighborhood.toLowerCase() === venue2.neighborhood.toLowerCase()) {
    score += 25;
  }
  
  // Same city
  if (venue1.city && venue2.city && 
      venue1.city.toLowerCase() === venue2.city.toLowerCase()) {
    score += 5;
  }
  
  return score;
}

function findNextStops(venue, allVenues) {
  const venueBand = getBand(venue);
  const candidates = [];
  
  for (const candidate of allVenues) {
    if (candidate.id === venue.id) continue;
    if (!venue.city || !candidate.city) continue;
    if (venue.city.toLowerCase() !== candidate.city.toLowerCase()) continue;
    
    const candidateBand = getBand(candidate);
    if (!isValidTransition(venueBand, candidateBand)) continue;
    
    const score = calculateVibeScore(venue, candidate);
    if (score < 5) continue;
    
    candidates.push({
      id: candidate.id,
      name: candidate.name,
      category: candidate.category,
      neighborhood: candidate.neighborhood,
      rating: candidate.rating,
      professional_photo_url: candidate.professional_photo_url,
      google_photos: candidate.google_photos,
    });
  }
  
  // Sort by score, take TOP 3 only
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3);
}

async function main() {
  console.log('🚀 Starting Next Stops Population (max 3 per venue)...\n');
  
  const venues = db.prepare(`
    SELECT 
      id, name, category, neighborhood, city, state,
      price_tier, dress_code, energy_level,
      primary_vibes, music_genres, music_genres_normalized,
      rating, professional_photo_url, google_photos,
      viberyte_certified
    FROM venues 
    WHERE should_exclude = 0 OR should_exclude IS NULL
  `).all();
  
  console.log(`📊 Found ${venues.length} venues to process\n`);
  
  const updateStmt = db.prepare(`UPDATE venues SET next_stops = ? WHERE id = ?`);
  
  let processed = 0;
  let withStops = 0;
  
  for (const venue of venues) {
    const nextStops = findNextStops(venue, venues);
    
    if (nextStops.length > 0) withStops++;
    
    updateStmt.run(JSON.stringify(nextStops), venue.id);
    
    processed++;
    if (processed % 500 === 0) {
      console.log(`  Processed ${processed}/${venues.length}...`);
    }
  }
  
  console.log(`\n✅ Complete!`);
  console.log(`   Total: ${venues.length}`);
  console.log(`   With stops: ${withStops}`);
  console.log(`   Without: ${venues.length - withStops}`);
  
  console.log('\n📍 Samples:\n');
  
  const samples = db.prepare(`
    SELECT id, name, category, city, next_stops 
    FROM venues 
    WHERE next_stops IS NOT NULL AND next_stops != '[]'
    LIMIT 5
  `).all();
  
  for (const sample of samples) {
    const stops = JSON.parse(sample.next_stops || '[]');
    console.log(`${sample.name} (${sample.category}):`);
    stops.forEach(s => console.log(`  → ${s.name} (${s.category})`));
    console.log('');
  }
}

main().catch(console.error);
