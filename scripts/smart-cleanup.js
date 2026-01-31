import Database from 'better-sqlite3';

const db = new Database('./data/lumina.db');

console.log('🧹 Smart database cleanup...\n');

// 1. Remove Fast Food category
const fastFood = db.prepare(`
  DELETE FROM venues 
  WHERE LOWER(category) LIKE '%fast food%' 
  OR LOWER(category) LIKE '%quick service%'
  OR LOWER(cuisine_primary) LIKE '%fast food%'
`).run();
console.log(`❌ Removed ${fastFood.changes} fast food venues`);

// 2. Remove venues with $ price tier AND no vibe tags (likely chains)
const cheapNoVibe = db.prepare(`
  DELETE FROM venues 
  WHERE price_tier = '$' 
  AND (vibe_tags IS NULL OR vibe_tags = '[]' OR vibe_tags = '')
`).run();
console.log(`❌ Removed ${cheapNoVibe.changes} cheap venues with no vibe`);

// 3. Remove venues with no category, no cuisine, no vibes (incomplete data)
const incomplete = db.prepare(`
  DELETE FROM venues 
  WHERE (category IS NULL OR category = '')
  AND (cuisine_primary IS NULL OR cuisine_primary = '')
  AND (vibe_tags IS NULL OR vibe_tags = '[]' OR vibe_tags = '')
`).run();
console.log(`❌ Removed ${incomplete.changes} incomplete venues`);

// 4. Check for more chain patterns
const chainPatterns = [
  '%pizza hut%',
  '%domino%',
  '%papa john%',
  '%taco bell%',
  '%kfc%',
  '%popeyes%',
  '%wendy%',
  '%burger king%',
  '%arby%',
  '%jersey mike%',
  '%jimmy john%',
  '%firehouse sub%',
  '%qdoba%',
  '%moe\'s%',
  '%boston market%',
  '%panda express%'
];

let chainCount = 0;
chainPatterns.forEach(pattern => {
  const result = db.prepare(`DELETE FROM venues WHERE LOWER(name) LIKE ?`).run(pattern);
  chainCount += result.changes;
});
console.log(`❌ Removed ${chainCount} additional chain patterns`);

const total = fastFood.changes + cheapNoVibe.changes + incomplete.changes + chainCount;
console.log(`\n✅ Total removed in Phase 2: ${total}`);

const remaining = db.prepare('SELECT COUNT(*) as count FROM venues').get();
console.log(`📊 Remaining venues: ${remaining.count}`);

// Show breakdown
const breakdown = db.prepare(`
  SELECT 
    price_tier,
    COUNT(*) as count
  FROM venues
  GROUP BY price_tier
  ORDER BY count DESC
`).all();

console.log('\n💰 Price tier breakdown:');
breakdown.forEach(row => {
  console.log(`  ${row.price_tier || 'Unknown'}: ${row.count} venues`);
});

db.close();
