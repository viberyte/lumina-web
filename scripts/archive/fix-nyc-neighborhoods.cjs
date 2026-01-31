const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🗺️ Fixing NYC venue locations based on neighborhood...\n');

// Move Brooklyn neighborhoods to Brooklyn
const brooklynResult = db.prepare(`
  UPDATE venues 
  SET city = 'Brooklyn'
  WHERE city = 'Manhattan' AND neighborhood IN ('Brooklyn', 'Williamsburg', 'Bushwick', 'DUMBO', 'Park Slope', 'Bedford-Stuyvesant', 'Greenpoint', 'Crown Heights', 'Prospect Heights')
`).run();
console.log(`✅ Brooklyn: ${brooklynResult.changes} venues moved`);

// Move Queens neighborhoods to Queens
const queensResult = db.prepare(`
  UPDATE venues 
  SET city = 'Queens'
  WHERE city = 'Manhattan' AND neighborhood IN ('Queens', 'Astoria', 'Long Island City', 'Flushing', 'Jackson Heights', 'Forest Hills', 'Sunnyside', 'Bayside', 'Rego Park', 'Ridgewood', 'Fresh Meadows', 'Kew Gardens', 'Little Neck', 'Woodside', 'Woodhaven', 'South Richmond Hill', 'South Ozone Park', 'Richmond Hill', 'Queens Village', 'Rosedale')
`).run();
console.log(`✅ Queens: ${queensResult.changes} venues moved`);

// Move Bronx neighborhoods to Bronx
const bronxResult = db.prepare(`
  UPDATE venues 
  SET city = 'The Bronx'
  WHERE city = 'Manhattan' AND neighborhood IN ('Bronx', 'The Bronx')
`).run();
console.log(`✅ Bronx: ${bronxResult.changes} venues moved`);

// Move Staten Island to Staten Island
const siResult = db.prepare(`
  UPDATE venues 
  SET city = 'Staten Island'
  WHERE city = 'Manhattan' AND neighborhood IN ('Staten Island', 'Staten Island, NY')
`).run();
console.log(`✅ Staten Island: ${siResult.changes} venues moved`);

// Move NJ neighborhoods to North Jersey
const njResult = db.prepare(`
  UPDATE venues 
  SET city = 'North Jersey', state = 'NJ'
  WHERE city = 'Manhattan' AND neighborhood IN ('Newark', 'Montclair', 'Jersey City', 'Edgewater', 'Hoboken', 'North Bergen', 'Weehawken', 'Weehawken, NJ', 'Elizabeth', 'Nutley', 'Newark, NJ', 'Belleville', 'West Orange', 'South Orange Village', 'Saddle River')
`).run();
console.log(`✅ North Jersey: ${njResult.changes} venues moved`);

// Show final breakdown
console.log('\n📊 Final breakdown by city:');
const counts = db.prepare(`
  SELECT state, city, COUNT(*) as count 
  FROM venues 
  WHERE should_exclude = 0
  GROUP BY state, city
  ORDER BY count DESC
`).all();

counts.forEach(c => {
  console.log(`   ${c.state} - ${c.city}: ${c.count}`);
});

// Show Manhattan neighborhoods now
console.log('\n📊 Manhattan neighborhoods remaining:');
const manhattanHoods = db.prepare(`
  SELECT neighborhood, COUNT(*) as count 
  FROM venues 
  WHERE city = 'Manhattan' AND should_exclude = 0 
  GROUP BY neighborhood 
  ORDER BY count DESC 
  LIMIT 20
`).all();
manhattanHoods.forEach(h => {
  console.log(`   ${h.neighborhood || '(none)'}: ${h.count}`);
});

db.close();
console.log('\n✅ Done!');
