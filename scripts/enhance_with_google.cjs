/**
 * Enhance venues with Google Places API
 * Gets address, phone, photos, ratings, hours
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const PHOTOS_DIR = path.join(__dirname, '../public/venue-photos');
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';

const db = new Database(DB_PATH);

// Ensure photos directory exists
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchGooglePlace(venueName, city, category) {
  // Special handling for food trucks
  const searchQuery = category === 'food_truck' 
    ? `${venueName} food truck ${city}`
    : `${venueName} ${city}`;

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.candidates.length > 0) {
      return data.candidates[0].place_id;
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ Search error: ${error.message}`);
    return null;
  }
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,photos,geometry';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ Details error: ${error.message}`);
    return null;
  }
}

async function downloadPhoto(photoReference, venueId, index) {
  const maxWidth = 1200;
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `venue_${venueId}_${index}.jpg`;
    const filepath = path.join(PHOTOS_DIR, filename);
    
    fs.writeFileSync(filepath, buffer);
    return `/venue-photos/${filename}`;
  } catch (error) {
    console.error(`   ⚠️ Photo error: ${error.message}`);
    return null;
  }
}

async function enhanceVenue(venue) {
  console.log(`\n[${venue.id}] ${venue.name} (${venue.city}) - ${venue.category}`);

  // Search for place
  const placeId = await searchGooglePlace(venue.name, venue.city, venue.category);
  
  if (!placeId) {
    console.log('   ❌ Not found on Google');
    return { success: false, reason: 'not_found' };
  }

  console.log(`   ✅ Found: ${placeId}`);

  // Get details
  const details = await getPlaceDetails(placeId);
  
  if (!details) {
    console.log('   ❌ Could not get details');
    return { success: false, reason: 'no_details' };
  }

  // Download photos (max 3)
  const photoUrls = [];
  if (details.photos && details.photos.length > 0) {
    console.log(`   📸 Downloading ${Math.min(3, details.photos.length)} photos...`);
    
    for (let i = 0; i < Math.min(3, details.photos.length); i++) {
      const photoUrl = await downloadPhoto(details.photos[i].photo_reference, venue.id, i + 1);
      if (photoUrl) {
        photoUrls.push(photoUrl);
      }
      await sleep(500); // Rate limit
    }
  }

  // Update database
  const updateStmt = db.prepare(`
    UPDATE venues SET
      google_place_id = ?,
      address = ?,
      latitude = ?,
      longitude = ?,
      phone = ?,
      website = ?,
      google_rating = ?,
      google_reviews_count = ?,
      price_tier = ?,
      professional_photo_url = ?,
      gallery_photos = ?,
      hours = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  const priceTier = details.price_level ? '$'.repeat(details.price_level) : venue.price_tier || '$$';
  
  updateStmt.run(
    placeId,
    details.formatted_address,
    details.geometry?.location?.lat,
    details.geometry?.location?.lng,
    details.formatted_phone_number,
    details.website,
    details.rating,
    details.user_ratings_total,
    priceTier,
    photoUrls[0] || venue.professional_photo_url,
    photoUrls.length > 1 ? JSON.stringify(photoUrls.slice(1)) : null,
    details.opening_hours ? JSON.stringify(details.opening_hours.weekday_text) : null,
    venue.id
  );

  console.log(`   💾 Updated with ${photoUrls.length} photos`);
  console.log(`   📍 ${details.formatted_address}`);
  if (details.rating) console.log(`   ⭐ ${details.rating} (${details.user_ratings_total} reviews)`);

  return { success: true, photos: photoUrls.length };
}

async function main() {
  console.log('🌍 Google Places Enhancement Script');
  console.log(`   API Key: ${GOOGLE_API_KEY.substring(0, 20)}...`);
  console.log(`   Photos Dir: ${PHOTOS_DIR}\n`);

  // Get all venues without Google Place ID
  const venues = db.prepare(`
    SELECT id, name, city, state, category, price_tier, professional_photo_url
    FROM venues 
    WHERE google_place_id IS NULL
    ORDER BY id DESC
  `).all();

  console.log(`📊 Found ${venues.length} venues to enhance\n`);

  const stats = {
    processed: 0,
    success: 0,
    not_found: 0,
    errors: 0,
    photos_downloaded: 0
  };

  for (const venue of venues) {
    stats.processed++;
    
    const result = await enhanceVenue(venue);
    
    if (result.success) {
      stats.success++;
      stats.photos_downloaded += result.photos || 0;
    } else if (result.reason === 'not_found') {
      stats.not_found++;
    } else {
      stats.errors++;
    }

    // Rate limiting: 1 request per second for Google Places
    await sleep(1000);

    // Progress update every 10 venues
    if (stats.processed % 10 === 0) {
      console.log(`\n📊 Progress: ${stats.processed}/${venues.length}`);
      console.log(`   ✅ Success: ${stats.success}`);
      console.log(`   ❌ Not Found: ${stats.not_found}`);
      console.log(`   📸 Photos: ${stats.photos_downloaded}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Success: ${stats.success}`);
  console.log(`   Not Found: ${stats.not_found}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   Photos Downloaded: ${stats.photos_downloaded}`);
  console.log(`\n✅ Enhancement complete!`);
}

main().catch(console.error);
