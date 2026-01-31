import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

const enrichedFiles = [
  { file: './dc/super_enriched_dc.json', city: 'DC' },
  { file: './philly/super_enriched_philly.json', city: 'Philadelphia' },
  { file: './baltimore/super_enriched_baltimore.json', city: 'Baltimore' },
  { file: './richmond/super_enriched_richmond.json', city: 'Richmond' },
  { file: './norfolk/super_enriched_norfolk.json', city: 'Norfolk' }
];

// Helper: Normalize name for better matching
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Validate URL format
function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper: Validate phone
function isValidPhone(phone) {
  if (!phone) return false;
  return /^[\d\s\-\(\)\+]+$/.test(phone) && phone.length >= 10;
}

let totalUpdated = 0;
let totalWithPhotos = 0;
let totalSkipped = 0;

console.log('🔄 Loading enriched venue data with transactions...\n');

for (const { file, city } of enrichedFiles) {
  console.log(`📍 Processing ${city}...`);
  
  let venues;
  try {
    venues = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
    continue;
  }
  
  let cityUpdated = 0;
  let cityPhotos = 0;
  let citySkipped = 0;
  
  // Use transaction for entire city (MASSIVE speed boost)
  const transaction = db.transaction((venuesBatch) => {
    for (const venue of venuesBatch) {
      const name = venue.venueName?.trim();
      if (!name) {
        citySkipped++;
        continue;
      }
      
      // Get first valid photo
      const photoUrl = venue.photos?.length > 0 && isValidUrl(venue.photos[0]) 
        ? venue.photos[0] 
        : null;
      
      if (photoUrl) cityPhotos++;
      
      // Validate and clean data
      const cleanPhone = venue.phone && isValidPhone(venue.phone) ? venue.phone : null;
      const cleanWebsite = venue.website && isValidUrl(venue.website) ? venue.website : null;
      
      // Only update if we have new photo data
      const photosJson = venue.photos && venue.photos.length > 0 
        ? JSON.stringify(venue.photos) 
        : null;
      
      const result = db.prepare(`
        UPDATE venues 
        SET 
          image_url = COALESCE(?, image_url),
          google_photos = COALESCE(?, google_photos),
          google_place_id = COALESCE(?, google_place_id),
          google_rating = COALESCE(?, google_rating),
          phone = COALESCE(?, phone),
          website = COALESCE(?, website)
        WHERE LOWER(REPLACE(REPLACE(name, '''', ''), ' ', '')) = ?
          AND LOWER(city) LIKE ?
      `).run(
        photoUrl,
        photosJson,
        venue.placeId,
        venue.rating,
        cleanPhone,
        cleanWebsite,
        normalizeName(name),
        `%${city.toLowerCase()}%`
      );
      
      if (result.changes > 0) {
        cityUpdated++;
      } else {
        // Try exact match as fallback
        const fallback = db.prepare(`
          UPDATE venues 
          SET 
            image_url = COALESCE(?, image_url),
            google_photos = COALESCE(?, google_photos),
            google_place_id = COALESCE(?, google_place_id),
            google_rating = COALESCE(?, google_rating),
            phone = COALESCE(?, phone),
            website = COALESCE(?, website)
          WHERE LOWER(name) = LOWER(?)
            AND LOWER(city) LIKE ?
        `).run(
          photoUrl,
          photosJson,
          venue.placeId,
          venue.rating,
          cleanPhone,
          cleanWebsite,
          name,
          `%${city.toLowerCase()}%`
        );
        
        if (fallback.changes > 0) cityUpdated++;
        else citySkipped++;
      }
    }
  });
  
  try {
    transaction(venues);
    console.log(`   ✅ Updated: ${cityUpdated}/${venues.length}`);
    console.log(`   📸 With photos: ${cityPhotos}`);
    console.log(`   ⚠️  Skipped: ${citySkipped}\n`);
    
    totalUpdated += cityUpdated;
    totalWithPhotos += cityPhotos;
    totalSkipped += citySkipped;
  } catch (error) {
    console.log(`   ❌ Transaction failed: ${error.message}\n`);
  }
}

db.close();

console.log(`\n🎉 LOAD COMPLETE!`);
console.log(`   ✅ Total updated: ${totalUpdated}`);
console.log(`   📸 Total with photos: ${totalWithPhotos}`);
console.log(`   ⚠️  Total skipped: ${totalSkipped}`);
console.log(`\n💡 Next: Restart backend to see updated photos!`);
