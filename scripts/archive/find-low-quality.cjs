const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

console.log('='.repeat(60));
console.log('SCANNING FOR LOW QUALITY VENUES');
console.log('='.repeat(60));

// 1. Low ratings (below 3.5)
const lowRated = db.prepare(`
  SELECT COUNT(*) as count FROM venues 
  WHERE google_rating < 3.5 
  AND google_rating > 0
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).get();
console.log(`\n⭐ Rating below 3.5: ${lowRated.count} venues`);

// Show some examples
const lowRatedExamples = db.prepare(`
  SELECT name, city, state, google_rating FROM venues 
  WHERE google_rating < 3.5 AND google_rating > 0
  AND (should_exclude = 0 OR should_exclude IS NULL)
  ORDER BY google_rating ASC LIMIT 15
`).all();
lowRatedExamples.forEach(v => {
  console.log(`   [${v.google_rating}] ${v.name} (${v.city})`);
});

// 2. Chains & Franchises
const chains = [
  'McDonald', 'Burger King', 'Wendy', 'Taco Bell', 'KFC', 'Popeyes',
  'Chipotle', 'Subway', 'Dunkin', 'Starbucks', 'Chick-fil-A',
  'Applebee', 'Chili\'s', 'TGI Friday', 'Olive Garden', 'Red Lobster',
  'Outback', 'Buffalo Wild Wings', 'Hooters', 'IHOP', 'Denny\'s',
  'Waffle House', 'Cracker Barrel', 'Golden Corral', 'Panda Express',
  'Five Guys', 'Shake Shack', 'In-N-Out', 'Wingstop', 'Zaxby',
  'Jersey Mike', 'Jimmy John', 'Panera', 'Noodles & Company',
  'Cheesecake Factory', 'P.F. Chang', 'Benihana', 'Ruth\'s Chris',
  'Capital Grille', 'Morton\'s', 'Fogo de Chao', 'Texas Roadhouse',
  'LongHorn', 'Carrabba', 'Maggiano', 'Bonefish', 'Seasons 52',
  'Yard House', 'BJ\'s Restaurant', 'Dave & Buster', 'Main Event',
  'AMC', 'Regal Cinema', 'Cinemark', 'Bowlero', 'Lucky Strike',
  'Topgolf', 'BIBIBOP', 'sweetgreen', 'Cava', 'Nando\'s'
];

let chainCount = 0;
let chainList = [];
chains.forEach(chain => {
  const found = db.prepare(`
    SELECT id, name, city, state FROM venues 
    WHERE name LIKE ?
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).all(`%${chain}%`);
  chainCount += found.length;
  chainList = chainList.concat(found);
});

console.log(`\n🍔 Chain restaurants/venues: ${chainCount} venues`);
chainList.slice(0, 20).forEach(v => {
  console.log(`   ${v.name} (${v.city})`);
});
if (chainList.length > 20) console.log(`   ... and ${chainList.length - 20} more`);

// 3. Missing critical data
const noPhoto = db.prepare(`
  SELECT COUNT(*) as count FROM venues 
  WHERE (google_photos IS NULL OR google_photos = '' OR google_photos = '[]')
  AND (professional_photos IS NULL OR professional_photos = '' OR professional_photos = '[]')
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).get();
console.log(`\n📷 No photos at all: ${noPhoto.count} venues`);

// 4. Generic/placeholder names
const genericNames = db.prepare(`
  SELECT id, name, city FROM venues 
  WHERE (
    name LIKE '%New Restaurant%' OR 
    name LIKE '%Unnamed%' OR 
    name LIKE '%Test%' OR
    name LIKE '%restaurant%restaurant%' OR
    name = 'NJ restaurant' OR
    name = 'southern restaurant' OR
    LENGTH(name) < 4
  )
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).all();
console.log(`\n❓ Generic/placeholder names: ${genericNames.length} venues`);
genericNames.forEach(v => {
  console.log(`   "${v.name}" (${v.city})`);
});

// 5. International venues (not in our markets)
const international = db.prepare(`
  SELECT id, name, city, state FROM venues 
  WHERE city IN ('Paris', 'Barcelona', 'Dubai', 'Marrakech', 'London', 'Tokyo', 'Nassau', 'All US', 'Multiple Locations')
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).all();
console.log(`\n🌍 International/Invalid cities: ${international.length} venues`);
international.forEach(v => {
  console.log(`   ${v.name} - ${v.city}`);
});

console.log('\n' + '='.repeat(60));
console.log('SUMMARY - CANDIDATES FOR REMOVAL:');
console.log('='.repeat(60));
console.log(`  Low rated (<3.5):     ${lowRated.count}`);
console.log(`  Chain restaurants:    ${chainCount}`);
console.log(`  No photos:            ${noPhoto.count}`);
console.log(`  Generic names:        ${genericNames.length}`);
console.log(`  International:        ${international.length}`);
console.log('='.repeat(60));

db.close();
