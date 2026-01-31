const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function parseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function vibeOverlap(vibes1, vibes2) {
  const set1 = new Set(parseJSON(vibes1).map(v => v.toLowerCase()));
  const set2 = new Set(parseJSON(vibes2).map(v => v.toLowerCase()));
  if (set1.size === 0 || set2.size === 0) return 0.5; // neutral if no data
  let overlap = 0;
  for (const v of set1) if (set2.has(v)) overlap++;
  return overlap / Math.max(set1.size, set2.size);
}

function getTransitionType(fromBand, toBand) {
  const diff = toBand - fromBand;
  if (diff > 0) return 'energy_up';
  if (diff < 0) return 'energy_down';
  return 'lateral';
}

// Category flow rules (what naturally follows what)
const categoryFlow = {
  'restaurant': ['bar', 'lounge', 'wine bar', 'rooftop', 'speakeasy'],
  'cafe': ['bar', 'lounge', 'wine bar'],
  'wine bar': ['lounge', 'bar', 'restaurant', 'speakeasy'],
  'bar': ['lounge', 'nightclub', 'club', 'rooftop', 'speakeasy'],
  'lounge': ['nightclub', 'club', 'rooftop', 'bar'],
  'rooftop': ['lounge', 'nightclub', 'club', 'bar'],
  'speakeasy': ['lounge', 'nightclub', 'bar'],
  'nightclub': ['nightclub', 'club', 'lounge'],
  'club': ['nightclub', 'club', 'lounge']
};

// Get venues with location data
const venues = db.prepare(`
  SELECT 
    id, name, city, category, latitude, longitude,
    acoustic_band, energy_level, vibe_tags, primary_vibes,
    music_genres, price_tier, google_price_level,
    score_first_date, score_group_night, score_pregame, score_afterparty
  FROM venues
  WHERE latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND should_exclude = 0
`).all();

console.log(`Building transitions for ${venues.length} venues...`);

// Index by city for faster lookups
const venuesByCity = {};
for (const v of venues) {
  const city = v.city || 'unknown';
  if (!venuesByCity[city]) venuesByCity[city] = [];
  venuesByCity[city].push(v);
}

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO venue_transitions 
  (from_venue_id, to_venue_id, compatibility_score, transition_type, 
   acoustic_flow_valid, vibe_match_score, distance_meters, walk_time_minutes,
   reason, best_for, time_context)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
let processed = 0;

for (const from of venues) {
  const cityVenues = venuesByCity[from.city] || [];
  const fromCat = (from.category || '').toLowerCase();
  const validNextCategories = categoryFlow[fromCat] || ['bar', 'lounge', 'nightclub'];
  
  for (const to of cityVenues) {
    if (from.id === to.id) continue;
    
    const toCat = (to.category || '').toLowerCase();
    
    // Skip if category doesn't flow naturally
    if (!validNextCategories.includes(toCat) && fromCat !== toCat) continue;
    
    // Calculate distance
    const distance = getDistance(from.latitude, from.longitude, to.latitude, to.longitude);
    if (!distance || distance > 2000) continue; // Max 2km
    
    const walkTime = Math.round(distance / 80); // ~80m per minute walking
    
    // Acoustic band flow check
    const fromBand = from.acoustic_band || 2;
    const toBand = to.acoustic_band || 2;
    const acousticValid = toBand >= fromBand ? 1 : 0; // Can only go up or stay same
    
    // Calculate compatibility score
    let score = 50; // Base score
    
    // Acoustic flow bonus/penalty
    if (acousticValid) {
      score += 15;
      if (toBand === fromBand + 1) score += 10; // Perfect step up
    } else {
      score -= 25; // Penalty for breaking flow
    }
    
    // Distance bonus (closer is better)
    if (distance < 300) score += 15;
    else if (distance < 600) score += 10;
    else if (distance < 1000) score += 5;
    
    // Vibe match
    const vibeScore = Math.round(vibeOverlap(from.vibe_tags, to.vibe_tags) * 100);
    score += Math.round(vibeScore * 0.2); // Up to 20 points
    
    // Category flow bonus
    if (validNextCategories.includes(toCat)) score += 10;
    
    // Price tier compatibility (don't jump too far)
    const fromPrice = from.google_price_level || 2;
    const toPrice = to.google_price_level || 2;
    if (Math.abs(fromPrice - toPrice) <= 1) score += 5;
    
    // Clamp score
    score = Math.max(0, Math.min(100, score));
    
    // Skip low compatibility
    if (score < 40) continue;
    
    // Determine transition type
    const transitionType = getTransitionType(fromBand, toBand);
    
    // Generate reason
    let reason = '';
    if (transitionType === 'energy_up') {
      reason = 'Energy builds naturally from here.';
    } else if (transitionType === 'lateral') {
      reason = 'Similar vibe, easy transition.';
    } else {
      reason = 'Good spot to wind down.';
    }
    
    if (distance < 300) reason = 'Just a short walk. ' + reason;
    
    // Best for (based on scores)
    const bestFor = [];
    if (to.score_first_date >= 60) bestFor.push('date');
    if (to.score_group_night >= 60) bestFor.push('group');
    if (to.score_pregame >= 60) bestFor.push('pregame');
    if (to.score_afterparty >= 60) bestFor.push('afterparty');
    if (bestFor.length === 0) bestFor.push('any');
    
    // Time context
    let timeContext = 'anytime';
    if (fromCat === 'restaurant') timeContext = 'after_dinner';
    if (toBand >= 4) timeContext = 'late_night';
    if (to.score_afterparty >= 60) timeContext = 'late_night';
    
    insertStmt.run(
      from.id, to.id, score, transitionType,
      acousticValid, vibeScore, distance, walkTime,
      reason, JSON.stringify(bestFor), timeContext
    );
    
    inserted++;
  }
  
  processed++;
  if (processed % 200 === 0) {
    console.log(`  Processed ${processed}/${venues.length} venues...`);
  }
}

console.log(`\n✅ Created ${inserted} venue transitions`);

// Show stats
const stats = db.prepare(`
  SELECT 
    transition_type,
    COUNT(*) as count,
    ROUND(AVG(compatibility_score)) as avg_score,
    ROUND(AVG(distance_meters)) as avg_distance,
    ROUND(AVG(walk_time_minutes)) as avg_walk
  FROM venue_transitions
  GROUP BY transition_type
`).all();

console.log('\nTransition stats:');
console.table(stats);

// Show sample high-score transitions
const topTransitions = db.prepare(`
  SELECT 
    f.name as from_venue,
    t.name as to_venue,
    vt.compatibility_score as score,
    vt.transition_type as type,
    vt.walk_time_minutes as walk_min,
    vt.reason
  FROM venue_transitions vt
  JOIN venues f ON f.id = vt.from_venue_id
  JOIN venues t ON t.id = vt.to_venue_id
  WHERE vt.acoustic_flow_valid = 1
  ORDER BY vt.compatibility_score DESC
  LIMIT 10
`).all();

console.log('\nTop 10 transitions:');
console.table(topTransitions);

db.close();
