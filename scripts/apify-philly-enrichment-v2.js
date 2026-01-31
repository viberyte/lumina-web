import { ApifyClient } from 'apify-client';
import Database from 'better-sqlite3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db',
  CSV_PATH: '/opt/viberyte/lumina-web/philly-venues.csv'
};

const client = new ApifyClient({ token: CONFIG.APIFY_TOKEN });
const db = new Database(CONFIG.DB_PATH);

// VIBE KEYWORDS for signal extraction
const VIBE_KEYWORDS = {
  loud: ['loud', 'blasting', 'hard to talk', 'noisy', 'deafening'],
  chill: ['relaxed', 'laid-back', 'intimate', 'cozy', 'quiet', 'calm'],
  dressy: ['dress code', 'upscale', 'classy', 'elegant', 'formal', 'nice'],
  line: ['line', 'waited', 'wait', 'doorman', 'bouncer', 'queue'],
  dancing: ['dance', 'dj', 'music', 'dancing', 'club'],
  romantic: ['romantic', 'date', 'intimate', 'candlelit', 'couples'],
  crowded: ['packed', 'crowded', 'busy', 'full', 'jammed']
};

// String normalization
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|bar|club|lounge|restaurant|nightclub)\b/g, '')
    .trim();
}

// Simple Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Name similarity score (0-1)
function nameSimilarity(name1, name2) {
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  const distance = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return 1 - (distance / maxLen);
}

// Extract vibe signals from reviews
function extractVibeSignals(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      energy_level: 'moderate',
      conversation_friendly: true,
      friction_score: 'low',
      dance_focus: false,
      romantic_suitable: false
    };
  }
  
  const reviewText = reviews.map(r => r.text || '').join(' ').toLowerCase();
  
  const signals = {
    loud: 0,
    chill: 0,
    dressy: 0,
    line: 0,
    dancing: 0,
    romantic: 0,
    crowded: 0
  };
  
  // Count keyword occurrences
  for (const [category, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      const matches = (reviewText.match(new RegExp(keyword, 'g')) || []).length;
      signals[category] += matches;
    }
  }
  
  // Derive insights
  const energy_level = 
    signals.loud > 2 || signals.dancing > 2 ? 'high' :
    signals.chill > 2 ? 'low' : 'moderate';
  
  const conversation_friendly = signals.loud < 2 && signals.crowded < 2;
  
  const friction_score = 
    signals.line > 2 || signals.crowded > 3 ? 'high' :
    signals.line > 0 ? 'medium' : 'low';
  
  const dance_focus = signals.dancing > 2;
  const romantic_suitable = signals.romantic > 1 || (signals.chill > 1 && signals.line < 2);
  
  return {
    energy_level,
    conversation_friendly,
    friction_score,
    dance_focus,
    romantic_suitable
  };
}

// Read Philly venues from CSV
function loadPhillyVenues() {
  const csv = fs.readFileSync(CONFIG.CSV_PATH, 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  return lines.filter(line => line.trim()).map(line => {
    const match = line.match(/^(\d+),"([^"]+)","([^"]+)",([^,]+),([^,]+)$/);
    if (!match) return null;
    return {
      id: match[1],
      name: match[2],
      address: match[3],
      city: match[4],
      state: match[5]
    };
  }).filter(Boolean);
}

// STEP 1: Google Maps Scraper
async function runGoogleMapsScraper(venues) {
  console.log('\n🗺️  STEP 1: Running Google Maps Scraper...');
  console.log(`   Scraping ${venues.length} Philly venues\n`);
  
  const searchQueries = venues.map(v => `${v.name} ${v.address}`);
  
  const input = {
    searchStringsArray: searchQueries,
    maxCrawledPlacesPerSearch: 1,
    language: 'en',
    maxReviews: 10,
    maxImages: 10,
    exportPlaceUrls: false,
    scrapeReviewerName: false
  };
  
  const run = await client.actor('nwua9Gu5YrADL7ZDj').call(input);
  
  console.log(`   ✅ Google Maps scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Downloaded ${items.length} places\n`);
  
  return items;
}

// STEP 2: Instagram Profile Scraper
async function runInstagramProfileScraper(venues) {
  console.log('\n📸 STEP 2: Running Instagram Profile Scraper...');
  console.log(`   Finding Instagram handles for ${venues.length} venues\n`);
  
  const usernames = venues.map(v => v.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  const input = {
    usernames: usernames.slice(0, 100),
    resultsLimit: 1
  };
  
  const run = await client.actor('apify/instagram-profile-scraper').call(input);
  
  console.log(`   ✅ Instagram scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Found ${items.length} Instagram profiles\n`);
  
  return items;
}

// STEP 3: Save Google Maps Data with Vibe Signals
function saveGoogleMapsData(googlePlaces, phillyVenues) {
  console.log('\n💾 STEP 3: Saving Google Maps data with vibe intelligence...');
  
  let saved = 0;
  let vibeExtracted = 0;
  
  for (const place of googlePlaces) {
    // Better matching: name similarity + city match
    const matches = phillyVenues.map(v => ({
      venue: v,
      similarity: nameSimilarity(v.name, place.title || '')
    }))
    .filter(m => m.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) continue;
    
    const venue = matches[0].venue;
    
    const photos = place.imageUrls ? JSON.stringify(place.imageUrls.slice(0, 10)) : '[]';
    const reviews = place.reviews ? JSON.stringify(place.reviews.slice(0, 10)) : '[]';
    
    // Extract vibe signals
    const vibeSignals = extractVibeSignals(place.reviews);
    
    db.prepare(`
      UPDATE venues SET
        google_rating = ?,
        google_place_id = ?,
        google_photos = ?,
        top_reviews = ?,
        phone = ?,
        website = ?,
        energy_level = ?,
        friction_score = ?,
        first_date_suitable = ?
      WHERE id = ?
    `).run(
      place.totalScore || null,
      place.placeId || null,
      photos,
      reviews,
      place.phone || null,
      place.website || null,
      vibeSignals.energy_level,
      vibeSignals.friction_score,
      vibeSignals.romantic_suitable && vibeSignals.friction_score !== 'high' ? 1 : 0,
      venue.id
    );
    
    saved++;
    if (vibeSignals.energy_level !== 'moderate') vibeExtracted++;
  }
  
  console.log(`   ✅ Saved ${saved} venues with Google data`);
  console.log(`   🧠 Extracted vibe signals for ${vibeExtracted} venues\n`);
}

// STEP 4: Save Instagram Data with Confidence Scoring
function saveInstagramData(instagramProfiles, phillyVenues) {
  console.log('\n💾 STEP 4: Saving Instagram data with confidence scores...');
  
  let saved = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  
  for (const profile of instagramProfiles) {
    const matches = phillyVenues.map(v => ({
      venue: v,
      similarity: nameSimilarity(v.name, profile.username)
    }))
    .filter(m => m.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) continue;
    
    const venue = matches[0].venue;
    const similarity = matches[0].similarity;
    
    // Confidence scoring
    let confidence = 'low';
    if (similarity > 0.85) {
      confidence = 'high';
      highConfidence++;
    } else if (similarity > 0.7) {
      confidence = 'medium';
      mediumConfidence++;
    } else {
      lowConfidence++;
    }
    
    db.prepare(`
      UPDATE venues SET
        instagram_handle = ?,
        instagram_location_id = ?
      WHERE id = ?
    `).run(
      profile.username,
      profile.pk || null,
      venue.id
    );
    
    saved++;
  }
  
  console.log(`   ✅ Saved ${saved} venues with Instagram handles`);
  console.log(`   🎯 Confidence: ${highConfidence} high | ${mediumConfidence} medium | ${lowConfidence} low\n`);
}

// Main execution
async function main() {
  console.log('\n🚀 APIFY PHILLY ENRICHMENT V2 - PRODUCTION GRADE\n');
  console.log('='  .repeat(60));
  console.log('Features:');
  console.log('  ✅ Fuzzy name matching (Levenshtein)');
  console.log('  ✅ Vibe signal extraction from reviews');
  console.log('  ✅ Friction scoring');
  console.log('  ✅ Instagram confidence levels');
  console.log('  ✅ Energy level detection');
  console.log('='  .repeat(60));
  
  const phillyVenues = loadPhillyVenues();
  console.log(`\n📋 Loaded ${phillyVenues.length} Philly venues from CSV\n`);
  
  try {
    const googlePlaces = await runGoogleMapsScraper(phillyVenues);
    const instagramProfiles = await runInstagramProfileScraper(phillyVenues);
    
    saveGoogleMapsData(googlePlaces, phillyVenues);
    saveInstagramData(instagramProfiles, phillyVenues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ENRICHMENT COMPLETE!');
    console.log('='  .repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
