import Database from 'better-sqlite3';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyAjKkcKVNdChkwUYgQq3_IFbnUtyVMAeFI',
  OPENAI_API_KEY: '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',
  OPENAI_MODEL: 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2',
  ENHANCEMENT_VERSION: 'v3.0-master',
  PHOTOS_PER_VENUE: 12,
  BATCH_SIZE: 10,
  PHOTO_DIR: '/opt/viberyte/lumina-web/public/venue-photos',
  LOG_FILE: '/opt/viberyte/lumina-web/scripts/enrichment.log'
};

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });

if (!fs.existsSync(CONFIG.PHOTO_DIR)) {
  fs.mkdirSync(CONFIG.PHOTO_DIR, { recursive: true });
}

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(CONFIG.LOG_FILE, line + '\n');
}

function getVenuesToEnhance() {
  log('🔍 Finding venues to enhance...');
  
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE (should_exclude = 0 OR should_exclude IS NULL)
    AND (
      last_enhanced IS NULL 
      OR enhancement_version != ?
      OR google_photos IS NULL
      OR google_photos = ''
      OR google_photos = '[]'
    )
    ORDER BY 
      CASE 
        WHEN state = 'NY' THEN 0 
        WHEN state = 'NJ' THEN 1
        WHEN state = 'DC' THEN 2
        ELSE 3 
      END,
      google_rating DESC NULLS LAST,
      raw_mentions_count DESC NULLS LAST
    LIMIT 5000
  `).all(CONFIG.ENHANCEMENT_VERSION);
  
  log(`✅ Found ${venues.length} venues needing enhancement`);
  return venues;
}

async function enrichWithGooglePlaces(venue) {
  try {
    let placeId = venue.google_place_id;
    
    if (!placeId) {
      const searchQuery = `${venue.name} ${venue.city} ${venue.state}`;
      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${CONFIG.GOOGLE_API_KEY}`;
      const searchResult = await axios.get(searchUrl);
      
      if (searchResult.data.candidates && searchResult.data.candidates.length > 0) {
        placeId = searchResult.data.candidates[0].place_id;
      } else {
        log(`   ❌ Could not find on Google Places`);
        return null;
      }
    }
    
    // Request business_status to check if closed
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,price_level,formatted_phone_number,website,opening_hours,types,reviews,photos,editorial_summary,url,business_status&key=${CONFIG.GOOGLE_API_KEY}`;
    
    const response = await axios.get(detailsUrl);
    const place = response.data.result;
    
    if (!place) {
      log(`   ❌ No details found`);
      return null;
    }
    
    log(`   ⭐ Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews) | Status: ${place.business_status || 'UNKNOWN'}`);
    
    // Check if should be excluded (including closed status)
    const exclusionReason = shouldExcludeVenue(place, venue);
    if (exclusionReason) {
      log(`   🗑️  EXCLUDING: ${exclusionReason}`);
      db.prepare('UPDATE venues SET should_exclude = 1, exclusion_reason = ? WHERE id = ?')
        .run(exclusionReason, venue.id);
      return { excluded: true };
    }
    
    const photos = await downloadPhotos(place.photos, venue.id);
    const menuUrl = await findMenuUrl(place.website);
    
    return {
      google_place_id: placeId,
      google_rating: place.rating,
      google_review_count: place.user_ratings_total,
      google_price_level: place.price_level,
      phone: place.formatted_phone_number || venue.phone,
      website: place.website || venue.website,
      menu_url: menuUrl,
      hours_json: JSON.stringify(place.opening_hours?.weekday_text || []),
      place_types: JSON.stringify(place.types || []),
      google_photos: JSON.stringify(photos),
      reviews: place.reviews || [],
      business_status: place.business_status
    };
    
  } catch (error) {
    log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

function shouldExcludeVenue(googlePlace, dbVenue) {
  const rating = googlePlace.rating || 0;
  const reviewCount = googlePlace.user_ratings_total || 0;
  const name = dbVenue.name.toLowerCase();
  const types = googlePlace.types || [];
  const businessStatus = googlePlace.business_status;
  
  // ═══════════════════════════════════════════════════════════
  // 🚪 CLOSED BUSINESS DETECTION
  // ═══════════════════════════════════════════════════════════
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    return 'Permanently closed';
  }
  
  if (businessStatus === 'CLOSED_TEMPORARILY') {
    return 'Temporarily closed';
  }
  
  // Check reviews for closure indicators
  const reviews = googlePlace.reviews || [];
  const recentReviews = reviews.slice(0, 5).map(r => (r.text || '').toLowerCase()).join(' ');
  
  const closedKeywords = [
    'permanently closed', 'closed down', 'shut down', 'out of business',
    'no longer open', 'closed for good', 'gone out of business',
    'doesn\'t exist anymore', 'not there anymore', 'closed permanently',
    'place is closed', 'this place closed', 'they closed', 'has closed',
    'sadly closed', 'unfortunately closed', 'now closed'
  ];
  
  const closedMatch = closedKeywords.find(kw => recentReviews.includes(kw));
  if (closedMatch) {
    return `Reviews indicate closed: "${closedMatch}"`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🚫 NON-NIGHTLIFE GOOGLE PLACE TYPES
  // ═══════════════════════════════════════════════════════════
  const excludedTypes = [
    'gym', 'school', 'doctor', 'hospital', 'dentist', 'pharmacy',
    'spa', 'beauty_salon', 'hair_care', 'laundry', 'car_wash',
    'gas_station', 'atm', 'bank', 'real_estate_agency', 'lawyer',
    'insurance_agency', 'travel_agency', 'local_government_office',
    'post_office', 'library', 'university', 'primary_school',
    'secondary_school', 'parking', 'car_rental', 'car_repair',
    'pet_store', 'veterinary_care', 'hardware_store', 'furniture_store',
    'home_goods_store', 'electronics_store', 'clothing_store',
    'shoe_store', 'jewelry_store', 'book_store', 'florist',
    'department_store', 'supermarket', 'convenience_store',
    'drugstore', 'movie_theater', 'bowling_alley', 'casino',
    'amusement_park', 'aquarium', 'museum', 'stadium', 
    'church', 'mosque', 'synagogue', 'hindu_temple', 
    'storage', 'moving_company', 'locksmith', 'physiotherapist',
    'accounting', 'electrician', 'plumber', 'roofing_contractor',
    'painter', 'funeral_home', 'cemetery', 'courthouse',
    'fire_station', 'police', 'city_hall', 'embassy'
  ];
  
  const matchedType = types.find(type => excludedTypes.includes(type));
  if (matchedType) {
    return `Non-nightlife type: ${matchedType}`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🚫 BAD KEYWORDS IN NAME
  // ═══════════════════════════════════════════════════════════
  const badKeywords = [
    'dance studio', 'dance school', 'dance class', 'dance lesson',
    'ballet', 'ballroom', 'arthur murray', 'fred astaire',
    'yoga studio', 'pilates', 'fitness center', 'crossfit',
    'martial arts', 'karate', 'taekwondo', 'boxing gym',
    'urgent care', 'medical', 'clinic', 'dental', 'dentist',
    'pharmacy', 'cvs', 'walgreens', 'rite aid',
    'vape', 'smoke shop', 'dispensary', 'cannabis',
    'laundromat', 'dry clean', 'car wash', 'auto repair',
    'storage', 'u-haul', 'moving', 'movers',
    'nail salon', 'hair salon', 'barbershop', 'spa ',
    'pet store', 'veterinary', 'grooming',
    'grocery', 'supermarket', 'food lion', 'safeway',
    'bank', 'credit union', 'insurance', 'attorney', 'lawyer',
    'church', 'mosque', 'temple', 'synagogue', 'ministry',
    'school', 'academy', 'university', 'college', 'learning',
    'daycare', 'preschool', 'kindergarten',
    'funeral', 'cemetery', 'memorial'
  ];
  
  const matchedKeyword = badKeywords.find(kw => name.includes(kw));
  if (matchedKeyword) {
    return `Bad keyword: ${matchedKeyword}`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🍔 FRANCHISE DETECTION
  // ═══════════════════════════════════════════════════════════
  const franchises = [
    'mcdonalds', 'mcdonald\'s', 'chipotle', 'sweetgreen', 'cava',
    'shake shack', 'panera', 'starbucks', 'subway', 'dunkin',
    'pizza hut', 'dominos', 'domino\'s', 'papa johns', 'papa john\'s',
    'kfc', 'popeyes', 'popeye\'s', 'chick-fil-a', 'chickfila',
    'taco bell', 'wendys', 'wendy\'s', 'burger king', 'arbys', 'arby\'s',
    'five guys', 'ihop', 'dennys', 'denny\'s', 'applebees', 'applebee\'s',
    'chilis', 'chili\'s', 'olive garden', 'red lobster', 'outback',
    'pf changs', 'p.f. chang', 'cheesecake factory', 'buffalo wild wings',
    'hooters', 'tgi fridays', 'friday\'s', 'red robin', 'golden corral',
    'waffle house', 'cracker barrel', 'texas roadhouse', 'longhorn',
    'bonefish', 'carrabba', 'maggiano', 'yard house', 'bj\'s restaurant',
    'dave & buster', 'dave and buster', 'topgolf', 'main event',
    'bibibop', 'nando\'s', 'nandos', 'wingstop', 'zaxby',
    'jersey mike', 'jimmy john', 'firehouse subs', 'which wich',
    'panda express', 'pei wei', 'qdoba', 'moe\'s southwest',
    'boston market', 'el pollo loco', 'del taco', 'jack in the box',
    'sonic drive', 'checkers', 'rally\'s', 'hardees', 'hardee\'s',
    'carl\'s jr', 'white castle', 'krystal', 'culver\'s', 'culvers',
    'in-n-out', 'whataburger', 'steak n shake', 'steak \'n shake',
    'ruth\'s chris', 'capital grille', 'morton\'s', 'fleming\'s',
    'fogo de chao', 'texas de brazil', 'benihana', 'seasons 52'
  ];
  
  const matchedFranchise = franchises.find(chain => name.includes(chain));
  if (matchedFranchise) {
    return `Franchise: ${matchedFranchise}`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // ⭐ SMART QUALITY FILTER (rating + review count)
  // ═══════════════════════════════════════════════════════════
  
  // High engagement = more forgiving on rating
  if (reviewCount >= 2000) {
    if (rating < 3.0) return `Low rating (${rating}) despite ${reviewCount} reviews`;
    return null;
  }
  
  if (reviewCount >= 1000) {
    if (rating < 3.2) return `Low rating (${rating}) with ${reviewCount} reviews`;
    return null;
  }
  
  if (reviewCount >= 500) {
    if (rating < 3.5) return `Low rating (${rating}) with ${reviewCount} reviews`;
    return null;
  }
  
  if (reviewCount >= 100) {
    if (rating < 3.8) return `Low rating (${rating}) with only ${reviewCount} reviews`;
    return null;
  }
  
  // Low engagement (<100 reviews) - need 4.0+ to keep
  if (reviewCount < 100 && rating < 4.0 && rating > 0) {
    return `Low rating (${rating}) with only ${reviewCount} reviews`;
  }
  
  return null;
}

async function downloadPhotos(photos, venueId) {
  if (!photos || photos.length === 0) return [];
  
  const downloadedPhotos = [];
  const photosToDownload = photos.slice(0, CONFIG.PHOTOS_PER_VENUE);
  
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
      // Silent fail for photos
    }
  }
  
  return downloadedPhotos;
}

async function findMenuUrl(website) {
  if (!website) return null;
  
  try {
    const menuPaths = ['/menu', '/menus', '/food-menu', '/drink-menu'];
    for (const p of menuPaths) {
      const menuUrl = website.replace(/\/$/, '') + p;
      try {
        const response = await axios.head(menuUrl, { timeout: 3000 });
        if (response.status === 200) return menuUrl;
      } catch (e) { continue; }
    }
    return website;
  } catch (error) {
    return website;
  }
}

async function analyzeWithOpenAI(venue, reviews) {
  try {
    if (!reviews || reviews.length === 0) return null;
    
    const reviewText = reviews.slice(0, 5).map(r => r.text).join('\n---\n');
    
    const completion = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `Analyze these reviews for "${venue.name}" (${venue.category}):

${reviewText}

Return JSON with:
{
  "music_genres": [],
  "primary_vibes": [],
  "secondary_vibes": [],
  "energy_level": "calm|moderate|lively|high",
  "signature_items": [],
  "lounge_type": null,
  "first_date_suitable": false,
  "anniversary_suitable": false,
  "girls_night_suitable": false,
  "pregame_spot": false,
  "late_night_spot": false
}`
      }],
      max_tokens: 800
    });
    
    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch {
      return null;
    }
    
  } catch (error) {
    log(`   ⚠️ OpenAI error: ${error.message}`);
    return null;
  }
}

function updateVenue(venueId, googleData, analysis) {
  try {
    const updateStmt = db.prepare(`
      UPDATE venues SET
        google_place_id = COALESCE(?, google_place_id),
        google_rating = COALESCE(?, google_rating),
        phone = COALESCE(?, phone),
        website = COALESCE(?, website),
        menu_url = COALESCE(?, menu_url),
        hours_json = COALESCE(?, hours_json),
        place_types = COALESCE(?, place_types),
        google_photos = COALESCE(?, google_photos),
        google_price_level = COALESCE(?, google_price_level),
        primary_vibes = COALESCE(?, primary_vibes),
        secondary_vibes = COALESCE(?, secondary_vibes),
        energy_level = COALESCE(?, energy_level),
        music_genres_normalized = COALESCE(?, music_genres_normalized),
        signature_items = COALESCE(?, signature_items),
        lounge_type = COALESCE(?, lounge_type),
        first_date_suitable = COALESCE(?, first_date_suitable),
        anniversary_suitable = COALESCE(?, anniversary_suitable),
        girls_night_suitable = COALESCE(?, girls_night_suitable),
        pregame_spot = COALESCE(?, pregame_spot),
        late_night_spot = COALESCE(?, late_night_spot),
        last_enhanced = datetime('now'),
        enhancement_version = ?
      WHERE id = ?
    `);
    
    updateStmt.run(
      googleData.google_place_id,
      googleData.google_rating,
      googleData.phone,
      googleData.website,
      googleData.menu_url,
      googleData.hours_json,
      googleData.place_types,
      googleData.google_photos,
      googleData.google_price_level,
      analysis?.primary_vibes ? JSON.stringify(analysis.primary_vibes) : null,
      analysis?.secondary_vibes ? JSON.stringify(analysis.secondary_vibes) : null,
      analysis?.energy_level || null,
      analysis?.music_genres ? JSON.stringify(analysis.music_genres) : null,
      analysis?.signature_items ? JSON.stringify(analysis.signature_items) : null,
      analysis?.lounge_type || null,
      analysis?.first_date_suitable ? 1 : null,
      analysis?.anniversary_suitable ? 1 : null,
      analysis?.girls_night_suitable ? 1 : null,
      analysis?.pregame_spot ? 1 : null,
      analysis?.late_night_spot ? 1 : null,
      CONFIG.ENHANCEMENT_VERSION,
      venueId
    );
    
  } catch (error) {
    log(`   ❌ DB error: ${error.message}`);
  }
}

async function main() {
  log(`
╔═══════════════════════════════════════════════════════════╗
║  🎯 LUMINA MASTER ENRICHMENT v3.0                        ║
║  Smart Quality Filters + Closed Detection + OpenAI        ║
╚═══════════════════════════════════════════════════════════╝
`);
  
  const venues = getVenuesToEnhance();
  
  if (venues.length === 0) {
    log('✅ All venues already enhanced! Exiting.');
    process.exit(0);
  }
  
  let processed = 0;
  let enhanced = 0;
  let excluded = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    processed++;
    
    log(`\n[${processed}/${venues.length}] ${venue.name} (${venue.city}, ${venue.state})`);
    
    try {
      const googleData = await enrichWithGooglePlaces(venue);
      
      if (!googleData) {
        failed++;
        continue;
      }
      
      if (googleData.excluded) {
        excluded++;
        continue;
      }
      
      // Analyze reviews with OpenAI
      const analysis = googleData.reviews.length > 0 
        ? await analyzeWithOpenAI(venue, googleData.reviews)
        : null;
      
      updateVenue(venue.id, googleData, analysis);
      enhanced++;
      
      log(`   ✅ Enhanced (${googleData.google_photos ? JSON.parse(googleData.google_photos).length : 0} photos)`);
      
      // Rate limiting
      if (processed % CONFIG.BATCH_SIZE === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        log(`\n📊 Progress: ${processed}/${venues.length} | Enhanced: ${enhanced} | Excluded: ${excluded} | Failed: ${failed} | Time: ${elapsed}min`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      log(`❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  
  log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ ENRICHMENT COMPLETE                                   ║
╠═══════════════════════════════════════════════════════════╣
║  Processed: ${processed.toString().padEnd(44)}║
║  Enhanced:  ${enhanced.toString().padEnd(44)}║
║  Excluded:  ${excluded.toString().padEnd(44)}║
║  Failed:    ${failed.toString().padEnd(44)}║
║  Time:      ${(totalTime + ' minutes').padEnd(44)}║
╚═══════════════════════════════════════════════════════════╝
`);
  
  process.exit(0);
}

main().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
  process.exit(1);
});
