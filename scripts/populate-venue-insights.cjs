const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function parseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// Get venues with good data
const venues = db.prepare(`
  SELECT 
    v.id, v.name, v.category, v.energy_level, v.acoustic_band,
    v.vibe_tags, v.music_genres, v.crowd_type_tags, v.amenities,
    v.google_price_level, v.has_hookah, v.late_night_spot, v.after_hours_spot,
    v.score_first_date, v.score_group_night, v.score_birthday,
    v.score_pregame, v.score_afterparty, v.score_solo,
    v.primary_purpose, v.conversation_level, v.lighting,
    t.best_arrival, t.peak_start, t.peak_end
  FROM venues v
  LEFT JOIN venue_time_windows t ON t.venue_id = v.id AND t.day_of_week = 'fri'
  WHERE v.should_exclude = 0
`).all();

console.log(`Generating insights for ${venues.length} venues...`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO venue_insights 
  (venue_id, insight_type, insight_text, context_tags, time_relevance, day_relevance, source_venue_category, confidence, display_priority)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;

for (const v of venues) {
  const cat = (v.category || '').toLowerCase();
  const energy = (v.energy_level || '').toLowerCase();
  const vibes = parseJSON(v.vibe_tags);
  const music = parseJSON(v.music_genres);
  const crowd = parseJSON(v.crowd_type_tags);
  const amenities = parseJSON(v.amenities);
  const vibeStr = vibes.join(' ').toLowerCase();
  const amenStr = amenities.join(' ').toLowerCase();
  const musicStr = music.join(', ');
  
  const insights = [];
  
  // ============================================
  // ARRIVAL INSIGHTS
  // ============================================
  if (v.best_arrival) {
    insights.push({
      type: 'arrival',
      text: `Best to arrive around ${v.best_arrival}.`,
      context: ['timing'],
      time: 'anytime',
      priority: 80
    });
  }
  
  if (v.peak_start && v.peak_end) {
    insights.push({
      type: 'arrival',
      text: `Peak hours: ${v.peak_start} - ${v.peak_end}.`,
      context: ['timing', 'crowd'],
      time: 'anytime',
      priority: 75
    });
  }
  
  if (cat === 'nightclub' || cat === 'club') {
    insights.push({
      type: 'arrival',
      text: `Don't rush—it picks up after 11.`,
      context: ['timing', 'late_night'],
      time: 'after_10pm',
      priority: 85
    });
  }
  
  // ============================================
  // VIBE INSIGHTS
  // ============================================
  if (energy === 'calm' || energy === 'relaxed') {
    insights.push({
      type: 'vibe',
      text: `Chill spot, easy to have a conversation.`,
      context: ['conversation', 'date'],
      time: 'anytime',
      priority: 70
    });
  }
  
  if (energy === 'high' || energy === 'energetic') {
    insights.push({
      type: 'vibe',
      text: `Expect high energy and a packed crowd.`,
      context: ['party', 'group'],
      time: 'late_night',
      priority: 75
    });
  }
  
  if (energy === 'lively') {
    insights.push({
      type: 'vibe',
      text: `Solid vibe without being overwhelming.`,
      context: ['balanced'],
      time: 'anytime',
      priority: 65
    });
  }
  
  if (vibeStr.includes('intimate') || vibeStr.includes('cozy')) {
    insights.push({
      type: 'vibe',
      text: `Intimate setting, good for dates.`,
      context: ['date', 'romantic'],
      time: 'anytime',
      priority: 75
    });
  }
  
  if (vibeStr.includes('trendy') || vibeStr.includes('upscale')) {
    insights.push({
      type: 'vibe',
      text: `Trendy crowd, dress to impress.`,
      context: ['upscale', 'fashion'],
      time: 'anytime',
      priority: 70
    });
  }
  
  // ============================================
  // CROWD INSIGHTS
  // ============================================
  if (crowd.length > 0) {
    const crowdStr = crowd.slice(0, 2).join(', ');
    insights.push({
      type: 'crowd',
      text: `Crowd leans ${crowdStr}.`,
      context: ['crowd'],
      time: 'anytime',
      priority: 60
    });
  }
  
  if (v.score_first_date >= 70) {
    insights.push({
      type: 'crowd',
      text: `Great date spot, lots of couples.`,
      context: ['date', 'romantic'],
      time: 'anytime',
      priority: 75
    });
  }
  
  if (v.score_group_night >= 70) {
    insights.push({
      type: 'crowd',
      text: `Group-friendly, easy to take over a section.`,
      context: ['group', 'birthday'],
      time: 'anytime',
      priority: 70
    });
  }
  
  // ============================================
  // MUSIC INSIGHTS
  // ============================================
  if (musicStr && music.length > 0) {
    insights.push({
      type: 'vibe',
      text: `Expect ${music.slice(0, 2).join(' and ')} vibes.`,
      context: ['music'],
      time: 'anytime',
      priority: 65
    });
  }
  
  if (amenStr.includes('dj') || amenStr.includes('live dj')) {
    insights.push({
      type: 'vibe',
      text: `DJ spins here, gets loud later.`,
      context: ['music', 'late_night'],
      time: 'after_10pm',
      priority: 70
    });
  }
  
  if (amenStr.includes('live music') || amenStr.includes('live band')) {
    insights.push({
      type: 'vibe',
      text: `Live music spot, check the schedule.`,
      context: ['music', 'entertainment'],
      time: 'anytime',
      priority: 75
    });
  }
  
  // ============================================
  // AMENITY INSIGHTS
  // ============================================
  if (v.has_hookah || amenStr.includes('hookah')) {
    insights.push({
      type: 'vibe',
      text: `Hookah available, good for lingering.`,
      context: ['hookah', 'chill'],
      time: 'anytime',
      priority: 70
    });
  }
  
  if (amenStr.includes('rooftop') || cat === 'rooftop') {
    insights.push({
      type: 'vibe',
      text: `Rooftop views, weather permitting.`,
      context: ['views', 'outdoor'],
      time: 'anytime',
      priority: 75
    });
  }
  
  if (amenStr.includes('bottle service') || amenStr.includes('vip')) {
    insights.push({
      type: 'pro_tip',
      text: `Bottle service available, book ahead for groups.`,
      context: ['vip', 'group', 'birthday'],
      time: 'anytime',
      priority: 70
    });
  }
  
  if (amenStr.includes('dance floor')) {
    insights.push({
      type: 'vibe',
      text: `Dance floor gets packed after midnight.`,
      context: ['dancing', 'late_night'],
      time: 'after_11pm',
      priority: 75
    });
  }
  
  // ============================================
  // TRANSITION INSIGHTS (shown as next_stop)
  // ============================================
  if (v.score_pregame >= 60) {
    insights.push({
      type: 'transition',
      text: `Good warmup spot before the main event.`,
      context: ['pregame'],
      time: 'before_10pm',
      priority: 70,
      sourceCategory: 'restaurant'
    });
  }
  
  if (v.score_afterparty >= 60) {
    insights.push({
      type: 'transition',
      text: `Keeps going when other spots close.`,
      context: ['afterparty', 'late_night'],
      time: 'after_midnight',
      priority: 80,
      sourceCategory: 'nightclub'
    });
  }
  
  if (v.late_night_spot || v.after_hours_spot) {
    insights.push({
      type: 'transition',
      text: `Open late, no need to rush.`,
      context: ['late_night'],
      time: 'after_midnight',
      priority: 75
    });
  }
  
  if (cat === 'lounge' && v.acoustic_band <= 2) {
    insights.push({
      type: 'transition',
      text: `Good reset spot before round two.`,
      context: ['cooldown', 'transition'],
      time: 'anytime',
      priority: 70,
      sourceCategory: 'bar'
    });
  }
  
  if (energy === 'calm' && (cat === 'bar' || cat === 'lounge')) {
    insights.push({
      type: 'transition',
      text: `Chill vibes to wind down the night.`,
      context: ['cooldown'],
      time: 'late_night',
      priority: 65
    });
  }
  
  // ============================================
  // WARNING INSIGHTS
  // ============================================
  if (v.google_price_level >= 4) {
    insights.push({
      type: 'warning',
      text: `Pricey—expect to spend.`,
      context: ['budget'],
      time: 'anytime',
      priority: 60
    });
  }
  
  if (amenStr.includes('dress code')) {
    insights.push({
      type: 'warning',
      text: `Dress code enforced, no sneakers.`,
      context: ['dress_code'],
      time: 'anytime',
      priority: 80
    });
  }
  
  if (amenStr.includes('reservation') || amenStr.includes('reservations required')) {
    insights.push({
      type: 'warning',
      text: `Reservations recommended.`,
      context: ['planning'],
      time: 'anytime',
      priority: 75
    });
  }
  
  // ============================================
  // PRO TIP INSIGHTS
  // ============================================
  if (cat === 'speakeasy') {
    insights.push({
      type: 'pro_tip',
      text: `Hidden entrance—look for the sign.`,
      context: ['speakeasy'],
      time: 'anytime',
      priority: 85
    });
  }
  
  if (v.conversation_level >= 3) {
    insights.push({
      type: 'pro_tip',
      text: `Easy to talk here, not too loud.`,
      context: ['conversation', 'date'],
      time: 'anytime',
      priority: 70
    });
  }
  
  // Insert all insights for this venue
  for (const insight of insights) {
    insertStmt.run(
      v.id,
      insight.type,
      insight.text,
      JSON.stringify(insight.context),
      insight.time,
      insight.days ? JSON.stringify(insight.days) : null,
      insight.sourceCategory || null,
      0.8,
      insight.priority
    );
    inserted++;
  }
}

console.log(`\n✅ Generated ${inserted} insights`);

// Show stats by type
const stats = db.prepare(`
  SELECT insight_type, COUNT(*) as count, ROUND(AVG(display_priority)) as avg_priority
  FROM venue_insights
  GROUP BY insight_type
  ORDER BY count DESC
`).all();

console.log('\nInsights by type:');
console.table(stats);

// Show sample insights
const samples = db.prepare(`
  SELECT v.name, i.insight_type, i.insight_text, i.time_relevance
  FROM venue_insights i
  JOIN venues v ON v.id = i.venue_id
  ORDER BY i.display_priority DESC
  LIMIT 15
`).all();

console.log('\nSample insights (highest priority):');
console.table(samples);

db.close();
