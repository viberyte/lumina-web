import fs from 'fs';

// Load existing 5 cities
const fiveCities = JSON.parse(fs.readFileSync('all_nightlife_websites.json', 'utf8'));

// Load NYC/NJ
const nycNj = JSON.parse(fs.readFileSync('../../nyc_nj_nightlife_websites.json', 'utf8'));

// Combine
const allVenues = [...nycNj, ...fiveCities];

// Save combined
fs.writeFileSync('all_nightlife_websites_complete.json', JSON.stringify(allVenues, null, 2));

console.log(`✅ COMBINED TOTAL: ${allVenues.length} nightlife venues with websites`);
console.log(`   NYC/NJ: ${nycNj.length}`);
console.log(`   DC: ${fiveCities.filter(v => v.city === 'DC').length}`);
console.log(`   Philly: ${fiveCities.filter(v => v.city === 'Philly').length}`);
console.log(`   Baltimore: ${fiveCities.filter(v => v.city === 'Baltimore').length}`);
console.log(`   Richmond: ${fiveCities.filter(v => v.city === 'Richmond').length}`);
console.log(`   Norfolk: ${fiveCities.filter(v => v.city === 'Norfolk').length}`);
