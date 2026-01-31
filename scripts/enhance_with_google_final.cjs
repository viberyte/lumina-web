/**
 * Google Places Enhancement - WORKING VERSION
 * - 10-15 photos per venue
 * - Menu extraction
 * - Full amenities
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const PHOTOS_DIR = path.join(__dirname, '../public/venue-photos');
const GOOGLE_API_KEY = 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k';

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
    .replace(/\bNyc\b/gi, 'New York')
    .trim();
}

async function searchGooglePlace(venue) {
  const cleanName = cleanVenueName(venue.name);
  const state = venue.state || 'NY';
  
  // Build search strategies
  const strategies = [];
  
  if (venue.category === 'food_truck') {
    strategies.push(`${cleanName} food truck ${venue.city} ${state}`);
    strategies.push(`${cleanName} food truck ${venue.city}`);
  } else {
    strategies.push(`${cleanName} ${venue.city} ${state}`);
    if (venue.neighborhood) {
      strategies.push(`${cleanName} ${venue.neighborhood} ${venue.city}`);
    }
    strategies.push(`${cleanName} ${venue.city}`);
    
    // Add category hints for better matching
    if (venue.category === 'bar') strategies.push(`${cleanName} bar ${venue.city}`);
    if (venue.category === 'restaurant') strategies.push(`${cleanName} restaurant ${venue.city}`);
    if (venue.category === 'lounge') strategies.push(`${cleanName} lounge ${venue.city}`);
    if (venue.category === 'nightclub') strategies.push(`${cleanName} nightclub ${venue.city}`);
  }

  for (const query of strategies) {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.candidates.length > 0) {
        console.log(`   ✅ Found: "${query}"`);
        return data.candidates[0].place_id;
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error.message}`);
    }

    await sleep(200);
  }

  return null;
}

async function getPlaceDetails(placeId) {
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number', 
    'website', 'rating', 'user_ratings_total', 'price_level',
    'opening_hours', 'photos', 'geometry', 'reviews',
    'editorial_summary', 'serves_beer', 'serves_wine',
    'serves_brunch', 'serves_lunch', 'serves_dinner',
    'current_opening_hours'
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
  const maxWidth = 1600;
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

function detectLateNightHours(hours) {
  if (!hours || !hours.periods) return false;
  
  // Check if any day is open past 2 AM
  for (const period of hours.periods) {
    if (period.close) {
      const closeHour = parseInt(period.close.time.substring(0, 2));
      // Open past 2 AM (0200) or closes between midnight-2am
      if (closeHour >= 2 && closeHour < 6) {
        return true;
      }
    }
  }
  return false;
}

async function enhanceVenue(venue) {
  console.log(`\n[${venue.id}] ${venue.name} (${venue.city}, ${venue.state}) - ${venue.category}`);

  const placeId = await searchGooglePlace(venue);
  
  if (!placeId) {
    console.log('   ❌ Not found');
    return { success: false };
  }

  const details = await getPlaceDetails(placeId);
  
  if (!details) {
    console.log('   ❌ No details');
    return { success: false };
  }

  // Download photos
  const photoUrls = [];
  const maxPhotos = Math.min(15, details.photos?.length || 0);
  
  if (details.photos && details.photos.length > 0) {
    console.log(`   📸 Downloading ${maxPhotos} photos...`);
    
    for (let i = 0; i < maxPhotos; i++) {
      const photoUrl = await downloadPhoto(details.photos[i].photo_reference, venue.id, i + 1);
      if (photoUrl) photoUrls.push(photoUrl);
      await sleep(300);
    }
    console.log(`   💾 ${photoUrls.length} photos saved`);
  }

  // Detect late night hours
  const isLateNight = detectLateNightHours(details.current_opening_hours);
  if (isLateNight) {
    console.log('   🌙 LATE NIGHT SPOT (open past 2 AM)');
  }

  // Extract menu mentions
  let menuInfo = null;
  if (details.reviews) {
    const menuKeywords = ['menu', 'dish', 'food', 'drink', 'special'];
    const menuReviews = details.reviews
      .filter(r => menuKeywords.some(kw => r.text.toLowerCase().includes(kw)))
      .slice(0, 3)
      .map(r => r.text.substring(0, 200));
    
    if (menuReviews.length > 0) {
      menuInfo = menuReviews.join(' | ');
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
      description = COALESCE(description, ?),
      menu_highlights = ?,
      late_night_spot = ?,
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
    menuInfo,
    isLateNight ? 1 : 0,
    venue.id
  );

  console.log(`   📍 ${details.formatted_address}`);
  if (details.rating) console.log(`   ⭐ ${details.rating} (${details.user_ratings_total} reviews)`);

  return { success: true, photos: photoUrls.length, lateNight: isLateNight };
}

async function main() {
  console.log('🌍 Google Places Enhancement - FINAL');
  console.log(`   🔑 API Key: ${GOOGLE_API_KEY.substring(0, 20)}...`);
  console.log('   📸 10-15 photos per venue');
  console.log('   🌙 Late night detection enabled\n');

  // Add columns if needed
  try {
    db.exec('ALTER TABLE venues ADD COLUMN menu_highlights TEXT');
  } catch (e) {}
  
  try {
    db.exec('ALTER TABLE venues ADD COLUMN late_night_spot INTEGER DEFAULT 0');
  } catch (e) {}

  const venues = db.prepare(`
    SELECT id, name, city, state, neighborhood, category, price_tier
    FROM venues 
    WHERE google_place_id IS NULL
    ORDER BY id DESC
    LIMIT 100
  `).all();

  console.log(`📊 Processing ${venues.length} venues\n`);

  const stats = {
    processed: 0,
    success: 0,
    not_found: 0,
    photos: 0,
    lateNight: 0
  };

  for (const venue of venues) {
    stats.processed++;
    
    const result = await enhanceVenue(venue);
    
    if (result.success) {
      stats.success++;
      stats.photos += result.photos || 0;
      if (result.lateNight) stats.lateNight++;
    } else {
      stats.not_found++;
    }

    await sleep(1500);

    if (stats.processed % 10 === 0) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📊 Progress: ${stats.processed}/${venues.length}`);
      console.log(`   ✅ Success: ${stats.success} (${Math.round(stats.success/stats.processed*100)}%)`);
      console.log(`   ❌ Not Found: ${stats.not_found}`);
      console.log(`   📸 Photos: ${stats.photos}`);
      console.log(`   🌙 Late Night: ${stats.lateNight}`);
      console.log(`${'='.repeat(50)}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 BATCH COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Success: ${stats.success}`);
  console.log(`   Photos: ${stats.photos}`);
  console.log(`   Late Night Spots: ${stats.lateNight}`);
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM venues WHERE google_place_id IS NULL').get();
  console.log(`\n📌 Remaining: ${remaining.count} venues\n`);
}

main().catch(console.error);
