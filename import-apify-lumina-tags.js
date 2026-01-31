/**
 * IMPORT APIFY VENUES WITH LUMINA TAG SYSTEM
 * 
 * This script:
 * 1. Loads venues from Apify JSON files
 * 2. Checks for duplicates (by name, address, or place_id)
 * 3. Only imports NEW venues
 * 4. Filters to NJ/NY only
 * 5. Classifies by category (dining/nightlife/lounge)
 * 6. Uses Apify description + Yelp data
 * 7. Tags with LUMINA's specific tag system
 * 8. Generates AI bios
 */

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ 
  apiKey: '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'
});
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';

console.log('🚀 APIFY VENUE IMPORT WITH LUMINA TAG SYSTEM\n');

// ═══════════════════════════════════════════
// STEP 1: LOAD APIFY DATA
// ═══════════════════════════════════════════
console.log('STEP 1: Loading Apify venues...');

const file1 = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/apify_venues_1.json', 'utf8'));
const file2 = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/apify_venues_2.json', 'utf8'));
const allApifyVenues = [...file1, ...file2];

console.log(`Loaded ${allApifyVenues.length} venues from Apify\n`);

// ═══════════════════════════════════════════
// STEP 2: FILTER TO NJ/NY ONLY
// ═══════════════════════════════════════════
console.log('STEP 2: Filtering to NJ/NY only...');

const njnyVenues = allApifyVenues.filter(v => {
  const state = (v.state || '').toLowerCase();
  const city = (v.city || '').toLowerCase();
  return state.includes('new york') || state.includes('new jersey') || 
         state === 'ny' || state === 'nj' ||
         city.includes('new york') || city.includes('brooklyn') || 
         city.includes('manhattan') || city.includes('newark') ||
         city.includes('jersey city') || city.includes('hoboken');
});

console.log(`Filtered to ${njnyVenues.length} NJ/NY venues\n`);

// ═══════════════════════════════════════════
// STEP 3: CHECK FOR DUPLICATES
// ═══════════════════════════════════════════
console.log('STEP 3: Checking for duplicates...');

const checkDuplicate = db.prepare(`
  SELECT id FROM venues 
  WHERE name = ? OR address = ? OR google_place_id = ?
  LIMIT 1
`);

const newVenues = [];
const duplicates = [];

njnyVenues.forEach(v => {
  const existing = checkDuplicate.get(v.title, v.address, v.placeId);
  if (existing) {
    duplicates.push(v.title);
  } else {
    newVenues.push(v);
  }
});

console.log(`Found ${newVenues.length} NEW venues`);
console.log(`Skipped ${duplicates.length} duplicates\n`);

if (newVenues.length === 0) {
  console.log('No new venues to import!');
  db.close();
  process.exit(0);
}

// ═══════════════════════════════════════════
// STEP 4: CLASSIFY CATEGORIES
// ═══════════════════════════════════════════
console.log('STEP 4: Classifying categories...');

function classifyCategory(venue) {
  const cat = (venue.categoryName || '').toLowerCase();
  const title = (venue.title || '').toLowerCase();
  const desc = (venue.description || '').toLowerCase();
  
  // Nightlife/Club
  if (cat.includes('night club') || cat.includes('nightclub') || 
      cat.includes('dance club') || desc.includes('nightclub') ||
      title.includes('nightclub') || title.includes(' club')) {
    return 'nightlife';
  }
  
  // Lounge/Bar
  if (cat.includes('lounge') || cat.includes('cocktail bar') || 
      cat.includes('wine bar') || cat.includes('rooftop bar') ||
      title.includes('lounge') || desc.includes('lounge')) {
    return 'lounge';
  }
  
  // Bar (standalone)
  if ((cat.includes('bar') || cat.includes('pub')) && !cat.includes('restaurant')) {
    return 'lounge';
  }
  
  // Dining (default for restaurants)
  return 'dining';
}

newVenues.forEach(v => {
  v.category = classifyCategory(v);
});

const diningCount = newVenues.filter(v => v.category === 'dining').length;
const nightlifeCount = newVenues.filter(v => v.category === 'nightlife').length;
const loungeCount = newVenues.filter(v => v.category === 'lounge').length;

console.log(`Classified: ${diningCount} dining, ${nightlifeCount} nightlife, ${loungeCount} lounge\n`);

// ═══════════════════════════════════════════
// STEP 5: INSERT INTO DATABASE
// ═══════════════════════════════════════════
console.log('STEP 5: Inserting venues into database...');

const insertStmt = db.prepare(`
  INSERT INTO venues (
    name, address, city, state, neighborhood, category,
    google_place_id, google_rating, phone, website,
    should_exclude
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`);

const insertedIds = [];

newVenues.forEach(v => {
  try {
    const result = insertStmt.run(
      v.title,
      v.address,
      v.city,
      v.state || 'NY',
      v.neighborhood || '',
      v.category,
      v.placeId,
      v.totalScore || null,
      v.phone,
      v.website
    );
    insertedIds.push(result.lastInsertRowid);
  } catch (err) {
    console.log(`  ⚠️  Failed to insert ${v.title}: ${err.message}`);
  }
});

console.log(`✅ Inserted ${insertedIds.length} venues\n`);

// ═══════════════════════════════════════════
// STEP 6: ENHANCE WITH YELP + CLAUDE AI
// ═══════════════════════════════════════════
console.log('STEP 6: Enhancing venues with LUMINA tags...\n');

const updateStmt = db.prepare(`
  UPDATE venues SET
    neighborhood = COALESCE(?, neighborhood),
    cuisine = ?,
    google_rating = COALESCE(?, google_rating),
    yelp_id = ?,
    yelp_rating = ?,
    yelp_review_count = ?,
    vibe_tags = ?,
    music_genres = ?,
    ideal_for = ?,
    special_features = ?,
    professional_photo_url = ?,
    bio = ?
  WHERE id = ?
`);

let enhanced = 0;

for (let i = 0; i < insertedIds.length; i++) {
  const venueId = insertedIds[i];
  const apifyVenue = newVenues[i];
  
  console.log(`[${i + 1}/${insertedIds.length}] ${apifyVenue.title}`);
  
  try {
    let neighborhood = apifyVenue.neighborhood;
    let cuisine = '';
    let googleRating = apifyVenue.totalScore;
    let yelpId = null;
    let yelpRating = null;
    let yelpReviewCount = null;
    let photos = [];
    
    // Get Yelp data
    console.log('  🔍 Yelp...');
    try {
      const yelpSearch = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(apifyVenue.title)}&location=${encodeURIComponent(apifyVenue.address)}`,
        { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } }
      );
      
      if (yelpSearch.ok) {
        const yelpData = await yelpSearch.json();
        if (yelpData.businesses && yelpData.businesses.length > 0) {
          const business = yelpData.businesses[0];
          yelpId = business.id;
          yelpRating = business.rating;
          yelpReviewCount = business.review_count;
          if (business.image_url) photos.push(business.image_url);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.log(`    ⚠️  Yelp: ${err.message}`);
    }
    
    console.log(`    ✅ ${yelpRating || 'N/A'}⭐ (${yelpReviewCount || 0} reviews)`);
    
    // ═══════════════════════════════════════════
    // CLAUDE AI ANALYSIS - USING APIFY DESCRIPTION
    // ═══════════════════════════════════════════
    console.log(`  🤖 Claude analyzing with Lumina tags...`);
    
    const hasDescription = apifyVenue.description && apifyVenue.description.length > 10;
    
    if (hasDescription) {
      const contextText = `Venue: ${apifyVenue.title}
Category: ${apifyVenue.categoryName}
Description: ${apifyVenue.description}
Location: ${apifyVenue.neighborhood || apifyVenue.city}`;
      
      const analysisPrompt = `Analyze this venue and extract tags using LUMINA's exact tag system.

${contextText}

CRITICAL INSTRUCTIONS:
- Use ONLY the exact tags listed below
- Select ALL applicable tags
- NEVER say "I don't have information"
- Make educated guesses based on category and description
- Be comprehensive - nightlife venues can have multiple music genres

Respond in EXACT format (one per line):

CUISINE: [comma-separated from: Mexican, Italian, American, Japanese, Chinese, Caribbean, Soul Food, Mediterranean, French, Indian, Thai, Korean, Latin, African, Seafood, Steakhouse, BBQ, Fusion, Contemporary, New American]

VIBE: [comma-separated from: upscale, casual, trendy, romantic, intimate, lively, chill, rooftop, speakeasy, hookah, dive-bar, sports-bar, elegant, cozy, loud, quiet, afterclub, latenight, pregame]

MUSIC: [comma-separated from: plays-hiphop, plays-afrobeat, plays-latin, plays-rnb, plays-reggae, plays-house, plays-amapiano, plays-dancehall, plays-jazz, plays-electronic, live-music, dj, OR "none"]

BEST_FOR: [comma-separated from: date, date-night, solo, solo-dining, friends, group, business-lunch, business-dinner, celebration, brunch, late-night, late-night-eats, nightlife, pregame, afterclub]

FEATURES: [comma-separated from: outdoor-seating, rooftop, happy-hour, byob, hookah, live-music, dj, dancing, pool-table, full-bar, craft-cocktails, wine-list, private-rooms, reservations-recommended, tableside-service, valet-parking]`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: analysisPrompt }]
        });
        
        const response = message.content[0].text;
        const lines = response.split('\n');
        
        let vibeTags = [];
        let musicGenres = [];
        let idealFor = [];
        let specialFeatures = [];
        
        lines.forEach(line => {
          if (line.startsWith('CUISINE:')) {
            const extracted = line.replace('CUISINE:', '').trim();
            if (extracted && !extracted.toLowerCase().includes("don't have")) {
              cuisine = extracted;
            }
          } else if (line.startsWith('VIBE:')) {
            vibeTags = line.replace('VIBE:', '').trim().split(',').map(t => t.trim()).filter(t => t);
          } else if (line.startsWith('MUSIC:')) {
            const music = line.replace('MUSIC:', '').trim();
            if (music && music !== 'none') {
              musicGenres = music.split(',').map(t => t.trim()).filter(t => t);
            }
          } else if (line.startsWith('BEST_FOR:')) {
            idealFor = line.replace('BEST_FOR:', '').trim().split(',').map(t => t.trim()).filter(t => t);
          } else if (line.startsWith('FEATURES:')) {
            specialFeatures = line.replace('FEATURES:', '').trim().split(',').map(t => t.trim()).filter(t => t);
          }
        });
        
        console.log(`    📝 Cuisine: ${cuisine || 'N/A'}`);
        console.log(`    ✨ Vibe: ${vibeTags.join(', ') || 'N/A'}`);
        console.log(`    🎵 Music: ${musicGenres.join(', ') || 'none'}`);
        console.log(`    👥 Best for: ${idealFor.join(', ') || 'N/A'}`);
        console.log(`    ⭐ Features: ${specialFeatures.join(', ') || 'N/A'}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.log(`    ❌ Claude tagging: ${err.message}`);
      }
      
      // ═══════════════════════════════════════════
      // GENERATE BIO
      // ═══════════════════════════════════════════
      console.log(`  ✍️  Generating bio...`);
      
      const bioPrompt = `Create a brief, engaging 1-2 sentence bio for ${apifyVenue.title}.

Context:
- Category: ${apifyVenue.categoryName}
- Description: ${apifyVenue.description}
- Cuisine: ${cuisine || apifyVenue.categoryName}
- Vibe: ${vibeTags.join(', ') || 'casual'}
- Music: ${musicGenres.join(', ') || 'none'}
- Location: ${apifyVenue.neighborhood || apifyVenue.city}

Write a captivating bio that highlights what makes this venue special. Be concise, vivid, and enticing. Do NOT use phrases like "This venue" or "Located in". Start directly with what makes it unique.

Examples:
"Upscale steakhouse serving prime Argentine cuts in an elegant candlelit space perfect for romantic date nights."
"Afrobeats beats pulse through this intimate lounge where craft cocktails meet Caribbean flavors."
"Laid-back rooftop bar with stunning skyline views, creative cocktails, and a DJ spinning house music until 2am."`;

      let bio = '';
      try {
        const bioMessage = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{ role: "user", content: bioPrompt }]
        });
        bio = bioMessage.content[0].text.trim().replace(/^["']|["']$/g, '');
        console.log(`    ✅ ${bio.substring(0, 70)}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.log(`    ❌ Bio generation: ${err.message}`);
      }
      
      // Update database
      updateStmt.run(
        neighborhood,
        cuisine,
        googleRating,
        yelpId,
        yelpRating,
        yelpReviewCount,
        vibeTags.join(','),
        musicGenres.join(','),
        idealFor.join(','),
        specialFeatures.join(','),
        photos[0] || null,
        bio,
        venueId
      );
      
      enhanced++;
      
    } else {
      console.log(`    ⚠️  No description available - skipping enhancement`);
    }
    
  } catch (error) {
    console.log(`  ❌ ${error.message}`);
  }
  
  if ((i + 1) % 10 === 0) {
    console.log(`\n━━━ Progress: ${i + 1}/${insertedIds.length} ━━━\n`);
  }
}

console.log('\n━━━ IMPORT COMPLETE ━━━');
console.log(`✅ Imported: ${insertedIds.length} new venues`);
console.log(`✅ Enhanced: ${enhanced} venues with Lumina tags`);
console.log(`⏭️  Skipped: ${duplicates.length} duplicates\n`);

const finalStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 END) as with_bios,
    COUNT(CASE WHEN vibe_tags IS NOT NULL AND vibe_tags != '' THEN 1 END) as with_tags
  FROM venues
  WHERE should_exclude = 0
`).get();

console.log(`📊 DATABASE TOTALS:`);
console.log(`   Total Active Venues: ${finalStats.total}`);
console.log(`   With Bios: ${finalStats.with_bios}`);
console.log(`   With Tags: ${finalStats.with_tags}\n`);

db.close();
