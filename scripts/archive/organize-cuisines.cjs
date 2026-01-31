const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🍽️ Organizing cuisine types...\n');

// Fix Soul Food - check names and vibe_tags
const soulFoodResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'Soul Food'
  WHERE cuisine_primary = 'American' 
  AND (name LIKE '%Soul%' OR name LIKE '%soul%' OR cuisine_secondary LIKE '%Southern%' OR cuisine_secondary = 'Comfort Food')
  AND should_exclude = 0
`).run();
console.log(`✅ Soul Food: ${soulFoodResult.changes} venues updated`);

// Fix Steakhouse
const steakhouseResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'Steakhouse'
  WHERE cuisine_primary = 'American' 
  AND (name LIKE '%Steak%' OR name LIKE '%steak%' OR cuisine_secondary = 'Steakhouse')
  AND should_exclude = 0
`).run();
console.log(`✅ Steakhouse: ${steakhouseResult.changes} venues updated`);

// Fix BBQ/Barbecue
const bbqResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'BBQ'
  WHERE cuisine_primary = 'American' 
  AND (name LIKE '%BBQ%' OR name LIKE '%Barbecue%' OR cuisine_secondary = 'Barbecue')
  AND should_exclude = 0
`).run();
console.log(`✅ BBQ: ${bbqResult.changes} venues updated`);

// Fix Southern
const southernResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'Southern'
  WHERE cuisine_primary = 'American' 
  AND (name LIKE '%Southern%' OR cuisine_secondary = 'Southern')
  AND should_exclude = 0
`).run();
console.log(`✅ Southern: ${southernResult.changes} venues updated`);

// Fix Bar/Pub Food - make it "American Bar & Grill"
const barFoodResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'American Bar & Grill'
  WHERE cuisine_primary = 'American' 
  AND cuisine_secondary IN ('Bar Food', 'Bar', 'Pub', 'Pub Food', 'Bar Bites')
  AND should_exclude = 0
`).run();
console.log(`✅ American Bar & Grill: ${barFoodResult.changes} venues updated`);

// Fix Brunch spots
const brunchResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'Brunch'
  WHERE cuisine_primary = 'American' 
  AND (name LIKE '%Brunch%' OR cuisine_secondary IN ('Brunch', 'Breakfast'))
  AND should_exclude = 0
`).run();
console.log(`✅ Brunch: ${brunchResult.changes} venues updated`);

// Fix Seafood
const seafoodResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'Seafood'
  WHERE cuisine_primary = 'American' 
  AND cuisine_secondary = 'Seafood'
  AND should_exclude = 0
`).run();
console.log(`✅ Seafood: ${seafoodResult.changes} venues updated`);

// Rename remaining American with Contemporary/New American to "New American"
const newAmericanResult = db.prepare(`
  UPDATE venues SET cuisine_primary = 'New American'
  WHERE cuisine_primary = 'American' 
  AND cuisine_secondary IN ('Contemporary', 'New American', 'Fusion')
  AND should_exclude = 0
`).run();
console.log(`✅ New American: ${newAmericanResult.changes} venues updated`);

// Consolidate duplicate cuisine types
const consolidateResult1 = db.prepare(`UPDATE venues SET cuisine_primary = 'Latin' WHERE cuisine_primary = 'Latin American' AND should_exclude = 0`).run();
const consolidateResult2 = db.prepare(`UPDATE venues SET cuisine_primary = 'New American' WHERE cuisine_primary IN ('Modern American', 'Contemporary American') AND should_exclude = 0`).run();
const consolidateResult3 = db.prepare(`UPDATE venues SET cuisine_primary = 'Asian Fusion' WHERE cuisine_primary IN ('Pan Asian', 'Asian') AND should_exclude = 0`).run();
console.log(`✅ Consolidated: ${consolidateResult1.changes + consolidateResult2.changes + consolidateResult3.changes} duplicates merged`);

// Clean up N/A and null
const cleanupResult = db.prepare(`UPDATE venues SET cuisine_primary = NULL WHERE cuisine_primary IN ('N/A', 'null', 'Bar', 'Cocktails', 'Bar Food') AND should_exclude = 0`).run();
console.log(`✅ Cleanup: ${cleanupResult.changes} invalid cuisines removed`);

// Show final breakdown
console.log('\n📊 Final cuisine breakdown (top 40):');
const counts = db.prepare(`
  SELECT cuisine_primary, COUNT(*) as count 
  FROM venues 
  WHERE should_exclude = 0 AND cuisine_primary IS NOT NULL AND cuisine_primary != ''
  GROUP BY cuisine_primary
  ORDER BY count DESC
  LIMIT 40
`).all();

counts.forEach(c => {
  console.log(`   ${c.cuisine_primary}: ${c.count}`);
});

db.close();
console.log('\n✅ Done!');
