const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🗺️ Consolidating city names...\n');

// Fix DC variations
const dcResult = db.prepare(`
  UPDATE venues 
  SET city = 'Washington DC'
  WHERE state = 'DC' AND city IN ('Washington', 'Washington D.C.', 'Washington Dc', 'Washington, D.C.', 'Washington, DC')
`).run();
console.log(`✅ DC consolidated: ${dcResult.changes} venues`);

// Fix NY variations - consolidate to Manhattan, Brooklyn, Queens, etc.
const nycResult = db.prepare(`
  UPDATE venues 
  SET city = 'Manhattan'
  WHERE state = 'NY' AND city IN ('New York', 'New York City', 'NoHo', 'NoMAD', 'SoHo', 'East Village', 'Koreatown')
`).run();
console.log(`✅ Manhattan consolidated: ${nycResult.changes} venues`);

// Fix "New York" state entries
const nyStateResult = db.prepare(`
  UPDATE venues 
  SET state = 'NY', city = 'Manhattan'
  WHERE state = 'New York' AND city = 'New York City'
`).run();
console.log(`✅ NY state fixed: ${nyStateResult.changes} venues`);

// Brooklyn
const brooklynResult = db.prepare(`
  UPDATE venues 
  SET city = 'Brooklyn'
  WHERE state IN ('NY', 'New York') AND city IN ('Williamsburg', 'Bushwick')
`).run();
console.log(`✅ Brooklyn consolidated: ${brooklynResult.changes} venues`);

// Queens
const queensResult = db.prepare(`
  UPDATE venues 
  SET city = 'Queens'
  WHERE state IN ('NY', 'New York') AND city IN ('Astoria', 'Flushing', 'Long Island City', 'Jackson Heights', 'Elmhurst')
`).run();
console.log(`✅ Queens consolidated: ${queensResult.changes} venues`);

// Fix remaining "New York" state to "NY"
const stateFixResult = db.prepare(`
  UPDATE venues SET state = 'NY' WHERE state = 'New York'
`).run();
console.log(`✅ State name fixed: ${stateFixResult.changes} venues`);

// Remove international venues (Paris, Barcelona, Dubai, Marrakech)
const intlResult = db.prepare(`
  UPDATE venues SET should_exclude = 1, exclusion_reason = 'International location'
  WHERE city IN ('Paris', 'Barcelona', 'Dubai', 'Marrakech', 'All US', 'Multiple Locations', 'city')
`).run();
console.log(`✅ International excluded: ${intlResult.changes} venues`);

// Show final breakdown
console.log('\n📊 Final city breakdown:');
const counts = db.prepare(`
  SELECT state, city, COUNT(*) as count 
  FROM venues 
  WHERE should_exclude = 0
  GROUP BY state, city
  ORDER BY state, count DESC
`).all();

let currentState = '';
counts.forEach(c => {
  if (c.state !== currentState) {
    currentState = c.state;
    console.log(`\n${c.state}:`);
  }
  console.log(`   ${c.city}: ${c.count}`);
});

db.close();
console.log('\n✅ Done!');
