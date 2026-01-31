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
  if (set1.size === 0 || set2.size === 0) return 0.5;
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

// Clear existing transitions
db.prepare(`DELETE FROM venue_transitions`).run();
console.log('Cleared existing transitions');

// Get venues
const venues = db.prepare(`
  SELECT 
    id, name, city, category, latitude, longitude,
    acoustic_band, energy_level, vibe_tags, primary_vibes,
    music_genres, price_tier, google_price_level,
    score_first_date, score_group_night, score_pregame, score_afterparty,
    event_dependent
  FROM venues
  WHERE latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND should_exclude = 0
    AND (event_dependent = 0 OR event_dependent IS NULL)
`).all();

console.log(`Building transitions for ${venues.length} venues...`);

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

// Add transport_mode column if not exists
try {
  db.exec(`ALTER TABLE venue_transitions ADD COLUMN transport_mode TEXT DEFAULT 'walk'`);
  console.log('Added transport_mode column');
} catch (e) {
  console.log('transport_mode column exists');
}

// Update insert statement
const insertStmtFull = db.prepare(`
  INSERT OR REPLACE INTO venue_transitions 
  (from_venue_id, to_venue_id, compatibility_score, transition_type, 
   acoustic_flow_valid, vibe_match_score, distance_meters, walk_time_minutes,
   reason, best_for, time_context, transport_mode)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    if (!distance) continue;
    
    // ============================================
    // NEW: Extended distance limits
    // Walk: up to 1.2km (~15 min)
    // Rideshare: up to 8km (~10-15 min Uber)
    // ============================================
    const MAX_WALK_DISTANCE = 1200;    // 1.2km
    const MAX_RIDE_DISTANCE = 8000;    // 8km
    
    if (distance > MAX_RIDE_DISTANCE) continue;
    
    // Determine transport mode
    const transportMode = distance <= MAX_WALK_DISTANCE ? 'walk' : 'rideshare';
    
    // Calculate travel time
    let travelTime;
    if (transportMode === 'walk') {
      travelTime = Math.round(distance / 80); // ~80m per minute
    } else {
      // Rideshare: ~400m per minute in city (includes pickup wait)
      travelTime = Math.round(distance / 400) + 3; // +3 min for pickup
    }
    
    // Acoustic band flow check
    const fromBand = from.acoustic_band || 2;
    const toBand = to.acoustic_band || 2;
    const acousticValid = toBand >= fromBand ? 1 : 0;
    
    // Calculate compatibility score
    let score = 50;
    
    // Acoustic flow bonus/penalty
    if (acousticValid) {
      score += 15;
      if (toBand === fromBand + 1) score += 10;
    } else {
      score -= 25;
    }
    
    // Distance scoring (walking preferred, but rideshare still good)
    if (transportMode === 'walk') {
      if (distance < 300) score += 20;
      else if (distance < 600) score += 15;
      else if (distance < 1000) score += 10;
      else score += 5;
    } else {
      // Rideshare - still useful but slight penalty vs walking
      if (distance < 3000) score += 10;
      else if (distance < 5000) score += 5;
      else score += 0;
    }
    
    // Vibe match
    const vibeScore = Math.round(vibeOverlap(from.vibe_tags, to.vibe_tags) * 100);
    score += Math.round(vibeScore * 0.2);
    
    // Category flow bonus
    if (validNextCategories.includes(toCat)) score += 10;
    
    // Price tier compatibility
    const fromPrice = from.google_price_level || 2;
    const toPrice = to.google_price_level || 2;
    if (Math.abs(fromPrice - toPrice) <= 1) score += 5;
    
    // Apply diminishing returns above 85
    if (score > 85) {
      const excess = score - 85;
      score = 85 + Math.round(excess * 0.5);
    }
    
    // Cap at 95 unless very close + high vibe match
    if (score > 95 && (distance >= 300 || vibeScore < 70)) {
      score = 95;
    }
    
    score = Math.max(0, Math.min(98, score));
    
    // Skip low compatibility
    if (score < 40) continue;
    
    const transitionType = getTransitionType(fromBand, toBand);
    
    // Generate reason based on transport mode
    let reason = '';
    if (transportMode === 'walk') {
      if (transitionType === 'energy_up') {
        reason = distance < 400 ? 'Quick walk, energy builds from here.' : 'Short walk to turn up the energy.';
      } else if (transitionType === 'lateral') {
        reason = distance < 400 ? 'Just around the corner, similar vibe.' : 'Easy walk, similar energy.';
      } else {
        reason = 'Nice walk to wind down.';
      }
    } else {
      // Rideshare messages
      const rideMin = travelTime;
      if (transitionType === 'energy_up') {
        reason = `${rideMin} min ride to level up the night.`;
      } else if (transitionType === 'lateral') {
        reason = `${rideMin} min ride, worth the trip.`;
      } else {
        reason = `${rideMin} min ride to a chill spot.`;
      }
    }
    
    // Best for
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
    
    insertStmtFull.run(
      from.id, to.id, score, transitionType,
      acousticValid, vibeScore, distance, travelTime,
      reason, JSON.stringify(bestFor), timeContext, transportMode
    );
    
    inserted++;
  }
  
  processed++;
  if (processed % 200 === 0) {
    console.log(`  Processed ${processed}/${venues.length} venues...`);
  }
}

console.log(`\n✅ Created ${inserted} venue transitions`);

// Stats by transport mode
const modeStats = db.prepare(`
  SELECT 
    transport_mode,
    COUNT(*) as count,
    ROUND(AVG(compatibility_score)) as avg_score,
    ROUND(AVG(distance_meters)) as avg_distance,
    ROUND(AVG(walk_time_minutes)) as avg_time
  FROM venue_transitions
  GROUP BY transport_mode
`).all();

console.log('\nStats by transport mode:');
console.table(modeStats);

// Score distribution
const dist = db.prepare(`
  SELECT 
    CASE 
      WHEN compatibility_score >= 90 THEN '90-98'
      WHEN compatibility_score >= 80 THEN '80-89'
      WHEN compatibility_score >= 70 THEN '70-79'
      WHEN compatibility_score >= 60 THEN '60-69'
      WHEN compatibility_score >= 50 THEN '50-59'
      ELSE 'below 50'
    END as score_range,
    COUNT(*) as count
  FROM venue_transitions
  GROUP BY score_range
  ORDER BY score_range DESC
`).all();

console.log('\nScore distribution:');
console.table(dist);

// Sample rideshare transitions
const rideSamples = db.prepare(`
  SELECT 
    f.name as from_venue,
    t.name as to_venue,
    vt.compatibility_score as score,
    vt.distance_meters as dist_m,
    vt.walk_time_minutes as time_min,
    vt.reason
  FROM venue_transitions vt
  JOIN venues f ON f.id = vt.from_venue_id
  JOIN venues t ON t.id = vt.to_venue_id
  WHERE vt.transport_mode = 'rideshare'
  ORDER BY vt.compatibility_score DESC
  LIMIT 10
`).all();

console.log('\nTop rideshare transitions:');
console.table(rideSamples);

db.close();
