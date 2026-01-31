const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Get all venues with relevant data
const venues = db.prepare(`
  SELECT 
    id, name, category, energy_level, acoustic_band,
    first_date_suitable, anniversary_suitable,
    girls_night_suitable, guys_night_suitable,
    pregame_spot, pregame_suitable,
    late_night_spot, after_hours_spot,
    solo_friendly, large_group_suitable,
    good_for_birthdays,
    vibe_tags, crowd_type_tags, amenities,
    google_price_level, friction_score,
    conversation_level, lighting,
    has_hookah, lounge_type
  FROM venues
`).all();

console.log(`Scoring ${venues.length} venues...`);

const updateStmt = db.prepare(`
  UPDATE venues SET
    score_first_date = ?,
    score_group_night = ?,
    score_birthday = ?,
    score_solo = ?,
    score_pregame = ?,
    score_afterparty = ?,
    primary_purpose = ?
  WHERE id = ?
`);

function parseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function hasTag(tags, keywords) {
  const arr = parseJSON(tags);
  const str = arr.join(' ').toLowerCase();
  return keywords.some(k => str.includes(k.toLowerCase()));
}

function clamp(val) {
  return Math.max(0, Math.min(100, Math.round(val)));
}

let processed = 0;

for (const v of venues) {
  const cat = (v.category || '').toLowerCase();
  const energy = (v.energy_level || '').toLowerCase();
  const vibes = parseJSON(v.vibe_tags);
  const crowd = parseJSON(v.crowd_type_tags);
  const amenities = parseJSON(v.amenities);
  const vibeStr = vibes.join(' ').toLowerCase();
  const amenStr = amenities.join(' ').toLowerCase();
  
  // ============================================
  // SCORE: FIRST DATE (conversation + intimate + not too loud)
  // ============================================
  let scoreFirstDate = 0;
  if (v.first_date_suitable) scoreFirstDate += 40;
  if (v.anniversary_suitable) scoreFirstDate += 20;
  if (v.conversation_level >= 3) scoreFirstDate += 15;
  if (v.lighting === 'dim' || v.lighting === 'candlelit') scoreFirstDate += 10;
  if (energy === 'calm' || energy === 'moderate') scoreFirstDate += 10;
  if (hasTag(vibeStr, ['romantic', 'intimate', 'cozy', 'date'])) scoreFirstDate += 15;
  if (cat === 'restaurant' || cat === 'wine bar') scoreFirstDate += 10;
  if (v.acoustic_band <= 2) scoreFirstDate += 10;
  // Penalties
  if (energy === 'high' || energy === 'energetic') scoreFirstDate -= 20;
  if (cat === 'nightclub' || cat === 'club') scoreFirstDate -= 30;
  if (hasTag(vibeStr, ['rowdy', 'wild', 'party'])) scoreFirstDate -= 15;
  
  // ============================================
  // SCORE: GROUP NIGHT (large group friendly + fun + social)
  // ============================================
  let scoreGroup = 0;
  if (v.large_group_suitable) scoreGroup += 40;
  if (v.girls_night_suitable) scoreGroup += 20;
  if (v.guys_night_suitable) scoreGroup += 20;
  if (energy === 'lively' || energy === 'high') scoreGroup += 15;
  if (hasTag(vibeStr, ['fun', 'social', 'party', 'group'])) scoreGroup += 15;
  if (hasTag(amenStr, ['bottle service', 'vip', 'sections'])) scoreGroup += 15;
  if (cat === 'lounge' || cat === 'bar' || cat === 'nightclub') scoreGroup += 10;
  // Penalties
  if (v.solo_friendly && !v.large_group_suitable) scoreGroup -= 10;
  if (hasTag(vibeStr, ['intimate', 'quiet'])) scoreGroup -= 15;
  
  // ============================================
  // SCORE: BIRTHDAY (celebration + vip + fun)
  // ============================================
  let scoreBirthday = 0;
  if (v.good_for_birthdays) scoreBirthday += 50;
  if (hasTag(amenStr, ['bottle service', 'vip', 'sections', 'sparklers'])) scoreBirthday += 20;
  if (v.large_group_suitable) scoreBirthday += 15;
  if (energy === 'lively' || energy === 'high') scoreBirthday += 10;
  if (cat === 'lounge' || cat === 'nightclub' || cat === 'rooftop') scoreBirthday += 10;
  if (hasTag(vibeStr, ['celebration', 'party', 'fun'])) scoreBirthday += 10;
  // Penalties
  if (cat === 'cafe' || cat === 'diner') scoreBirthday -= 20;
  if (energy === 'calm') scoreBirthday -= 10;
  
  // ============================================
  // SCORE: SOLO (solo friendly + bar seating + chill)
  // ============================================
  let scoreSolo = 0;
  if (v.solo_friendly) scoreSolo += 50;
  if (hasTag(amenStr, ['bar seating', 'counter'])) scoreSolo += 15;
  if (v.conversation_level >= 2) scoreSolo += 10;
  if (energy === 'calm' || energy === 'moderate') scoreSolo += 10;
  if (cat === 'bar' || cat === 'wine bar' || cat === 'cafe') scoreSolo += 10;
  if (hasTag(vibeStr, ['chill', 'laid-back', 'casual'])) scoreSolo += 10;
  // Penalties
  if (cat === 'nightclub') scoreSolo -= 25;
  if (hasTag(vibeStr, ['couples', 'group', 'party'])) scoreSolo -= 15;
  
  // ============================================
  // SCORE: PREGAME (early, affordable, social starter)
  // ============================================
  let scorePregame = 0;
  if (v.pregame_spot || v.pregame_suitable) scorePregame += 50;
  if (v.google_price_level <= 2) scorePregame += 15;
  if (energy === 'moderate' || energy === 'lively') scorePregame += 10;
  if (v.acoustic_band <= 2) scorePregame += 10;
  if (cat === 'bar' || cat === 'lounge') scorePregame += 10;
  if (hasTag(vibeStr, ['casual', 'chill', 'social'])) scorePregame += 10;
  // Penalties
  if (v.google_price_level >= 4) scorePregame -= 20;
  if (cat === 'nightclub') scorePregame -= 15;
  if (v.late_night_spot) scorePregame -= 10;
  
  // ============================================
  // SCORE: AFTERPARTY (late night, high energy, keeps going)
  // ============================================
  let scoreAfterparty = 0;
  if (v.late_night_spot) scoreAfterparty += 40;
  if (v.after_hours_spot) scoreAfterparty += 30;
  if (energy === 'high' || energy === 'energetic') scoreAfterparty += 15;
  if (v.acoustic_band >= 4) scoreAfterparty += 15;
  if (cat === 'nightclub' || cat === 'club') scoreAfterparty += 15;
  if (hasTag(vibeStr, ['party', 'wild', 'late'])) scoreAfterparty += 10;
  // Penalties
  if (cat === 'restaurant' || cat === 'cafe') scoreAfterparty -= 30;
  if (energy === 'calm') scoreAfterparty -= 20;
  
  // ============================================
  // PRIMARY PURPOSE (what people come here for)
  // ============================================
  let purpose = 'drinks'; // default
  
  if (cat === 'nightclub' || cat === 'club' || hasTag(amenStr, ['dance floor', 'dj'])) {
    purpose = 'dancing';
  } else if (cat === 'restaurant' || cat === 'cafe' || cat === 'diner') {
    purpose = 'dining';
  } else if (v.has_hookah || hasTag(amenStr, ['hookah', 'shisha'])) {
    purpose = 'hookah';
  } else if (cat === 'rooftop' || hasTag(vibeStr, ['scenic', 'views', 'skyline'])) {
    purpose = 'views';
  } else if (energy === 'calm' || hasTag(vibeStr, ['chill', 'relaxed', 'quiet'])) {
    purpose = 'chill';
  } else if (cat === 'bar' || cat === 'lounge' || cat === 'wine bar') {
    purpose = 'drinks';
  }
  
  // Clamp all scores
  scoreFirstDate = clamp(scoreFirstDate);
  scoreGroup = clamp(scoreGroup);
  scoreBirthday = clamp(scoreBirthday);
  scoreSolo = clamp(scoreSolo);
  scorePregame = clamp(scorePregame);
  scoreAfterparty = clamp(scoreAfterparty);
  
  updateStmt.run(
    scoreFirstDate, scoreGroup, scoreBirthday,
    scoreSolo, scorePregame, scoreAfterparty,
    purpose, v.id
  );
  
  processed++;
}

console.log(`\n✅ Scored ${processed} venues`);

// Show distribution
const stats = db.prepare(`
  SELECT 
    primary_purpose,
    COUNT(*) as count,
    ROUND(AVG(score_first_date)) as avg_date,
    ROUND(AVG(score_group_night)) as avg_group,
    ROUND(AVG(score_birthday)) as avg_bday,
    ROUND(AVG(score_pregame)) as avg_pregame,
    ROUND(AVG(score_afterparty)) as avg_after
  FROM venues
  GROUP BY primary_purpose
  ORDER BY count DESC
`).all();

console.log('\nScore distribution by purpose:');
console.table(stats);

// Show top date spots
const topDate = db.prepare(`
  SELECT name, category, score_first_date, energy_level
  FROM venues 
  WHERE score_first_date > 0
  ORDER BY score_first_date DESC 
  LIMIT 5
`).all();

console.log('\nTop 5 date spots:');
console.table(topDate);

// Show top afterparty spots
const topAfter = db.prepare(`
  SELECT name, category, score_afterparty, energy_level
  FROM venues 
  WHERE score_afterparty > 0
  ORDER BY score_afterparty DESC 
  LIMIT 5
`).all();

console.log('\nTop 5 afterparty spots:');
console.table(topAfter);

db.close();
