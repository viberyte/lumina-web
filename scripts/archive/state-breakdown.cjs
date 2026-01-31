const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

console.log('='.repeat(60));
console.log('LUMINA DATABASE - STATE BY STATE BREAKDOWN');
console.log('='.repeat(60));

// Get breakdown by state
const states = db.prepare(`
  SELECT 
    state,
    COUNT(*) as total,
    SUM(CASE WHEN should_exclude = 1 THEN 1 ELSE 0 END) as excluded,
    SUM(CASE WHEN should_exclude = 0 OR should_exclude IS NULL THEN 1 ELSE 0 END) as active,
    ROUND(AVG(CASE WHEN google_rating > 0 THEN google_rating END), 2) as avg_rating,
    SUM(CASE WHEN google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]' THEN 1 ELSE 0 END) as with_photos
  FROM venues
  GROUP BY state
  ORDER BY active DESC
`).all();

states.forEach(s => {
  const state = s.state || 'UNKNOWN';
  const photoPercent = s.active > 0 ? Math.round((s.with_photos / s.active) * 100) : 0;
  
  console.log(`\n📍 ${state}`);
  console.log(`   Active:    ${s.active} venues`);
  console.log(`   Excluded:  ${s.excluded} venues`);
  console.log(`   Avg Rating: ${s.avg_rating || 'N/A'} ⭐`);
  console.log(`   With Photos: ${s.with_photos} (${photoPercent}%)`);
});

// City breakdown within each state
console.log('\n' + '='.repeat(60));
console.log('TOP CITIES BY STATE');
console.log('='.repeat(60));

const mainStates = ['NY', 'DC', 'PA', 'MD', 'VA', 'NJ'];

mainStates.forEach(state => {
  const cities = db.prepare(`
    SELECT city, COUNT(*) as count
    FROM venues
    WHERE state = ? AND (should_exclude = 0 OR should_exclude IS NULL)
    GROUP BY city
    ORDER BY count DESC
    LIMIT 10
  `).all(state);
  
  console.log(`\n📍 ${state}:`);
  cities.forEach(c => {
    console.log(`   ${c.city}: ${c.count}`);
  });
});

// Summary
const totals = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN should_exclude = 1 THEN 1 ELSE 0 END) as excluded,
    SUM(CASE WHEN should_exclude = 0 OR should_exclude IS NULL THEN 1 ELSE 0 END) as active
  FROM venues
`).get();

console.log('\n' + '='.repeat(60));
console.log('GRAND TOTAL');
console.log('='.repeat(60));
console.log(`Total in DB:     ${totals.total}`);
console.log(`Active:          ${totals.active}`);
console.log(`Excluded:        ${totals.excluded}`);
console.log('='.repeat(60));

db.close();
