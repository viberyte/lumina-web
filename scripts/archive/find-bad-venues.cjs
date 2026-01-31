const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

// Keywords that indicate non-nightlife venues
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

console.log('='.repeat(60));
console.log('SCANNING FOR NON-NIGHTLIFE VENUES');
console.log('='.repeat(60));

let allBadVenues = [];

badKeywords.forEach(keyword => {
  const venues = db.prepare(`
    SELECT id, name, city, state, category 
    FROM venues 
    WHERE (name LIKE ? OR category LIKE ?)
    AND (should_exclude = 0 OR should_exclude IS NULL)
  `).all(`%${keyword}%`, `%${keyword}%`);
  
  if (venues.length > 0) {
    console.log(`\n🚨 "${keyword}" (${venues.length} found):`);
    venues.forEach(v => {
      console.log(`   [${v.id}] ${v.name} (${v.city}, ${v.state})`);
      allBadVenues.push(v);
    });
  }
});

console.log('\n' + '='.repeat(60));
console.log(`TOTAL BAD VENUES FOUND: ${allBadVenues.length}`);
console.log('='.repeat(60));

db.close();
