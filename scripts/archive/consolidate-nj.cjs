const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// North Jersey cities (closer to NYC)
const northJerseyCities = [
  'Jersey City', 'Newark', 'Hoboken', 'Weehawken', 'Edgewater', 
  'Fort Lee', 'Montclair', 'Clifton', 'Paterson', 'Bayonne',
  'Secaucus', 'East Rutherford', 'Englewood', 'Teaneck', 'Oradell',
  'Ridgewood', 'Morristown', 'Short Hills', 'Bloomfield', 'Belleville',
  'Caldwell', 'Totowa', 'Wood-Ridge', 'Rochelle Park', 'north Jersey',
  'NJ', 'New Jersey', 'Basking Ridge', 'Somerville', 'Metuchen',
  'Edison', 'South Plainfield', 'Old Bridge', 'Carteret', 'Woodbridge',
  'Franklin Park', 'Jamesburg', 'Monroe', 'Monroe Township', 'Princeton'
];

// South Jersey cities (closer to Philly)
const southJerseyCities = [
  'Camden', 'Cherry Hill', 'Collingswood', 'Gloucester City', 
  'Trenton', 'Hamilton', 'Lambertville', 'Vineland',
  'Asbury Park', 'Neptune', 'Freehold', 'Manalapan', 'Howell',
  'Brick', 'Farmingdale'
];

console.log('🗺️ Consolidating NJ venues into North/South Jersey...\n');

// Update North Jersey
const northResult = db.prepare(`
  UPDATE venues 
  SET city = 'North Jersey', neighborhood = city
  WHERE state = 'NJ' AND city IN (${northJerseyCities.map(() => '?').join(',')})
`).run(...northJerseyCities);

console.log(`✅ North Jersey: ${northResult.changes} venues updated`);

// Update South Jersey  
const southResult = db.prepare(`
  UPDATE venues 
  SET city = 'South Jersey', neighborhood = city
  WHERE state = 'NJ' AND city IN (${southJerseyCities.map(() => '?').join(',')})
`).run(...southJerseyCities);

console.log(`✅ South Jersey: ${southResult.changes} venues updated`);

// Also fix any remaining with weird city names
const cleanupResult = db.prepare(`
  UPDATE venues 
  SET city = 'North Jersey', neighborhood = city
  WHERE state = 'NJ' AND city NOT IN ('North Jersey', 'South Jersey')
`).run();

console.log(`✅ Cleanup: ${cleanupResult.changes} venues fixed`);

// Show final counts
const counts = db.prepare(`
  SELECT city, COUNT(*) as count 
  FROM venues 
  WHERE state = 'NJ' 
  GROUP BY city
`).all();

console.log('\n📊 Final NJ breakdown:');
counts.forEach(c => console.log(`   ${c.city}: ${c.count} venues`));

db.close();
console.log('\n✅ Done!');
