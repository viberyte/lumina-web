const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

console.log('='.repeat(60));
console.log('LUMINA DATABASE - CATEGORY & CUISINE BREAKDOWN');
console.log('='.repeat(60));

// 1. Main categories
console.log('\n📂 MAIN CATEGORIES:');
const categories = db.prepare(`
  SELECT category, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  GROUP BY category 
  ORDER BY count DESC
`).all();
categories.forEach(c => {
  console.log(`   ${c.category || 'NULL'}: ${c.count}`);
});

// 2. Subcategories
console.log('\n📁 SUBCATEGORIES:');
const subcategories = db.prepare(`
  SELECT subcategory, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND subcategory IS NOT NULL AND subcategory != ''
  GROUP BY subcategory 
  ORDER BY count DESC
  LIMIT 30
`).all();
subcategories.forEach(c => {
  console.log(`   ${c.subcategory}: ${c.count}`);
});

// 3. Experience types
console.log('\n🎭 EXPERIENCE TYPES:');
const expTypes = db.prepare(`
  SELECT experience_type, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND experience_type IS NOT NULL AND experience_type != ''
  GROUP BY experience_type 
  ORDER BY count DESC
`).all();
expTypes.forEach(c => {
  console.log(`   ${c.experience_type}: ${c.count}`);
});

// 4. Cuisine Primary
console.log('\n🍽️  CUISINE PRIMARY:');
const cuisinePrimary = db.prepare(`
  SELECT cuisine_primary, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND cuisine_primary IS NOT NULL AND cuisine_primary != ''
  GROUP BY cuisine_primary 
  ORDER BY count DESC
  LIMIT 40
`).all();
cuisinePrimary.forEach(c => {
  console.log(`   ${c.cuisine_primary}: ${c.count}`);
});

// 5. Standardized category
console.log('\n🏷️  STANDARDIZED CATEGORY:');
const stdCat = db.prepare(`
  SELECT standardized_category, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND standardized_category IS NOT NULL AND standardized_category != ''
  GROUP BY standardized_category 
  ORDER BY count DESC
`).all();
stdCat.forEach(c => {
  console.log(`   ${c.standardized_category}: ${c.count}`);
});

// 6. Lounge types
console.log('\n🍸 LOUNGE TYPES:');
const loungeTypes = db.prepare(`
  SELECT lounge_type, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND lounge_type IS NOT NULL AND lounge_type != ''
  GROUP BY lounge_type 
  ORDER BY count DESC
`).all();
loungeTypes.forEach(c => {
  console.log(`   ${c.lounge_type}: ${c.count}`);
});

// 7. Music genres
console.log('\n🎵 MUSIC GENRES:');
const musicGenres = db.prepare(`
  SELECT music_genres, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]'
  GROUP BY music_genres 
  ORDER BY count DESC
  LIMIT 30
`).all();
musicGenres.forEach(c => {
  console.log(`   ${c.music_genres}: ${c.count}`);
});

// 8. Vibe tags sample
console.log('\n✨ VIBE TAGS (sample):');
const vibeTags = db.prepare(`
  SELECT vibe_tags, COUNT(*) as count 
  FROM venues 
  WHERE (should_exclude = 0 OR should_exclude IS NULL)
  AND vibe_tags IS NOT NULL AND vibe_tags != '' AND vibe_tags != '[]'
  GROUP BY vibe_tags 
  ORDER BY count DESC
  LIMIT 20
`).all();
vibeTags.forEach(c => {
  console.log(`   ${c.vibe_tags.substring(0, 60)}${c.vibe_tags.length > 60 ? '...' : ''}: ${c.count}`);
});

// Summary: How many have key fields populated
console.log('\n' + '='.repeat(60));
console.log('FIELD COVERAGE (of active venues):');
console.log('='.repeat(60));

const total = db.prepare(`SELECT COUNT(*) as c FROM venues WHERE should_exclude = 0 OR should_exclude IS NULL`).get().c;

const fields = [
  'category', 'subcategory', 'cuisine_primary', 'standardized_category',
  'lounge_type', 'music_genres', 'vibe_tags', 'energy_level',
  'first_date_suitable', 'pregame_spot', 'late_night_spot'
];

fields.forEach(field => {
  const filled = db.prepare(`
    SELECT COUNT(*) as c FROM venues 
    WHERE (should_exclude = 0 OR should_exclude IS NULL)
    AND ${field} IS NOT NULL AND ${field} != '' AND ${field} != '[]' AND ${field} != 0
  `).get().c;
  const pct = Math.round((filled / total) * 100);
  console.log(`   ${field}: ${filled} (${pct}%)`);
});

db.close();
