/**
 * Google Places Enhancement with Review Intelligence
 * - Extracts "best things to try" from reviews
 * - Menu highlights and signature items
 * - Common recommendations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const PHOTOS_DIR = path.join(__dirname, '../public/venue-photos');
const GOOGLE_API_KEY = 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k';
const OPENAI_API_KEY = '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';

const db = new Database(DB_PATH);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

async function extractMenuHighlights(venueName, reviews) {
  if (!reviews || reviews.length === 0) return null;

  // Combine top reviews
  const reviewTexts = reviews
    .filter(r => r.rating >= 4) // Only good reviews
    .slice(0, 10) // Top 10 reviews
    .map(r => r.text)
    .join('\n\n');

  const prompt = `Analyze these Google reviews for "${venueName}" and extract:

1. Best things to try (drinks, food items, signature dishes)
2. What people recommend most
3. Any must-try items mentioned multiple times

Reviews:
${reviewTexts}

Return ONLY a JSON object (no markdown, no explanation):
{
  "must_try": ["item1", "item2", "item3"],
  "popular_drinks": ["drink1", "drink2"],
  "signature_dishes": ["dish1", "dish2"],
  "vibe_notes": "brief description of atmosphere from reviews"
}

If nothing specific mentioned, return empty arrays.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ AI extraction error: ${error.message}`);
    return null;
  }
}

async function searchGooglePlace(venue) {
  const cleanName = cleanVenueName(venue.name);
  const state = venue.state || 'NY';
  
  const strategies = [];
  
  if (venue.category === 'food_truck') {
    strategies.push(`${cleanName} food truck ${venue.city} ${state}`);
  } else {
    strategies.push(`${cleanName} ${venue.city} ${state}`);
    if (venue.neighborhood) {
      strategies.push(`${cleanName} ${venue.neighborhood} ${venue.city}`);
    }
    strategies.push(`${cleanName} ${venue.city}`);
  }

  for (const query of strategies) {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.candidates.length > 0) {
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
  
  for (const period of hours.periods) {
    if (period.close) {
      const closeHour = parseInt(period.close.time.substring(0, 2));
      if (closeHour >= 2 && closeHour < 6) {
        return true;
      }
    }
  }
  return false;
}

async function enhanceVenue(venue) {
  console.log(`\n[${venue.id}] ${venue.name} (${venue.city}) - ${venue.category}`);

  const placeId = await searchGooglePlace(venue);
  
  if (!placeId) {
    console.log('   ❌ Not found');
    return { success: false };
  }

  console.log(`   ✅ Found on Google`);

  const details = await getPlaceDetails(placeId);
  
  if (!details) {
    console.log('   ❌ No details');
    return { success: false };
  }

  // Extract menu highlights with AI
  let menuData = null;
  if (details.reviews && details.reviews.length > 0) {
    console.log(`   🤖 Analyzing ${details.reviews.length} reviews with AI...`);
    menuData = await extractMenuHighlights(venue.name, details.reviews);
    
    if (menuData) {
      console.log(`   ✨ Must Try: ${menuData.must_try?.join(', ') || 'none'}`);
      if (menuData.signature_dishes?.length > 0) {
        console.log(`   🍽️ Signature: ${menuData.signature_dishes.join(', ')}`);
      }
    }
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

  const isLateNight = detectLateNightHours(details.current_opening_hours);
  if (isLateNight) console.log('   🌙 Late night spot');

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
    menuData ? JSON.stringify(menuData) : null,
    isLateNight ? 1 : 0,
    venue.id
  );

  console.log(`   📍 ${details.formatted_address}`);
  if (details.rating) console.log(`   ⭐ ${details.rating} (${details.user_ratings_total} reviews)`);

  return { success: true, photos: photoUrls.length, hasMenu: !!menuData };
}

async function main() {
  console.log('🌍 Google Places + AI Review Analysis');
  console.log('   🤖 Extracting menu highlights from reviews');
  console.log('   📸 Downloading 10-15 photos');
  console.log('   🌙 Late night detection\n');

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
    withMenuData: 0
  };

  for (const venue of venues) {
    stats.processed++;
    
    const result = await enhanceVenue(venue);
    
    if (result.success) {
      stats.success++;
      stats.photos += result.photos || 0;
      if (result.hasMenu) stats.withMenuData++;
    } else {
      stats.not_found++;
    }

    await sleep(2000); // Rate limit

    if (stats.processed % 5 === 0) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📊 Progress: ${stats.processed}/${venues.length}`);
      console.log(`   ✅ Success: ${stats.success}`);
      console.log(`   📸 Photos: ${stats.photos}`);
      console.log(`   🍽️ Menu Data: ${stats.withMenuData}`);
      console.log(`${'='.repeat(50)}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Success: ${stats.success}`);
  console.log(`   Photos: ${stats.photos}`);
  console.log(`   With Menu Intelligence: ${stats.withMenuData}`);
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM venues WHERE google_place_id IS NULL').get();
  console.log(`\n📌 Remaining: ${remaining.count} venues\n`);
}

main().catch(console.error);
