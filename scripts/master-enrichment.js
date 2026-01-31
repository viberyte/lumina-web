import Database from 'better-sqlite3';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k',
  OPENAI_API_KEY: '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',
  OPENAI_MODEL: 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2',
  ENHANCEMENT_VERSION: 'v3.0-complete',
  PHOTOS_PER_VENUE: 10,
  BATCH_SIZE: 10,
  PHOTO_DIR: '/opt/viberyte/lumina-web/public/venue-photos'
};

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });

if (!fs.existsSync(CONFIG.PHOTO_DIR)) {
  fs.mkdirSync(CONFIG.PHOTO_DIR, { recursive: true });
}

function getVenuesToEnhance() {
  console.log('🔍 Finding venues to enhance...\n');
  
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE should_exclude = 0
    AND (
      last_enhanced IS NULL 
      OR enhancement_version != ?
      OR google_photos IS NULL
      OR primary_vibes IS NULL
    )
    ORDER BY 
      CASE WHEN city = 'New York' THEN 0 ELSE 1 END,
      google_rating DESC NULLS LAST
    
  `).all(CONFIG.ENHANCEMENT_VERSION);
  
  console.log(`✅ Found ${venues.length} venues needing enhancement\n`);
  return venues;
}

async function downloadPhotos(photos, venueId) {
  if (!photos || photos.length === 0) return [];
  
  const downloadedPhotos = [];
  const photosToDownload = photos.slice(0, CONFIG.PHOTOS_PER_VENUE);
  
  console.log(`   📸 Downloading ${photosToDownload.length} photos...`);
  
  for (let i = 0; i < photosToDownload.length; i++) {
    try {
      const photo = photosToDownload[i];
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${CONFIG.GOOGLE_API_KEY}`;
      
      const response = await axios.get(photoUrl, { responseType: 'arraybuffer', timeout: 10000 });
      const filename = `venue-${venueId}-${i + 1}.jpg`;
      const filepath = path.join(CONFIG.PHOTO_DIR, filename);
      
      fs.writeFileSync(filepath, response.data);
      downloadedPhotos.push(`/venue-photos/${filename}`);
      
    } catch (error) {
      console.error(`   ❌ Photo ${i + 1} failed`);
    }
  }
  
  console.log(`   ✅ Downloaded ${downloadedPhotos.length} photos`);
  return downloadedPhotos;
}

async function enrichWithGooglePlaces(venue) {
  try {
    console.log(`\n📍 ${venue.name} (${venue.city})`);
    
    let placeId = venue.google_place_id;
    
    if (!placeId) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(venue.name + ' ' + venue.address)}&inputtype=textquery&fields=place_id&key=${CONFIG.GOOGLE_API_KEY}`;
      const searchResult = await axios.get(searchUrl);
      
      if (searchResult.data.candidates && searchResult.data.candidates.length > 0) {
        placeId = searchResult.data.candidates[0].place_id;
      } else {
        console.log(`   ❌ Not found on Google`);
        return null;
      }
    }
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,price_level,formatted_phone_number,website,opening_hours,types,reviews,photos,business_status&key=${CONFIG.GOOGLE_API_KEY}`;
    
    const response = await axios.get(detailsUrl);
    const place = response.data.result;
    
    if (!place) {
      console.log(`   ❌ No details`);
      return null;
    }
    
    // Check if closed
    if (place.business_status === 'CLOSED_PERMANENTLY' || place.business_status === 'CLOSED_TEMPORARILY') {
      console.log(`   🚫 CLOSED`);
      db.prepare('UPDATE venues SET should_exclude = 1, exclusion_reason = ? WHERE id = ?')
        .run(place.business_status, venue.id);
      return { deleted: true };
    }
    
    console.log(`   ⭐ ${place.rating} (${place.user_ratings_total} reviews)`);
    
    const deletionReason = shouldDeleteVenue(place, venue);
    if (deletionReason) {
      console.log(`   🗑️  ${deletionReason}`);
      db.prepare('UPDATE venues SET should_exclude = 1, exclusion_reason = ? WHERE id = ?')
        .run(deletionReason, venue.id);
      return { deleted: true };
    }
    
    // Download photos
    const photos = await downloadPhotos(place.photos, venue.id);
    
    // Save top 5 reviews
    const topReviews = place.reviews ? place.reviews.slice(0, 5).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text
    })) : [];
    
    return {
      google_place_id: placeId,
      google_rating: place.rating,
      google_review_count: place.user_ratings_total,
      google_price_level: place.price_level,
      phone: place.formatted_phone_number || venue.phone,
      website: place.website || venue.website,
      place_types: JSON.stringify(place.types || []),
      google_photos: JSON.stringify(photos),
      top_reviews: JSON.stringify(topReviews),
      reviews: place.reviews || []
    };
    
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
    return null;
  }
}

function shouldDeleteVenue(googlePlace, dbVenue) {
  const rating = googlePlace.rating || 0;
  const reviewCount = googlePlace.user_ratings_total || 0;
  const name = dbVenue.name.toLowerCase();
  const types = googlePlace.types || [];
  
  // ═══════════════════════════════════════════════════════════
  // 🚫 EXCLUDE NON-NIGHTLIFE VENUES
  // ═══════════════════════════════════════════════════════════
  
  const excludedTypes = [
    'gym', 'school', 'doctor', 'hospital', 'dentist', 'pharmacy',
    'spa', 'beauty_salon', 'hair_care', 'laundry', 'car_wash',
    'gas_station', 'atm', 'bank', 'real_estate_agency', 'lawyer',
    'insurance_agency', 'travel_agency', 'post_office', 'library',
    'university', 'parking', 'car_rental', 'pet_store', 'hardware_store',
    'furniture_store', 'electronics_store', 'clothing_store', 'supermarket',
    'convenience_store', 'drugstore', 'movie_theater', 'bowling_alley',
    'casino', 'museum', 'church', 'mosque', 'synagogue', 'storage',
    'locksmith', 'electrician', 'plumber', 'painter', 'accounting'
  ];
  
  if (types.some(type => excludedTypes.includes(type))) {
    return `Excluded type: ${types.filter(t => excludedTypes.includes(t))[0]}`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🎓 DANCE STUDIOS & FITNESS CENTERS
  // ═══════════════════════════════════════════════════════════
  
  const excludedKeywords = [
    'dance studio', 'dance school', 'ballet', 'ballroom dance', 'salsa class',
    'yoga studio', 'pilates', 'fitness center', 'crossfit', 'martial arts',
    'karate', 'taekwondo', 'gym', 'personal training'
  ];
  
  if (excludedKeywords.some(keyword => name.includes(keyword))) {
    return 'Dance studio/fitness';
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🍔 CASUAL FAST FOOD / DELIS / SANDWICHES / BODEGAS
  // ═══════════════════════════════════════════════════════════
  
  const casualFood = [
    // Fast food chains
    'mcdonalds', 'burger king', 'wendys', 'kfc', 'popeyes', 'chick-fil-a',
    'taco bell', 'chipotle', 'qdoba', 'subway', 'jimmy johns', 'firehouse subs',
    'arbys', 'sonic', 'hardees', 'carls jr', 'white castle', 'five guys',
    'shake shack', 'in-n-out', 'whataburger', 'culvers', 'portillos',
    
    // Fast casual
    'panera', 'panera bread', 'sweetgreen', 'cava', 'dig inn', 'chopt',
    'just salad', 'pret a manger', 'au bon pain',
    
    // Coffee shops (unless cocktail bar)
    'starbucks', 'dunkin', 'dunkin donuts', 'tim hortons', 'costa coffee',
    
    // Pizza chains
    'pizza hut', 'dominos', 'papa johns', 'little caesars', 'blaze pizza',
    'mod pizza', 'pieology',
    
    // Delis & Sandwiches
    'deli', 'bodega', 'corner store', 'sandwich shop', 'bagel shop',
    'bagel store', 'sub shop', 'hoagie', 'hero shop',
    
    // Halal/food carts
    'halal cart', 'halal guys', 'food cart', 'food truck',
    
    // Bakeries (unless upscale)
    'bakery', 'donut shop', 'dunkin'
  ];
  
  if (casualFood.some(chain => name.includes(chain))) {
    return 'Casual fast food/deli/sandwich';
  }
  
  // Check types for casual food indicators
  if (types.includes('meal_takeaway') && !types.includes('restaurant')) {
    return 'Takeaway only';
  }
  
  if (types.includes('convenience_store')) {
    return 'Convenience store';
  }
  
  // ═══════════════════════════════════════════════════════════
  // ⭐ QUALITY FILTER (3.2+ threshold with review consideration)
  // ═══════════════════════════════════════════════════════════
  
  // Delete if: Below 3.2 AND low engagement
  if (rating < 3.2 && reviewCount < 500) {
    return `Low quality: ${rating}⭐ (${reviewCount} reviews)`;
  }
  
  // Keep if: High engagement (even if polarizing)
  if (reviewCount > 1000) {
    console.log(`   ✅ High engagement: keeping despite ${rating}⭐`);
    return null;
  }
  
  // Keep if: Good rating (3.2+)
  if (rating >= 3.2) {
    return null;
  }
  
  return null;
}

async function classifyWithOpenAI(venue, googleData) {
  try {
    const reviewText = googleData.reviews ? googleData.reviews.slice(0, 3).map(r => r.text).join('\n\n') : '';
    
    const prompt = `Analyze this nightlife venue for Lumina - a premium nightlife concierge.

VENUE DETAILS:
Name: ${venue.name}
City: ${venue.city}
Rating: ${googleData.google_rating} ⭐ (${googleData.google_review_count} reviews)
Types: ${googleData.place_types}

TOP REVIEWS:
${reviewText.substring(0, 1500)}

Return ONLY valid JSON with these fields:
{
  "cuisine_primary": "Italian|French|Japanese|Caribbean|African|Latin|American|Asian Fusion|Mediterranean|etc",
  "primary_vibes": ["upscale", "trendy", "casual", "romantic", "lively"],
  "secondary_vibes": ["date-friendly", "instagram-worthy", "hidden-gem", "locals-only", "celebrity-spot", "mixy"],
  "music_genres_normalized": ["afrobeats", "hip-hop", "r&b", "house", "latin", "reggaeton", "amapiano", "jazz", "live-music"],
  "energy_level": "calm|moderate|lively|high",
  "lounge_type": "upscale-lounge|casual-lounge|hookah-lounge|rooftop-lounge|sports-lounge|null",
  "first_date_suitable": true|false,
  "anniversary_suitable": true|false,
  "girls_night_suitable": true|false,
  "guys_night_suitable": true|false,
  "pregame_spot": true|false,
  "late_night_spot": true|false,
  "why_recommended": "One-sentence reason explaining why someone should visit (focus on unique aspects from reviews)"
}

CRITICAL: 
- Extract music genres ONLY if mentioned in reviews
- Use "why_recommended" to capture the venue's unique selling point
- Be specific and authentic based on actual review content`;

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 700
    });
    
    const content = response.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
    
  } catch (error) {
    console.error(`   ❌ AI error: ${error.message}`);
    return null;
  }
}

function updateVenue(venueId, googleData, aiData) {
  const transaction = db.transaction(() => {
    try {
      const stmt = db.prepare(`
        UPDATE venues SET
          google_place_id = ?,
          google_rating = ?,
          
          phone = ?,
          website = ?,
          place_types = ?,
          google_photos = ?,
          top_reviews = ?,
          cuisine_primary = ?,
          primary_vibes = ?,
          secondary_vibes = ?,
          energy_level = ?,
          music_genres_normalized = ?,
          lounge_type = ?,
          first_date_suitable = ?,
          anniversary_suitable = ?,
          girls_night_suitable = ?,
          guys_night_suitable = ?,
          pregame_spot = ?,
          late_night_spot = ?,
          why_recommended = ?,
          last_enhanced = datetime('now'),
          enhancement_version = ?
        WHERE id = ?
      `);
      
      stmt.run(
        googleData.google_place_id,
        googleData.google_rating,
        
        googleData.phone,
        googleData.website,
        googleData.place_types,
        googleData.google_photos,
        googleData.top_reviews,
        aiData?.cuisine_primary || null,
        JSON.stringify(aiData?.primary_vibes || []),
        JSON.stringify(aiData?.secondary_vibes || []),
        aiData?.energy_level || 'moderate',
        JSON.stringify(aiData?.music_genres_normalized || []),
        aiData?.lounge_type,
        aiData?.first_date_suitable ? 1 : 0,
        aiData?.anniversary_suitable ? 1 : 0,
        aiData?.girls_night_suitable ? 1 : 0,
        aiData?.guys_night_suitable ? 1 : 0,
        aiData?.pregame_spot ? 1 : 0,
        aiData?.late_night_spot ? 1 : 0,
        aiData?.why_recommended || null,
        CONFIG.ENHANCEMENT_VERSION,
        venueId
      );
      
      console.log(`   ✅ ${aiData?.cuisine_primary || 'N/A'} | ${aiData?.energy_level || 'N/A'} | ${aiData?.lounge_type || 'No lounge'}`);
      if (aiData?.why_recommended) {
        console.log(`   💡 "${aiData.why_recommended}"`);
      }
      
    } catch (error) {
      console.error(`   ❌ DB error: ${error.message}`);
      throw error;
    }
  });
  
  transaction();
}

async function main() {
  console.log('\n🚀 LUMINA MASTER ENRICHMENT v3.0 - COMPLETE\n');
  console.log('Features:');
  console.log('  ✅ Closed venue detection');
  console.log('  ✅ Remove casual food/delis/sandwiches');
  console.log('  ✅ High-res photo harvesting');
  console.log('  ✅ Save review text for insights');
  console.log('  ✅ Full AI classification with reasoning');
  console.log('  ✅ 3.2+ rating threshold (w/ review consideration)');
  console.log('  ✅ Robust SQLite transactions\n');
  
  const venues = getVenuesToEnhance();
  
  if (venues.length === 0) {
    console.log('✅ All venues enhanced!');
    db.close();
    return;
  }
  
  let processed = 0;
  let enhanced = 0;
  let deleted = 0;
  let failed = 0;
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    processed++;
    
    console.log(`\n[${processed}/${venues.length}] ${venue.name}`);
    
    try {
      const googleData = await enrichWithGooglePlaces(venue);
      
      if (!googleData) {
        failed++;
        continue;
      }
      
      if (googleData.deleted) {
        deleted++;
        continue;
      }
      
      const aiData = await classifyWithOpenAI(venue, googleData);
      updateVenue(venue.id, googleData, aiData);
      
      enhanced++;
      
      // Rate limit (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ ${error.message}`);
      failed++;
    }
  }
  
  db.close();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ ENRICHMENT COMPLETE');
  console.log(`   Processed: ${processed}`);
  console.log(`   Enhanced: ${enhanced}`);
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
