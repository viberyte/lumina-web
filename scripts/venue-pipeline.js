import Database from 'better-sqlite3';
import fs from 'fs';
import fetch from 'node-fetch';
import OpenAI from 'openai';

// ============================================
// CONFIG
// ============================================
const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const GOOGLE_API_KEY = 'AIzaSyC8V3YWiqKjP22Fe-ALMBL77aN7qbkMdTA';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const OUTPUT_DIR = '/opt/viberyte/lumina-web/data/pipeline-results';
const NEW_VENUES_FILE = `${OUTPUT_DIR}/new-venues-ready.json`;
const REVIEW_QUEUE_FILE = `${OUTPUT_DIR}/venues-for-review.json`;
const IGNORED_FILE = `${OUTPUT_DIR}/venues-ignored.json`;
const PHOTOS_DIR = '/opt/viberyte/lumina-web/public/venue-photos';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// ============================================
// CONFIDENCE SCORING SYSTEM
// ============================================
const NOISE_PATTERNS = [
  /^dj/i, /dj$/i, /official/i, /music$/i, /beats$/i, /sounds$/i,
  /printing/i, /group/i, /events$/i, /nights$/i, /party$/i,
  /^[a-z]{1,3}$/i, /^\d+$/, /weekend/i, /saturday/i, /sunday/i,
  /friday/i, /ladies/i, /^the$/i, /^at$/i, /^hey$/i, /^hot$/i,
  /promo/i, /booking/i, /ticket/i, /rsvp/i, /guest/i, /list$/i,
];

const VENUE_WORDS = [
  'bar', 'lounge', 'club', 'rooftop', 'nyc', 'brooklyn', 'harlem',
  'manhattan', 'queens', 'social', 'house', 'room', 'tavern', 'pub',
  'speakeasy', 'cocktail', 'wine', 'beer', 'grill', 'kitchen',
  'restaurant', 'cafe', 'bistro', 'terrace', 'garden', 'penthouse',
];

const CITY_WORDS = ['nyc', 'brooklyn', 'manhattan', 'harlem', 'queens', 'bronx', 'jersey', 'hoboken'];

function calculateConfidence(name, mentionCount = 1, googleMatch = false) {
  let score = 0;
  const lower = name.toLowerCase();
  
  // NEGATIVE: Noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(name)) {
      score -= 3;
    }
  }
  
  // NEGATIVE: Too short
  if (name.length < 4) score -= 2;
  
  // NEGATIVE: All lowercase (likely username)
  if (name === lower && !VENUE_WORDS.some(w => lower.includes(w))) score -= 2;
  
  // POSITIVE: Contains venue words
  for (const word of VENUE_WORDS) {
    if (lower.includes(word)) {
      score += 2;
      break;
    }
  }
  
  // POSITIVE: Contains city name
  for (const city of CITY_WORDS) {
    if (lower.includes(city)) {
      score += 1;
      break;
    }
  }
  
  // POSITIVE: Multi-word capitalized name
  const words = name.split(/\s+/);
  if (words.length >= 2 && words.every(w => /^[A-Z]/.test(w))) {
    score += 2;
  }
  
  // POSITIVE: Single capitalized word, decent length
  if (words.length === 1 && /^[A-Z][a-z]+$/.test(name) && name.length >= 5) {
    score += 1;
  }
  
  // POSITIVE: Mentioned multiple times
  if (mentionCount >= 2) score += 1;
  if (mentionCount >= 3) score += 1;
  
  // POSITIVE: Google Places found it
  if (googleMatch) score += 3;
  
  return {
    score,
    tier: score >= 4 ? 'auto' : score >= 2 ? 'review' : 'ignore',
    reasons: getConfidenceReasons(name, mentionCount, googleMatch, score),
  };
}

function getConfidenceReasons(name, mentionCount, googleMatch, score) {
  const reasons = [];
  const lower = name.toLowerCase();
  
  if (googleMatch) reasons.push('Google Places match');
  if (mentionCount >= 2) reasons.push(`Mentioned ${mentionCount}x`);
  if (VENUE_WORDS.some(w => lower.includes(w))) reasons.push('Contains venue word');
  if (name.split(/\s+/).length >= 2) reasons.push('Multi-word name');
  if (NOISE_PATTERNS.some(p => p.test(name))) reasons.push('⚠️ Noise pattern');
  if (name.length < 4) reasons.push('⚠️ Too short');
  
  return reasons;
}

// ============================================
// VIBE KEYWORDS
// ============================================
const VIBE_KEYWORDS = {
  music: {
    'hip-hop': ['hiphop', 'hip hop', 'rap', 'trap', 'rnb', 'r&b', 'drake'],
    'house': ['house', 'techno', 'edm', 'electronic', 'deep house'],
    'afrobeats': ['afrobeats', 'afro', 'amapiano', 'dancehall', 'soca'],
    'latin': ['latin', 'reggaeton', 'salsa', 'bachata', 'bad bunny'],
    'live': ['live music', 'live band', 'jazz', 'acoustic'],
    'top40': ['top 40', 'pop', 'hits', 'throwbacks'],
  },
  atmosphere: {
    'upscale': ['upscale', 'luxury', 'vip', 'bottle service', 'exclusive'],
    'chill': ['chill', 'relaxed', 'laid back', 'cozy', 'lounge'],
    'turn-up': ['turn up', 'turnup', 'lit', 'party', 'hype', 'packed'],
    'intimate': ['intimate', 'date night', 'romantic', 'quiet'],
    'trendy': ['trendy', 'instagram', 'aesthetic', 'influencer', 'viral'],
  },
  bestNights: {
    'friday': ['friday', 'fridays'],
    'saturday': ['saturday', 'saturdays', 'weekend'],
    'thursday': ['thursday', 'thirsty thursday'],
    'sunday': ['sunday', 'day party', 'brunch'],
  }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================
// SEARCH TIKTOK
// ============================================
async function searchTikTok(query, limit = 20) {
  console.log(`🔍 TikTok: "${query}"`);
  
  try {
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: [query],
          resultsPerPage: limit,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
      }
    );
    
    if (!startResponse.ok) return [];
    
    const runData = await startResponse.json();
    const runId = runData.data.id;
    
    let attempts = 0;
    while (attempts < 36) {
      await sleep(5000);
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      const statusData = await statusResponse.json();
      if (statusData.data.status === 'SUCCEEDED') break;
      if (['FAILED', 'ABORTED'].includes(statusData.data.status)) return [];
      attempts++;
      process.stdout.write('.');
    }
    console.log('');
    
    const resultsResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`);
    const results = await resultsResponse.json();
    console.log(`   ✅ ${results.length} videos`);
    return results;
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
    return [];
  }
}

// ============================================
// EXTRACT VENUE MENTIONS WITH COUNTS
// ============================================
function extractVenueMentions(videos) {
  const mentions = new Map(); // name -> { count, vibes }
  
  const vibes = {
    music: {},
    atmosphere: {},
    bestNights: {},
    hashtags: {},
    engagement: { totalViews: 0, totalLikes: 0, videoCount: videos.length }
  };
  
  videos.forEach(video => {
    const text = `${video.text || ''} ${video.desc || ''}`;
    const lower = text.toLowerCase();
    
    // Extract @mentions
    const atMentions = text.match(/@([A-Za-z0-9_]+)/g) || [];
    atMentions.forEach(m => {
      const name = m.replace('@', '').replace(/_/g, ' ').trim();
      if (name.length >= 3) {
        const existing = mentions.get(name) || { count: 0 };
        mentions.set(name, { ...existing, count: existing.count + 1 });
      }
    });
    
    // Extract "at [Venue]" pattern
    const atPattern = /\bat\s+([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,3})/g;
    let match;
    while ((match = atPattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length >= 3) {
        const existing = mentions.get(name) || { count: 0 };
        mentions.set(name, { ...existing, count: existing.count + 1 });
      }
    }
    
    // Extract "[Name] Bar/Lounge/Club" pattern
    const suffixPattern = /([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)?)\s+(Bar|Lounge|Club|Rooftop|NYC)/g;
    while ((match = suffixPattern.exec(text)) !== null) {
      const name = `${match[1]} ${match[2]}`.trim();
      const existing = mentions.get(name) || { count: 0 };
      mentions.set(name, { ...existing, count: existing.count + 1 });
    }
    
    // Hashtags
    const hashtagMatches = text.match(/#([A-Za-z0-9_]+)/g) || [];
    hashtagMatches.forEach(h => {
      const tag = h.replace('#', '').toLowerCase();
      vibes.hashtags[tag] = (vibes.hashtags[tag] || 0) + 1;
    });
    
    // Engagement
    vibes.engagement.totalViews += video.playCount || video.plays || 0;
    vibes.engagement.totalLikes += video.diggCount || video.likes || 0;
    
    // Detect vibes
    Object.entries(VIBE_KEYWORDS).forEach(([category, keywords]) => {
      Object.entries(keywords).forEach(([vibe, terms]) => {
        terms.forEach(term => {
          if (lower.includes(term)) {
            vibes[category][vibe] = (vibes[category][vibe] || 0) + 1;
          }
        });
      });
    });
  });
  
  vibes.engagement.avgViews = vibes.engagement.videoCount > 0 
    ? Math.round(vibes.engagement.totalViews / vibes.engagement.videoCount) 
    : 0;
  
  return { mentions, vibes };
}

// ============================================
// GOOGLE PLACES LOOKUP
// ============================================
async function googlePlacesLookup(venueName, city = 'NYC') {
  const query = encodeURIComponent(`${venueName} ${city} bar lounge club`);
  
  try {
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`
    );
    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) return null;
    
    const place = searchData.results[0];
    const placeId = place.place_id;
    
    // Check if result name is similar enough
    const resultName = place.name.toLowerCase();
    const searchName = venueName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const resultNameClean = resultName.replace(/[^a-z0-9]/g, '');
    
    // Loose match - at least 50% of characters match
    const matchScore = searchName.split('').filter(c => resultNameClean.includes(c)).length / searchName.length;
    if (matchScore < 0.4) {
      console.log(`      ⚠️ Google result "${place.name}" doesn't match "${venueName}"`);
      return null;
    }
    
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,price_level,website,url,photos,types,formatted_phone_number&key=${GOOGLE_API_KEY}`
    );
    const detailsData = await detailsResponse.json();
    const details = detailsData.result || {};
    
    const photoUrls = [];
    if (details.photos) {
      for (let i = 0; i < Math.min(15, details.photos.length); i++) {
        const ref = details.photos[i].photo_reference;
        photoUrls.push(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_API_KEY}`);
      }
    }
    
    let extractedCity = 'Manhattan';
    const addr = details.formatted_address || '';
    if (addr.includes('Brooklyn')) extractedCity = 'Brooklyn';
    else if (addr.includes('Queens')) extractedCity = 'Queens';
    else if (addr.includes('Bronx')) extractedCity = 'Bronx';
    else if (addr.includes('Staten Island')) extractedCity = 'Staten Island';
    else if (addr.includes('Jersey City')) extractedCity = 'Jersey City';
    else if (addr.includes('Hoboken')) extractedCity = 'Hoboken';
    else if (addr.includes('Newark')) extractedCity = 'Newark';
    
    let category = 'lounge';
    if (details.types) {
      if (details.types.includes('night_club')) category = 'club';
      else if (details.types.includes('bar')) category = 'bar';
    }
    
    return {
      name: details.name || venueName,
      address: details.formatted_address,
      city: extractedCity,
      lat: details.geometry?.location?.lat,
      lng: details.geometry?.location?.lng,
      rating: details.rating,
      priceLevel: details.price_level,
      website: details.website,
      googleMapsUrl: details.url,
      phone: details.formatted_phone_number,
      placeId: placeId,
      category: category,
      types: details.types,
      photoUrls: photoUrls,
    };
  } catch (e) {
    console.log(`      ❌ Google error: ${e.message}`);
    return null;
  }
}

// ============================================
// DOWNLOAD PHOTOS
// ============================================
async function downloadPhotos(venueId, photoUrls, maxPhotos = 10) {
  const downloaded = [];
  
  for (let i = 0; i < Math.min(maxPhotos, photoUrls.length); i++) {
    try {
      const response = await fetch(photoUrls[i]);
      if (!response.ok) continue;
      
      const buffer = await response.buffer();
      const filename = `venue-${venueId}-${i + 1}.jpg`;
      const filepath = `${PHOTOS_DIR}/${filename}`;
      
      fs.writeFileSync(filepath, buffer);
      downloaded.push(`/venue-photos/${filename}`);
      
      await sleep(200);
    } catch (e) {}
  }
  
  return downloaded;
}

// ============================================
// OPENAI TAGGING
// ============================================
async function aiTagVenue(venue, tiktokVibes) {
  if (!openai) return null;
  
  try {
    const prompt = `Analyze this NYC nightlife venue:

Name: ${venue.name}
Address: ${venue.address}
Category: ${venue.category}
Google Types: ${(venue.types || []).join(', ')}
TikTok Music: ${Object.keys(tiktokVibes.music || {}).join(', ')}
TikTok Atmosphere: ${Object.keys(tiktokVibes.atmosphere || {}).join(', ')}

Respond ONLY with JSON:
{
  "category": "lounge|bar|club|rooftop|speakeasy",
  "vibe_tags": ["upscale", "chill", "turn-up", "intimate", "trendy"],
  "music_tags": ["hip-hop", "house", "afrobeats", "latin", "live", "top40"],
  "best_for": ["date night", "friends", "solo", "business"],
  "price_tier": "$|$$|$$$|$$$$"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });
    
    const content = response.choices[0].message.content;
    const json = content.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
}

// ============================================
// CHECK IF IN DB
// ============================================
function findInDB(db, venueName) {
  const clean = venueName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (clean.length < 3) return null;
  
  return db.prepare(`
    SELECT id, name, city FROM venues 
    WHERE LOWER(REPLACE(name, '''', '')) LIKE ?
    AND should_exclude = 0
    LIMIT 1
  `).get(`%${clean}%`);
}

// ============================================
// UPDATE EXISTING VENUE
// ============================================
function updateExistingVenue(db, venueId, vibes) {
  const tags = [];
  Object.keys(vibes.music || {}).slice(0, 2).forEach(k => tags.push(`music:${k}`));
  Object.keys(vibes.atmosphere || {}).slice(0, 2).forEach(k => tags.push(`vibe:${k}`));
  Object.keys(vibes.bestNights || {}).slice(0, 2).forEach(k => tags.push(`best:${k}`));
  
  const score = Math.min(100, Math.round(
    (vibes.engagement.avgViews / 10000) * 30 +
    (Object.keys(vibes.music).length > 0 ? 25 : 0) +
    (Object.keys(vibes.atmosphere).length > 0 ? 25 : 0) + 20
  ));
  
  db.prepare(`
    UPDATE venues SET tiktok_tags = ?, tiktok_score = ?, tiktok_updated = ?
    WHERE id = ?
  `).run(JSON.stringify(tags), score, new Date().toISOString(), venueId);
  
  return { tags, score };
}

// ============================================
// DISCOVERY SEARCHES
// ============================================
const DISCOVERY_SEARCHES = [
  'NYC lounge lit saturday night',
  'Manhattan bar best vibes',
  'Brooklyn nightclub hip hop',
  'NYC rooftop bar drinks',
  'NYC afrobeats party club',
  'NYC latin reggaeton club',
  'Harlem lounge uptown nightlife',
  'Brooklyn house music club',
  'NYC speakeasy hidden bar',
  'Jersey City lounge nightlife',
  'Hoboken bar scene lit',
  'NYC bottle service club vip',
  'best date night bar nyc',
  'NYC jazz lounge live music',
  'Queens nightlife bar lounge',
];

// ============================================
// MAIN PIPELINE
// ============================================
async function runPipeline(options = {}) {
  const { 
    enhanceLimit = 20, 
    discoverLimit = 10,
    downloadPhotosEnabled = true 
  } = options;
  
  console.log(`\n🚀 LUMINA VENUE PIPELINE v2 (with Confidence Scoring)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Enhance existing: ${enhanceLimit}`);
  console.log(`Discovery searches: ${discoverLimit}`);
  console.log(`Download photos: ${downloadPhotosEnabled}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const db = new Database(DB_PATH);
  
  // Ensure columns
  const columns = db.prepare("PRAGMA table_info(venues)").all().map(c => c.name);
  if (!columns.includes('tiktok_tags')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_tags TEXT');
  if (!columns.includes('tiktok_score')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_score INTEGER');
  if (!columns.includes('tiktok_updated')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_updated TEXT');
  if (!columns.includes('google_photos')) db.exec('ALTER TABLE venues ADD COLUMN google_photos TEXT');
  if (!columns.includes('website')) db.exec('ALTER TABLE venues ADD COLUMN website TEXT');
  
  const stats = { 
    enhanced: 0, 
    matched: 0, 
    autoAdded: [], 
    forReview: [], 
    ignored: [] 
  };
  
  // ==========================================
  // PHASE 1: ENHANCE EXISTING
  // ==========================================
  console.log(`\n📊 PHASE 1: ENHANCE EXISTING VENUES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const existingVenues = db.prepare(`
    SELECT id, name, city FROM venues 
    WHERE category IN ('lounge', 'bar', 'club', 'night_club', 'cocktail_bar', 'speakeasy', 'rooftop')
    AND (tiktok_updated IS NULL OR tiktok_updated < datetime('now', '-30 days'))
    AND should_exclude = 0
    ORDER BY rating DESC NULLS LAST
    LIMIT ?
  `).all(enhanceLimit);
  
  console.log(`Found ${existingVenues.length} venues to enhance\n`);
  
  for (const venue of existingVenues) {
    console.log(`📍 ${venue.name} (${venue.city})`);
    
    const videos = await searchTikTok(`${venue.name} ${venue.city}`, 15);
    if (videos.length === 0) {
      console.log(`   ⚠️ No TikTok content\n`);
      continue;
    }
    
    const { vibes } = extractVenueMentions(videos);
    const result = updateExistingVenue(db, venue.id, vibes);
    
    console.log(`   🎵 ${Object.keys(vibes.music).slice(0,2).join(', ') || '-'} | ✨ ${Object.keys(vibes.atmosphere).slice(0,2).join(', ') || '-'} | 📊 ${result.score}\n`);
    stats.enhanced++;
    await sleep(2000);
  }
  
  // ==========================================
  // PHASE 2: DISCOVER WITH CONFIDENCE SCORING
  // ==========================================
  console.log(`\n🔍 PHASE 2: DISCOVER NEW VENUES (Confidence Scoring)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const searches = DISCOVERY_SEARCHES.slice(0, discoverLimit);
  const processedNames = new Set();
  
  for (const query of searches) {
    console.log(`\n🔎 "${query}"`);
    
    const videos = await searchTikTok(query, 20);
    if (videos.length === 0) continue;
    
    const { mentions, vibes } = extractVenueMentions(videos);
    console.log(`   Found ${mentions.size} venue mentions`);
    
    for (const [venueName, data] of mentions) {
      if (processedNames.has(venueName.toLowerCase())) continue;
      processedNames.add(venueName.toLowerCase());
      
      // Check if in DB
      const existing = findInDB(db, venueName);
      if (existing) {
        console.log(`   ✅ ${venueName} → Matched "${existing.name}" (ID: ${existing.id})`);
        updateExistingVenue(db, existing.id, vibes);
        stats.matched++;
        continue;
      }
      
      // Calculate initial confidence
      const initialConf = calculateConfidence(venueName, data.count, false);
      
      if (initialConf.tier === 'ignore') {
        console.log(`   ❌ ${venueName} → Ignored (score: ${initialConf.score})`);
        stats.ignored.push({ name: venueName, score: initialConf.score, reasons: initialConf.reasons });
        continue;
      }
      
      console.log(`   🆕 ${venueName} (confidence: ${initialConf.score}, tier: ${initialConf.tier})`);
      
      // Google lookup
      const googleData = await googlePlacesLookup(venueName);
      
      // Recalculate with Google result
      const finalConf = calculateConfidence(venueName, data.count, !!googleData);
      
      if (!googleData) {
        if (finalConf.tier === 'review') {
          console.log(`      📋 Added to review queue (no Google match)`);
          stats.forReview.push({
            name: venueName,
            mentionCount: data.count,
            confidence: finalConf,
            source: query,
            vibes: {
              music: Object.keys(vibes.music).slice(0, 3),
              atmosphere: Object.keys(vibes.atmosphere).slice(0, 3),
            },
          });
        } else {
          stats.ignored.push({ name: venueName, score: finalConf.score, reasons: finalConf.reasons });
        }
        continue;
      }
      
      console.log(`      ✅ Google: ${googleData.name} | ${googleData.city}`);
      
      // HIGH CONFIDENCE: Auto-pipeline
      if (finalConf.tier === 'auto' || finalConf.score >= 4) {
        console.log(`      🚀 AUTO-ADDING (confidence: ${finalConf.score})`);
        
        // Download photos
        let localPhotos = [];
        if (downloadPhotosEnabled && googleData.photoUrls.length > 0) {
          const tempId = `new-${Date.now()}`;
          localPhotos = await downloadPhotos(tempId, googleData.photoUrls, 10);
          console.log(`      📸 Downloaded ${localPhotos.length} photos`);
        }
        
        // AI tagging
        const aiTags = await aiTagVenue(googleData, vibes);
        
        // Build venue object
        const tiktokTags = [];
        Object.keys(vibes.music).slice(0, 2).forEach(k => tiktokTags.push(`music:${k}`));
        Object.keys(vibes.atmosphere).slice(0, 2).forEach(k => tiktokTags.push(`vibe:${k}`));
        Object.keys(vibes.bestNights).slice(0, 2).forEach(k => tiktokTags.push(`best:${k}`));
        
        const newVenue = {
          name: googleData.name,
          address: googleData.address,
          city: googleData.city,
          lat: googleData.lat,
          lng: googleData.lng,
          rating: googleData.rating,
          price_tier: aiTags?.price_tier || (googleData.priceLevel ? '$'.repeat(googleData.priceLevel) : '$$'),
          category: aiTags?.category || googleData.category,
          website: googleData.website,
          google_maps_url: googleData.googleMapsUrl,
          phone: googleData.phone,
          google_place_id: googleData.placeId,
          google_photos: googleData.photoUrls,
          local_photos: localPhotos,
          vibe_tags: aiTags?.vibe_tags || Object.keys(vibes.atmosphere).slice(0, 3),
          music_tags: aiTags?.music_tags || Object.keys(vibes.music).slice(0, 3),
          tiktok_tags: tiktokTags,
          tiktok_score: Math.min(100, finalConf.score * 15 + vibes.engagement.avgViews / 5000 * 20),
          best_for: aiTags?.best_for || [],
          confidence: finalConf,
          source: 'tiktok_discovery',
          discovered_from: query,
        };
        
        stats.autoAdded.push(newVenue);
        
      } else {
        // MEDIUM CONFIDENCE: Queue for review
        console.log(`      📋 Added to review queue (confidence: ${finalConf.score})`);
        stats.forReview.push({
          name: googleData.name,
          address: googleData.address,
          city: googleData.city,
          website: googleData.website,
          googleMapsUrl: googleData.googleMapsUrl,
          photoUrls: googleData.photoUrls.slice(0, 5),
          confidence: finalConf,
          source: query,
          vibes: {
            music: Object.keys(vibes.music).slice(0, 3),
            atmosphere: Object.keys(vibes.atmosphere).slice(0, 3),
          },
        });
      }
      
      await sleep(1500);
    }
    
    await sleep(2000);
  }
  
  db.close();
  
  // ==========================================
  // SAVE RESULTS
  // ==========================================
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 PIPELINE COMPLETE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Existing enhanced: ${stats.enhanced}`);
  console.log(`Discovery matched: ${stats.matched}`);
  console.log(`🚀 AUTO-ADD (high confidence): ${stats.autoAdded.length}`);
  console.log(`📋 FOR REVIEW (medium confidence): ${stats.forReview.length}`);
  console.log(`❌ IGNORED (low confidence): ${stats.ignored.length}`);
  
  // Save files
  if (stats.autoAdded.length > 0) {
    fs.writeFileSync(NEW_VENUES_FILE, JSON.stringify(stats.autoAdded, null, 2));
    console.log(`\n📁 Auto-add venues: ${NEW_VENUES_FILE}`);
    stats.autoAdded.forEach(v => console.log(`   🔥 ${v.name} (${v.city}) - ${v.confidence.score} pts`));
  }
  
  if (stats.forReview.length > 0) {
    fs.writeFileSync(REVIEW_QUEUE_FILE, JSON.stringify(stats.forReview, null, 2));
    console.log(`\n📋 Review queue: ${REVIEW_QUEUE_FILE}`);
    stats.forReview.slice(0, 10).forEach(v => console.log(`   📝 ${v.name} - ${v.confidence.score} pts`));
  }
  
  if (stats.ignored.length > 0) {
    fs.writeFileSync(IGNORED_FILE, JSON.stringify(stats.ignored, null, 2));
    console.log(`\n❌ Ignored: ${IGNORED_FILE}`);
  }
  
  console.log(`\n✅ Done!\n`);
  return stats;
}

// ============================================
// CLI
// ============================================
const args = process.argv.slice(2);
const enhanceLimit = parseInt(args[0]) || 20;
const discoverLimit = parseInt(args[1]) || 10;

runPipeline({ enhanceLimit, discoverLimit, downloadPhotosEnabled: true });
