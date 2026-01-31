const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('Applying diminishing returns to transition scores...');

// Get all transitions
const transitions = db.prepare(`
  SELECT id, compatibility_score, distance_meters, vibe_match_score, acoustic_flow_valid
  FROM venue_transitions
`).all();

const updateStmt = db.prepare(`
  UPDATE venue_transitions 
  SET compatibility_score = ?
  WHERE id = ?
`);

let adjusted = 0;

for (const t of transitions) {
  let score = t.compatibility_score;
  const originalScore = score;
  
  // Apply diminishing returns above 85
  if (score > 85) {
    const excess = score - 85;
    // Excess points apply at 50% strength
    score = 85 + Math.round(excess * 0.5);
  }
  
  // Hard cap at 95 unless distance < 300m AND vibe match > 70
  if (score > 95) {
    if (t.distance_meters >= 300 || t.vibe_match_score < 70) {
      score = 95;
    }
  }
  
  // Final cap at 98 (nothing is perfect)
  score = Math.min(98, score);
  
  // Slight penalty for acoustic flow violations that still made it through
  if (!t.acoustic_flow_valid) {
    score = Math.max(30, score - 15);
  }
  
  if (score !== originalScore) {
    updateStmt.run(score, t.id);
    adjusted++;
  }
}

console.log(`✅ Adjusted ${adjusted} transition scores`);

// Show new distribution
const dist = db.prepare(`
  SELECT 
    CASE 
      WHEN compatibility_score >= 90 THEN '90-100'
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

console.log('\nNew score distribution:');
console.table(dist);

// Show new top 10
const top = db.prepare(`
  SELECT 
    f.name as from_venue,
    t.name as to_venue,
    vt.compatibility_score as score,
    vt.distance_meters as dist,
    vt.vibe_match_score as vibe
  FROM venue_transitions vt
  JOIN venues f ON f.id = vt.from_venue_id
  JOIN venues t ON t.id = vt.to_venue_id
  ORDER BY vt.compatibility_score DESC
  LIMIT 10
`).all();

console.log('\nNew top 10 transitions:');
console.table(top);

db.close();
