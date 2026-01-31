/**
 * Google Places Enhancement v3
 * - Multiple search strategies
 * - 10-15 photos per venue
 * - Menu extraction
 * - Better rate limiting
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const PHOTOS_DIR = path.join(__dirname, '../public/venue-photos');
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';

const db = new Database(DB_PATH);

if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanVenueName(name) {
  return name
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchGooglePlace(venue) {
  const cleanName = cleanVenueName(venue.name);
  const state = venue.state || 'NY';
  
  const searchStrategies = [
    `${cleanName} ${venue.city} ${state}`,
    `${cleanName} ${venue.neighborhood || ''} ${venue.city}`.trim(),
    `${cleanName} ${venue.city}`,
  ];

  // Category-specific strategies
  if (venue.category === 'food_truck') {
    searchStrategies.unshift(`${cleanName} food truck ${venue.city}`);
  } else if (venue.category === 'bar') {
    searchStrategies.push(`${cleanName} bar ${venue.city}`);
  } else if (venue.category === 'restaurant') {
    searchStrategies.push(`${cleanName} restaurant ${venue.city}`);
  }

  for (const query of searchStrategies) {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.candidates.length > 0) {
        console.log(`   ✅ Found: "${query}"`);
        return data.candidates[0].place_id;
      }
    } catch (error) {
      console.error(`   ⚠️ Search error: ${error.message}`);
    }

    await sleep(300);
  }

  return null;
}

async function getPlaceDetails(placeId) {
  // Request ALL available fields including menu
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number', 
    'website', 'rating', 'user_ratings_total', 'price_level',
    'opening_hours', 'photos', 'geometry', 'reviews',
    'editorial_summary', 'serves_beer', 'serves_wine',
    'serves_brunch', 'serves_lunch', 'serves_dinner',
    'takeout', 'delivery', 'dine_in', 'reservable',
    'wheelchair_accessible_entrance', 'outdoor_seating'
  ].join(',');

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
  const maxWidth = 1600; // Higher resolution
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
    return null;
  }
}

async function enhanceVenue(venue) {
  console.log(`\n[${venue.id}] ${venue.name} (${venue.city}, ${venue.state}) - ${venue.category}`);

  const placeId = await searchGooglePlace(venue);
  
  if (!placeId) {
    console.log('   ❌ Not found (tried all strategies)');
    return { success: false, reason: 'not_found' };
  }

  const details = await getPlaceDetails(placeId);
  
  if (!details) {
    console.log('   ❌ No details available');
    return { success: false, reason: 'no_details' };
  }

  // Download 10-15 photos
  const photoUrls = [];
  const maxPhotos = Math.min(15, details.photos?.length || 0);
  
  if (details.photos && details.photos.length > 0) {
    console.log(`   📸 Downloading ${maxPhotos} photos...`);
    
    for (let i = 0; i < maxPhotos; i++) {
      const photoUrl = await downloadPhoto(details.photos[i].photo_reference, venue.id, i + 1);
      if (photoUrl) {
        photoUrls.push(photoUrl);
        process.stdout.write(`     [${i + 1}/${maxPhotos}] ✓ `);
      }
      await sleep(400); // Rate limit for photos
    }
    console.log(`\n   💾 Saved ${photoUrls.length} photos`);
  }

  // Extract menu info from reviews (common pattern)
  let menuInfo = null;
  if (details.reviews) {
    const menuKeywords = ['menu', 'dish', 'food', 'drink', 'special', 'signature'];
    const menuReviews = details.reviews
      .filter(r => menuKeywords.some(kw => r.text.toLowerCase().includes(kw)))
      .slice(0, 3)
      .map(r => r.text.substring(0, 200));
    
    if (menuReviews.length > 0) {
      menuInfo = menuReviews.join(' | ');
      console.log('   🍽️ Menu mentions found in reviews');
    }
  }

  // Build amenities JSON
  const amenities = {
    serves_beer: details.serves_beer || false,
    serves_wine: details.serves_wine || false,
    serves_brunch: details.serves_brunch || false,
    serves_lunch: details.serves_lunch || false,
    serves_dinner: details.serves_dinner || false,
    takeout: details.takeout || false,
    delivery: details.delivery || false,
    dine_in: details.dine_in || false,
    reservable: details.reservable || false,
    wheelchair_accessible: details.wheelchair_accessible_entrance || false,
    outdoor_seating: details.outdoor_seating || false
  };

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
      description = COALESCE(description, ?),
      amenities = ?,
      menu_highlights = ?,
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
    photoUrls.length > 1 ? JSON.stringify(photoUrls) : null,
    details.opening_hours?.weekday_text ? JSON.stringify(details.opening_hours.weekday_text) : null,
    details.editorial_summary?.overview,
    JSON.stringify(amenities),
    menuInfo,
    venue.id
  );

  console.log(`   📍 ${details.formatted_address}`);
  if (details.rating) console.log(`   ⭐ ${details.rating} (${details.user_ratings_total} reviews)`);
  if (details.website) console.log(`   🌐 ${details.website}`);

  return { success: true, photos: photoUrls.length };
}

async function main() {
  console.log('🌍 Google Places Enhancement v3');
  console.log('   📸 10-15 photos per venue');
  console.log('   🍽️ Menu extraction enabled');
  console.log('   🏪 Full amenities data\n');

  // Check if columns exist, add if needed
  const columnsToAdd = [
    'ALTER TABLE venues ADD COLUMN menu_highlights TEXT',
    'ALTER TABLE venues ADD COLUMN amenities TEXT'
  ];

  for (const sql of columnsToAdd) {
    try {
      db.exec(sql);
    } catch (e) {
      // Column already exists
    }
  }

  const venues = db.prepare(`
    SELECT id, name, city, state, neighborhood, category, price_tier
    FROM venues 
    WHERE google_place_id IS NULL
    ORDER BY id DESC
    LIMIT 50
  `).all();

  console.log(`📊 Processing ${venues.length} venues\n`);

  const stats = {
    processed: 0,
    success: 0,
    not_found: 0,
    photos: 0,
    menus: 0
  };

  for (const venue of venues) {
    stats.processed++;
    
    const result = await enhanceVenue(venue);
    
    if (result.success) {
      stats.success++;
      stats.photos += result.photos || 0;
    } else {
      stats.not_found++;
    }

    // Rate limit: ~2 seconds per venue (safe for API limits)
    await sleep(2000);

    if (stats.processed % 5 === 0) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📊 Progress: ${stats.processed}/${venues.length}`);
      console.log(`   ✅ Success: ${stats.success} (${Math.round(stats.success/stats.processed*100)}%)`);
      console.log(`   ❌ Not Found: ${stats.not_found}`);
      console.log(`   📸 Total Photos: ${stats.photos}`);
      console.log(`   📊 Avg Photos/Venue: ${Math.round(stats.photos/stats.success)}`);
      console.log(`${'='.repeat(50)}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 BATCH COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Success: ${stats.success} (${Math.round(stats.success/stats.processed*100)}%)`);
  console.log(`   Not Found: ${stats.not_found}`);
  console.log(`   Total Photos: ${stats.photos}`);
  console.log(`   Avg Photos/Venue: ${stats.success > 0 ? Math.round(stats.photos/stats.success) : 0}`);
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM venues WHERE google_place_id IS NULL').get();
  console.log(`\n📌 Remaining: ${remaining.count} venues need enhancement`);
  console.log(`\n✅ Run again to process next batch!`);
}

main().catch(console.error);
