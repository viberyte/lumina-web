/**
 * VENUE TAG VALIDATOR - For lumina.db schema
 * Run: node venue-tag-validator.js
 */

import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🔍 VENUE TAG ANALYSIS\n');

// 1. MISSING TAGS REPORT
console.log('━━━ MISSING TAGS REPORT ━━━');
const missingTags = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN category IS NULL OR category = '' THEN 1 END) as missing_category,
    COUNT(CASE WHEN vibe_tags IS NULL OR vibe_tags = '' THEN 1 END) as missing_vibe,
    COUNT(CASE WHEN google_price_level IS NULL THEN 1 END) as missing_price,
    COUNT(CASE WHEN neighborhood IS NULL OR neighborhood = '' THEN 1 END) as missing_neighborhood,
    COUNT(CASE WHEN cuisine IS NULL OR cuisine = '' THEN 1 END) as missing_cuisine,
    COUNT(CASE WHEN music_genres IS NULL OR music_genres = '' THEN 1 END) as missing_music
  FROM venues
`).get();

console.log('Total Venues:', missingTags.total);
console.log('Missing category:', missingTags.missing_category, `(${Math.round(missingTags.missing_category/missingTags.total*100)}%)`);
console.log('Missing vibe_tags:', missingTags.missing_vibe, `(${Math.round(missingTags.missing_vibe/missingTags.total*100)}%)`);
console.log('Missing price_level:', missingTags.missing_price, `(${Math.round(missingTags.missing_price/missingTags.total*100)}%)`);
console.log('Missing neighborhood:', missingTags.missing_neighborhood, `(${Math.round(missingTags.missing_neighborhood/missingTags.total*100)}%)`);
console.log('Missing cuisine:', missingTags.missing_cuisine, `(${Math.round(missingTags.missing_cuisine/missingTags.total*100)}%)`);
console.log('Missing music_genres:', missingTags.missing_music, `(${Math.round(missingTags.missing_music/missingTags.total*100)}%)`);

// 2. CATEGORY DISTRIBUTION
console.log('\n━━━ CATEGORY BREAKDOWN ━━━');
const categoryBreakdown = db.prepare(`
  SELECT category, COUNT(*) as count
  FROM venues
  GROUP BY category
  ORDER BY count DESC
  LIMIT 20
`).all();

categoryBreakdown.forEach(row => {
  console.log(`${row.category || 'NULL/EMPTY'}: ${row.count}`);
});

// 3. PRICE TIER DISTRIBUTION
console.log('\n━━━ PRICE TIER BREAKDOWN ━━━');
const priceBreakdown = db.prepare(`
  SELECT price_tier, COUNT(*) as count
  FROM venues
  WHERE price_tier IS NOT NULL
  GROUP BY price_tier
  ORDER BY count DESC
`).all();

priceBreakdown.forEach(row => {
  console.log(`${row.price_tier}: ${row.count}`);
});

// 4. RECOMMENDATION ENGINE TESTS
console.log('\n━━━ TESTING RECOMMENDATION QUERIES ━━━\n');

const testQueries = [
  { category: 'Lounge', tier: 'Upscale', city: 'Harlem' },
  { category: 'Restaurant', tier: 'Affordable', city: 'Brooklyn', cuisine: 'caribbean' },
  { category: 'Nightclub', tier: 'Mid-Range', city: 'Manhattan' },
  { category: 'Bar', tier: 'Affordable', city: 'East Village' },
  { category: 'Restaurant', cuisine: 'african', city: 'Harlem' }
];

testQueries.forEach((query, idx) => {
  console.log(`Test ${idx + 1}: ${query.category || 'Any'} | ${query.tier || 'Any'} | ${query.city}${query.cuisine ? ` | ${query.cuisine}` : ''}`);
  
  let sql = `SELECT name, category, neighborhood, price_tier, cuisine FROM venues WHERE 1=1`;
  const params = [];
  
  if (query.category) {
    sql += ` AND (category LIKE ? OR subcategory LIKE ?)`;
    params.push(`%${query.category}%`, `%${query.category}%`);
  }
  
  if (query.city) {
    sql += ` AND (city LIKE ? OR neighborhood LIKE ?)`;
    params.push(`%${query.city}%`, `%${query.city}%`);
  }
  
  if (query.cuisine) {
    sql += ` AND (cuisine LIKE ? OR cuisine_types LIKE ?)`;
    params.push(`%${query.cuisine}%`, `%${query.cuisine}%`);
  }
  
  if (query.tier) {
    sql += ` AND price_tier LIKE ?`;
    params.push(`%${query.tier}%`);
  }
  
  sql += ` LIMIT 5`;
  
  const results = db.prepare(sql).all(...params);
  
  if (results.length === 0) {
    console.log('  ❌ NO RESULTS FOUND - RECOMMENDATION ENGINE FAILING');
  } else {
    console.log(`  ✅ Found ${results.length} venues:`);
    results.forEach(r => {
      const location = r.neighborhood || 'Unknown area';
      const price = r.price_tier || 'Unknown price';
      const food = r.cuisine || 'N/A';
      console.log(`    - ${r.name} (${location}) | ${r.category} | ${price} | ${food}`);
    });
  }
  console.log('');
});

// 5. MUSIC GENRE ANALYSIS
console.log('━━━ MUSIC GENRE COVERAGE ━━━');
const musicGenres = db.prepare(`
  SELECT music_genres, COUNT(*) as count
  FROM venues
  WHERE music_genres IS NOT NULL AND music_genres != ''
  GROUP BY music_genres
  ORDER BY count DESC
  LIMIT 15
`).all();

console.log(`Venues with music genres: ${musicGenres.reduce((sum, g) => sum + g.count, 0)}`);
musicGenres.forEach(g => {
  console.log(`  ${g.music_genres}: ${g.count}`);
});

db.close();
console.log('\n✅ ANALYSIS COMPLETE\n');
