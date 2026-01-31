import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const phillyData = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/scripts/pipeline/philly/super_enriched_philly.json', 'utf-8'));

console.log(`\n📥 IMPORTING ${phillyData.length} PHILLY VENUES\n`);
console.log('='.repeat(60));

let imported = 0;

for (const venue of phillyData) {
  try {
    db.prepare(`
      INSERT INTO venues (
        name, city, state, website, google_place_id, 
        google_rating, google_photos, phone,
        energy_level, instagram_handle, 
        latitude, longitude, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      venue.venueName,
      'Philadelphia',
      'PA',
      venue.website,
      venue.placeId,
      venue.rating,
      JSON.stringify(venue.photos || []),
      venue.phone,
      venue.energy_level,
      null, // Instagram handle to be added later
      venue.coordinates?.lat,
      venue.coordinates?.lng,
      venue.category || 'nightlife'
    );
    
    imported++;
    if (imported % 50 === 0) console.log(`   ✓ Imported ${imported}...`);
  } catch (error) {
    // Skip duplicates
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ PHILLY IMPORT COMPLETE!`);
console.log(`   Venues imported: ${imported}`);
console.log('='.repeat(60) + '\n');

db.close();
