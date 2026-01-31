const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('='.repeat(60));
console.log('PURGING LOW QUALITY VENUES');
console.log('='.repeat(60));

let totalDeleted = 0;

// 1. Non-nightlife keywords
const badKeywords = [
  'Urgent Care', 'MEDRITE', 'Medical', 'Hospital', 'Clinic', 'Dental', 'Dentist',
  'Vape', 'Smoke Shop', 'Dispensary',
  'Dance Studio', 'Arthur Murray', 'Fred Astaire', 'Ballet',
  'Gym', 'Fitness', 'CrossFit', 'Planet Fitness', 'Yoga Studio',
  'Salon', 'Barbershop', 'Nail', 'Spa', 'Massage',
  'School', 'Academy', 'University', 'College', 'Learning Center',
  'Church', 'Mosque', 'Temple', 'Synagogue',
  'Bank', 'Credit Union', 'Insurance',
  'Laundromat', 'Dry Clean', 'Car Wash', 'Auto Repair',
  'Storage', 'U-Haul', 'Moving',
  'Skateboard', 'Skate Park',
  'Pet', 'Veterinary', 'Vet Clinic', 'Grooming',
  'Pharmacy', 'CVS', 'Walgreens', 'Rite Aid',
  'Hardware', 'Home Depot', 'Lowes',
  'Grocery', 'Supermarket', 'Food Lion', 'Whole Foods', 'Trader Joe'
];

let nonNightlife = 0;
badKeywords.forEach(keyword => {
  const result = db.prepare(`
    UPDATE venues SET should_exclude = 1, exclusion_reason = 'Non-nightlife venue'
    WHERE (name LIKE ? OR category LIKE ?)
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).run(`%${keyword}%`, `%${keyword}%`);
  nonNightlife += result.changes;
});
console.log(`\n🏥 Non-nightlife venues excluded: ${nonNightlife}`);
totalDeleted += nonNightlife;

// 2. Low ratings (below 3.5)
const lowRated = db.prepare(`
  UPDATE venues SET should_exclude = 1, exclusion_reason = 'Low rating'
  WHERE google_rating < 3.5 AND google_rating > 0
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).run();
console.log(`⭐ Low rated (<3.5) excluded: ${lowRated.changes}`);
totalDeleted += lowRated.changes;

// 3. Chain restaurants
const chains = [
  'McDonald', 'Burger King', 'Wendy', 'Taco Bell', 'KFC', 'Popeyes',
  'Chipotle', 'Subway', 'Dunkin', 'Starbucks', 'Chick-fil-A',
  'Applebee', 'Chili\'s', 'TGI Friday', 'Olive Garden', 'Red Lobster',
  'Outback', 'Buffalo Wild Wings', 'Hooters', 'IHOP', 'Denny\'s',
  'Waffle House', 'Cracker Barrel', 'Golden Corral', 'Panda Express',
  'Five Guys', 'Shake Shack', 'Wingstop', 'Zaxby',
  'Jersey Mike', 'Jimmy John', 'Panera', 'Noodles & Company',
  'Cheesecake Factory', 'P.F. Chang', 'Benihana', 'Ruth\'s Chris',
  'Capital Grille', 'Morton\'s', 'Fogo de Chao', 'Texas Roadhouse',
  'LongHorn', 'Carrabba', 'Maggiano', 'Bonefish', 'Seasons 52',
  'Yard House', 'BJ\'s Restaurant', 'Dave & Buster', 'Main Event',
  'BIBIBOP', 'Nando\'s'
];

let chainCount = 0;
chains.forEach(chain => {
  const result = db.prepare(`
    UPDATE venues SET should_exclude = 1, exclusion_reason = 'Chain restaurant'
    WHERE name LIKE ?
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).run(`%${chain}%`);
  chainCount += result.changes;
});
console.log(`🍔 Chain restaurants excluded: ${chainCount}`);
totalDeleted += chainCount;

// 4. International/invalid cities
const intl = db.prepare(`
  UPDATE venues SET should_exclude = 1, exclusion_reason = 'International/invalid location'
  WHERE city IN ('Paris', 'Barcelona', 'Dubai', 'Marrakech', 'London', 'Tokyo', 'Nassau', 'All US', 'Multiple Locations')
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).run();
console.log(`🌍 International venues excluded: ${intl.changes}`);
totalDeleted += intl.changes;

// 5. Truly generic names (excluding legit short names)
const legitShortNames = ['KYU', 'BG', 'Ora', 'Oso', 'Bul', 'RIS', 'Ama', 'Rye', 'BAR', 'BRD', 'Dai', 'Wim', 'R&D', 'ERA', 'ala'];
const generic = db.prepare(`
  UPDATE venues SET should_exclude = 1, exclusion_reason = 'Generic/placeholder name'
  WHERE (
    name LIKE '%New Restaurant%' OR 
    name LIKE '%Unnamed%' OR 
    name = 'NJ restaurant' OR
    name = 'southern restaurant'
  )
  AND (should_exclude = 0 OR should_exclude IS NULL)
`).run();
console.log(`❓ Generic names excluded: ${generic.changes}`);
totalDeleted += generic.changes;

// Final count
const remaining = db.prepare(`
  SELECT COUNT(*) as count FROM venues 
  WHERE should_exclude = 0 OR should_exclude IS NULL
`).get();

const excluded = db.prepare(`
  SELECT COUNT(*) as count FROM venues 
  WHERE should_exclude = 1
`).get();

console.log('\n' + '='.repeat(60));
console.log('PURGE COMPLETE');
console.log('='.repeat(60));
console.log(`Total excluded this run: ${totalDeleted}`);
console.log(`Total excluded overall:  ${excluded.count}`);
console.log(`Active venues remaining: ${remaining.count}`);
console.log('='.repeat(60));

db.close();
