const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

const venues = db.prepare(`
  SELECT name, city, state, google_rating, category
  FROM venues 
  WHERE should_exclude = 0 OR should_exclude IS NULL
  ORDER BY state, city, name
`).all();

const byState = {};
venues.forEach(v => {
  const state = v.state || 'UNKNOWN';
  if (!byState[state]) byState[state] = [];
  byState[state].push(v);
});

console.log('='.repeat(60));
console.log('LUMINA VENUE DATABASE - BY STATE');
console.log('='.repeat(60));

Object.keys(byState).sort().forEach(state => {
  const stateVenues = byState[state];
  console.log(`\n--- ${state} (${stateVenues.length} venues) ---`);
  
  const byCity = {};
  stateVenues.forEach(v => {
    const city = v.city || 'Unknown City';
    if (!byCity[city]) byCity[city] = [];
    byCity[city].push(v);
  });
  
  Object.keys(byCity).sort().forEach(city => {
    console.log(`\n  ${city} (${byCity[city].length}):`);
    byCity[city].slice(0, 20).forEach(v => {
      const rating = v.google_rating ? ` [${v.google_rating}]` : '';
      console.log(`    - ${v.name}${rating}`);
    });
    if (byCity[city].length > 20) {
      console.log(`    ... and ${byCity[city].length - 20} more`);
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log('SUMMARY BY STATE:');
Object.keys(byState).sort().forEach(state => {
  console.log(`  ${state}: ${byState[state].length} venues`);
});
console.log(`\nTOTAL: ${venues.length} active venues`);
db.close();
