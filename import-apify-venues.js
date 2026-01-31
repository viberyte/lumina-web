/**
 * IMPORT APIFY VENUES WITH DUPLICATE CHECK & ENHANCEMENT
 * 
 * This script:
 * 1. Loads venues from Apify JSON files
 * 2. Checks for duplicates (by name, address, or place_id)
 * 3. Only imports NEW venues
 * 4. Filters to NJ/NY only
 * 5. Classifies by category (dining/nightlife/lounge)
 * 6. Runs full enhancement (Google/Yelp/Claude AI)
 * 7. Tags with cuisine, vibe, music
 * 8. Generates AI bios
 */

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@googlemaps/google-maps-services-js';
import fetch from 'node-fetch';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ 
  apiKey: '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'
});
const googleMaps = new Client({});
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';

console.log('🚀 APIFY VENUE IMPORT & ENHANCEMENT\n');

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
  
  // Nightlife
  if (cat.includes('night club') || cat.includes('nightclub') || 
      cat.includes('dance club') || cat.includes('club') ||
      title.includes('nightclub') || title.includes('club')) {
    return 'nightlife';
  }
  
  // Lounge
  if (cat.includes('lounge') || cat.includes('cocktail bar') || 
      cat.includes('wine bar') || title.includes('lounge')) {
    return 'lounge';
  }
  
  // Bar
  if (cat.includes('bar') && !cat.includes('restaurant')) {
    return 'lounge';
  }
  
  // Dining (default for restaurants)
  return 'dining';
}

newVenues.forEach(v => {
  v.category = classifyCategory(v);
});

console.log(`Classified: ${newVenues.filter(v => v.category === 'dining').length} dining, ${newVenues.filter(v => v.category === 'nightlife').length} nightlife, ${newVenues.filter(v => v.category === 'lounge').length} lounge\n`);

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
      v.website,
    );
    insertedIds.push(result.lastInsertRowid);
  } catch (err) {
    console.log(`  ⚠️  Failed to insert ${v.title}: ${err.message}`);
  }
});

console.log(`✅ Inserted ${insertedIds.length} venues\n`);

// ═══════════════════════════════════════════
// STEP 6: ENHANCE WITH GOOGLE/YELP/CLAUDE
// ═══════════════════════════════════════════
console.log('STEP 6: Enhancing venues with full data...\n');

const updateStmt = db.prepare(`
  UPDATE venues SET
    neighborhood = COALESCE(?, neighborhood),
    cuisine = COALESCE(?, cuisine),
    google_price_level = COALESCE(?, google_price_level),
    google_rating = COALESCE(?, google_rating),
    yelp_id = COALESCE(?, yelp_id),
    yelp_rating = COALESCE(?, yelp_rating),
    yelp_review_count = COALESCE(?, yelp_review_count),
    vibe_tags = ?,
    music_genres = ?,
    ideal_for = ?,
    special_features = ?,
    top_reviews = ?,
    professional_photo_url = COALESCE(?, professional_photo_url),
    hours_json = ?,
    has_hours = ?,
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
    let priceLevel = null;
    let googleRating = apifyVenue.totalScore;
    let yelpId = null;
    let yelpRating = null;
    let yelpReviewCount = null;
    let reviews = [];
    let photos = [];
    let hours = [];
    
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
    
    // Get Yelp reviews
    if (yelpId) {
      try {
        const reviewsRes = await fetch(
          `https://api.yelp.com/v3/businesses/${yelpId}/reviews`,
          { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } }
        );
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.reviews) {
            reviews.push(...reviewsData.reviews.map(r => ({
              source: 'yelp',
              text: r.text,
              rating: r.rating
            })));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log(`    ⚠️  Yelp reviews: ${err.message}`);
      }
    }
    
    console.log(`    ✅ ${yelpRating || 'N/A'}⭐ (${yelpReviewCount || 0} reviews)`);
    
    // Claude AI Analysis
    console.log(`  🤖 Claude analyzing...`);
    
    if (reviews.length >= 2) {
      const reviewText = reviews.slice(0, 8).map((r, idx) => 
        `Review ${idx + 1} (${r.rating}⭐): ${r.text}`
      ).join('\n\n');
      
      const analysisPrompt = `Analyze reviews for ${apifyVenue.title}, a ${apifyVenue.categoryName} in ${apifyVenue.city}.

CRITICAL INSTRUCTIONS:
- Extract cuisine, vibe, music, best_for, and features
- NEVER say "I don't have information"
- If uncertain, make educated guess based on category

Reviews:
${reviewText}

Respond in EXACT format (one per line):
CUISINE: [comma-separated cuisine types - REQUIRED]
VIBE: [upscale, casual, trendy, romantic, intimate, lively, chill, rooftop, elegant, cozy]
MUSIC: [plays-hiphop, plays-afrobeat, plays-latin, plays-rnb, live-music, dj, OR "none"]
BEST_FOR: [date, solo, friends, group, business-lunch, celebration, brunch, late-night]
FEATURES: [outdoor-seating, happy-hour, hookah, live-music, dj, dancing, full-bar, rooftop]`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
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
            vibeTags = line.replace('VIBE:', '').trim().split(',').map(t => t.trim());
          } else if (line.startsWith('MUSIC:')) {
            const music = line.replace('MUSIC:', '').trim();
            if (music !== 'none') {
              musicGenres = music.split(',').map(t => t.trim());
            }
          } else if (line.startsWith('BEST_FOR:')) {
            idealFor = line.replace('BEST_FOR:', '').trim().split(',').map(t => t.trim());
          } else if (line.startsWith('FEATURES:')) {
            specialFeatures = line.replace('FEATURES:', '').trim().split(',').map(t => t.trim());
          }
        });
        
        console.log(`    ✅ Cuisine: ${cuisine || 'N/A'}`);
        console.log(`    ✅ Vibe: ${vibeTags.join(', ') || 'N/A'}`);
        console.log(`    ✅ Music: ${musicGenres.join(', ') || 'none'}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.log(`    ❌ Claude: ${err.message}`);
      }
      
      // Generate bio
      console.log(`  ✍️  Generating bio...`);
      
      const bioPrompt = `Create a brief 1-2 sentence bio for ${apifyVenue.title}, a ${apifyVenue.categoryName} in ${apifyVenue.neighborhood || apifyVenue.city}.

Cuisine: ${cuisine || apifyVenue.categoryName}
Vibe: ${vibeTags.join(', ') || 'casual'}
Music: ${musicGenres.join(', ') || 'none'}

Write a captivating bio. Be concise and enticing. No phrases like "This venue" or "Located in".`;

      let bio = '';
      try {
        const bioMessage = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          messages: [{ role: "user", content: bioPrompt }]
        });
        bio = bioMessage.content[0].text.trim().replace(/^["']|["']$/g, '');
        console.log(`    ✅ ${bio.substring(0, 60)}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.log(`    ❌ Bio: ${err.message}`);
      }
      
      // Update database
      updateStmt.run(
        neighborhood,
        cuisine,
        priceLevel,
        googleRating,
        yelpId,
        yelpRating,
        yelpReviewCount,
        vibeTags.join(','),
        musicGenres.join(','),
        idealFor.join(','),
        specialFeatures.join(','),
        JSON.stringify(reviews.slice(0, 5)),
        photos[0] || null,
        null, // hours_json
        0,    // has_hours
        bio,
        venueId
      );
      
      enhanced++;
    } else {
      console.log(`    ⚠️  Not enough reviews (${reviews.length})`);
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
console.log(`✅ Enhanced: ${enhanced} venues with full data`);
console.log(`⏭️  Skipped: ${duplicates.length} duplicates\n`);

db.close();
