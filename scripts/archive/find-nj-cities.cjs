const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

console.log('='.repeat(60));
console.log('HUNTING FOR MISSING NJ VENUES');
console.log('='.repeat(60));

// Known NJ cities that might be miscategorized
const njCities = [
  'Hoboken', 'Jersey City', 'Newark', 'Montclair', 'Edgewater',
  'Fort Lee', 'Weehawken', 'West New York', 'Union City', 'North Bergen',
  'Secaucus', 'Bayonne', 'Kearny', 'Harrison', 'East Orange',
  'Orange', 'Bloomfield', 'Nutley', 'Belleville', 'Clifton',
  'Passaic', 'Paterson', 'Hackensack', 'Teaneck', 'Englewood',
  'Ridgewood', 'Paramus', 'Fair Lawn', 'Glen Rock', 'Rutherford',
  'East Rutherford', 'Lyndhurst', 'Wood-Ridge', 'Carlstadt',
  'Princeton', 'New Brunswick', 'Edison', 'Woodbridge', 'Perth Amboy',
  'Elizabeth', 'Linden', 'Rahway', 'Plainfield', 'Somerville',
  'Morristown', 'Madison', 'Chatham', 'Summit', 'Millburn',
  'Short Hills', 'Maplewood', 'South Orange', 'West Orange',
  'Livingston', 'Caldwell', 'Verona', 'Cedar Grove', 'Little Falls',
  'Totowa', 'Wayne', 'Hawthorne', 'Haledon', 'Prospect Park',
  'Atlantic City', 'Asbury Park', 'Red Bank', 'Long Branch',
  'Freehold', 'Howell', 'Toms River', 'Brick', 'Lakewood',
  'Cherry Hill', 'Camden', 'Collingswood', 'Haddonfield', 'Moorestown',
  'Trenton', 'Hamilton', 'Ewing', 'Lawrence', 'Lawrenceville'
];

console.log('\n🔍 Checking NJ cities in wrong states:');

njCities.forEach(city => {
  // Check if this city exists with wrong state
  const wrongState = db.prepare(`
    SELECT id, name, city, state FROM venues 
    WHERE city = ? AND state != 'NJ' AND state IS NOT NULL
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).all(city);
  
  if (wrongState.length > 0) {
    console.log(`\n⚠️  ${city} (found in wrong state):`);
    wrongState.forEach(v => {
      console.log(`   [${v.state}] ${v.name}`);
    });
  }
});

// Check for NJ venues with "New York City" as city
console.log('\n' + '='.repeat(60));
console.log('NJ VENUES WITH "New York City" AS CITY:');
const nycInNJ = db.prepare(`
  SELECT id, name, city, state, address FROM venues 
  WHERE state = 'NJ' AND city = 'New York City'
`).all();
nycInNJ.forEach(v => {
  console.log(`   ${v.name} - ${v.address || 'no address'}`);
});

// Check venues with NULL state in NJ cities
console.log('\n' + '='.repeat(60));
console.log('VENUES IN NJ CITIES WITH NULL/UNKNOWN STATE:');
let nullStateNJ = [];
njCities.forEach(city => {
  const found = db.prepare(`
    SELECT id, name, city FROM venues 
    WHERE city = ? AND (state IS NULL OR state = '')
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).all(city);
  nullStateNJ = nullStateNJ.concat(found);
});
console.log(`Found: ${nullStateNJ.length} venues`);
nullStateNJ.slice(0, 20).forEach(v => {
  console.log(`   ${v.name} (${v.city})`);
});

// Current NJ venue count by city
console.log('\n' + '='.repeat(60));
console.log('CURRENT NJ VENUES BY CITY:');
const njByCity = db.prepare(`
  SELECT city, COUNT(*) as count FROM venues 
  WHERE state = 'NJ' AND (should_exclude = 0 OR should_exclude IS NULL)
  GROUP BY city ORDER BY count DESC
`).all();
njByCity.forEach(c => {
  console.log(`   ${c.city}: ${c.count}`);
});

console.log('\n' + '='.repeat(60));
console.log(`TOTAL NJ VENUES: ${njByCity.reduce((a, b) => a + b.count, 0)}`);
console.log('='.repeat(60));

db.close();
