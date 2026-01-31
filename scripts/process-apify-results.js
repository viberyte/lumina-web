import { ApifyClient } from 'apify-client';
import Database from 'better-sqlite3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db',
  CSV_PATH: '/opt/viberyte/lumina-web/philly-venues.csv',
  GOOGLE_RUN_ID: 'MoYavK6Tx4UFL3eE1',
  INSTAGRAM_RUN_ID: 'QScRiMYdHHCDfbtF2'
};

const client = new ApifyClient({ token: CONFIG.APIFY_TOKEN });
const db = new Database(CONFIG.DB_PATH);

const VIBE_KEYWORDS = {
  loud: ['loud', 'blasting', 'hard to talk', 'noisy', 'deafening'],
  chill: ['relaxed', 'laid-back', 'intimate', 'cozy', 'quiet', 'calm'],
  dressy: ['dress code', 'upscale', 'classy', 'elegant', 'formal'],
  line: ['line', 'waited', 'wait', 'doorman', 'bouncer', 'queue'],
  dancing: ['dance', 'dj', 'music', 'dancing', 'club'],
  romantic: ['romantic', 'date', 'intimate', 'candlelit', 'couples'],
  crowded: ['packed', 'crowded', 'busy', 'full']
};

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|bar|club|lounge|restaurant|nightclub)\b/g, '')
    .trim();
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
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

function nameSimilarity(name1, name2) {
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  const distance = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return 1 - (distance / maxLen);
}

function extractVibeSignals(reviews) {
  if (!reviews || reviews.length === 0) {
    return { energy_level: 'moderate', friction_score: 'low' };
  }
  
  const reviewText = reviews.map(r => r.text || '').join(' ').toLowerCase();
  const signals = { loud: 0, chill: 0, dressy: 0, line: 0, dancing: 0, romantic: 0, crowded: 0 };
  
  for (const [category, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      const matches = (reviewText.match(new RegExp(keyword, 'g')) || []).length;
      signals[category] += matches;
    }
  }
  
  const energy_level = 
    signals.loud > 2 || signals.dancing > 2 ? 'high' :
    signals.chill > 2 ? 'low' : 'moderate';
  
  const friction_score = 
    signals.line > 2 || signals.crowded > 3 ? 'high' :
    signals.line > 0 ? 'medium' : 'low';
  
  return { energy_level, friction_score };
}

function loadPhillyVenues() {
  const csv = fs.readFileSync(CONFIG.CSV_PATH, 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  return lines.filter(line => line.trim()).map(line => {
    const match = line.match(/^(\d+),"([^"]+)","([^"]+)",([^,]+),([^,]+)$/);
    if (!match) return null;
    return { id: match[1], name: match[2], address: match[3], city: match[4], state: match[5] };
  }).filter(Boolean);
}

async function main() {
  console.log('\n🔄 PROCESSING APIFY RESULTS...\n');
  
  const phillyVenues = loadPhillyVenues();
  console.log(`📋 Loaded ${phillyVenues.length} Philly venues\n`);
  
  // Get dataset IDs from runs
  console.log('🔍 Getting dataset IDs from runs...');
  const googleRun = await client.run(CONFIG.GOOGLE_RUN_ID).get();
  const instagramRun = await client.run(CONFIG.INSTAGRAM_RUN_ID).get();
  
  console.log(`   Google dataset: ${googleRun.defaultDatasetId}`);
  console.log(`   Instagram dataset: ${instagramRun.defaultDatasetId}\n`);
  
  // Download data
  console.log('📥 Downloading Google Maps data...');
  const { items: googlePlaces } = await client.dataset(googleRun.defaultDatasetId).listItems();
  console.log(`✅ Downloaded ${googlePlaces.length} places\n`);
  
  console.log('📥 Downloading Instagram data...');
  const { items: instagramProfiles } = await client.dataset(instagramRun.defaultDatasetId).listItems();
  console.log(`✅ Downloaded ${instagramProfiles.length} profiles\n`);
  
  // Save Google data
  console.log('💾 Saving Google Maps data with vibe intelligence...');
  let savedGoogle = 0;
  let vibeExtracted = 0;
  
  for (const place of googlePlaces) {
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
    const vibeSignals = extractVibeSignals(place.reviews);
    
    if (vibeSignals.energy_level !== 'moderate') vibeExtracted++;
    
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
      vibeSignals.friction_score !== 'high' ? 1 : 0,
      venue.id
    );
    
    savedGoogle++;
  }
  
  console.log(`✅ Saved ${savedGoogle} venues with Google data`);
  console.log(`🧠 Extracted vibe signals for ${vibeExtracted} venues\n`);
  
  // Save Instagram data
  console.log('💾 Saving Instagram data with confidence scoring...');
  let savedInstagram = 0;
  let highConf = 0, medConf = 0, lowConf = 0;
  
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
    
    if (similarity > 0.85) highConf++;
    else if (similarity > 0.7) medConf++;
    else lowConf++;
    
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
    
    savedInstagram++;
  }
  
  console.log(`✅ Saved ${savedInstagram} venues with Instagram data`);
  console.log(`🎯 Confidence: ${highConf} high | ${medConf} medium | ${lowConf} low\n`);
  
  console.log('='.repeat(60));
  console.log('✅ PROCESSING COMPLETE!');
  console.log(`   Google Maps: ${savedGoogle} venues enriched`);
  console.log(`   Instagram: ${savedInstagram} handles found`);
  console.log(`   Vibe signals: ${vibeExtracted} venues analyzed`);
  console.log('='.repeat(60) + '\n');
  
  db.close();
}

main().catch(console.error);
