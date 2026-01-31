import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
db.pragma('journal_mode = WAL');

const enrichedFiles = [
  { file: './dc/super_enriched_dc.json', city: 'Washington' },
  { file: './philly/super_enriched_philly.json', city: 'Philadelphia' },
  { file: './baltimore/super_enriched_baltimore.json', city: 'Baltimore' },
  { file: './richmond/super_enriched_richmond.json', city: 'Richmond' },
  { file: './norfolk/super_enriched_norfolk.json', city: 'Norfolk' }
];

let totalInserted = 0;

console.log('🔄 Inserting new city venues...\n');

for (const { file, city } of enrichedFiles) {
  console.log(`📍 Processing ${city}...`);
  
  const venues = JSON.parse(fs.readFileSync(file, 'utf8'));
  let cityInserted = 0;
  let cityErrors = 0;
  
  const insertStmt = db.prepare(`
    INSERT INTO venues (
      name, city, address, neighborhood, category,
      google_rating, phone, website,
      image_url, google_photos, google_place_id,
      latitude, longitude, viberyte_certified, should_exclude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
  `);
  
  const transaction = db.transaction((venuesBatch) => {
    for (const venue of venuesBatch) {
      if (!venue.venueName) continue;
      
      const photoUrl = venue.photos?.length > 0 ? venue.photos[0] : null;
      const photosJson = venue.photos ? JSON.stringify(venue.photos) : null;
      
      // Determine category from types
      let category = 'venue';
      if (venue.types?.includes('restaurant')) category = 'dining';
      else if (venue.types?.includes('night_club') || venue.types?.includes('bar')) category = 'nightlife';
      else if (venue.types?.includes('cafe')) category = 'cafe';
      
      try {
        const result = insertStmt.run(
          venue.venueName,
          city,
          venue.address,
          venue.neighborhood,
          category,
          venue.rating,
          venue.phone,
          venue.website,
          photoUrl,
          photosJson,
          venue.placeId,
          venue.coordinates?.lat,
          venue.coordinates?.lng
        );
        
        if (result.changes > 0) cityInserted++;
      } catch (err) {
        cityErrors++;
        if (cityErrors <= 3) {
          console.log(`   ⚠️  Error: ${err.message}`);
        }
      }
    }
  });
  
  transaction(venues);
  
  console.log(`   ✅ Inserted: ${cityInserted}/${venues.length}`);
  if (cityErrors > 0) console.log(`   ❌ Errors: ${cityErrors}`);
  console.log('');
  
  totalInserted += cityInserted;
}

db.close();

console.log(`🎉 INSERTION COMPLETE!`);
console.log(`   Total new venues: ${totalInserted}`);
console.log(`   New database size: ${1949 + totalInserted} venues\n`);
