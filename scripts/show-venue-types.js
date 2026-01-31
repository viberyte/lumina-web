import Database from 'better-sqlite3';

const db = new Database('./data/lumina.db');

console.log('📊 VENUE TYPE BREAKDOWN\n');

// 1. Categories
console.log('🏷️  TOP CATEGORIES:');
const categories = db.prepare(`
  SELECT category, COUNT(*) as count
  FROM venues
  WHERE category IS NOT NULL AND category != ''
  GROUP BY category
  ORDER BY count DESC
  LIMIT 30
`).all();
categories.forEach(c => console.log(`  ${c.count.toString().padStart(4)} | ${c.category}`));

console.log('\n🍽️  TOP CUISINES:');
const cuisines = db.prepare(`
  SELECT cuisine_primary, COUNT(*) as count
  FROM venues
  WHERE cuisine_primary IS NOT NULL AND cuisine_primary != ''
  GROUP BY cuisine_primary
  ORDER BY count DESC
  LIMIT 30
`).all();
cuisines.forEach(c => console.log(`  ${c.count.toString().padStart(4)} | ${c.cuisine_primary}`));

console.log('\n🎵 NIGHTLIFE VIBES:');
const nightlife = db.prepare(`
  SELECT name, category, cuisine_primary, vibe_tags
  FROM venues
  WHERE LOWER(category) LIKE '%lounge%'
     OR LOWER(category) LIKE '%club%'
     OR LOWER(category) LIKE '%bar%'
     OR LOWER(cuisine_primary) LIKE '%lounge%'
     OR LOWER(cuisine_primary) LIKE '%hookah%'
  LIMIT 20
`).all();
nightlife.forEach(v => {
  console.log(`  ${v.name}`);
  console.log(`    Category: ${v.category || 'N/A'}`);
  console.log(`    Cuisine: ${v.cuisine_primary || 'N/A'}`);
  console.log(`    Vibes: ${v.vibe_tags || 'N/A'}\n`);
});

db.close();
