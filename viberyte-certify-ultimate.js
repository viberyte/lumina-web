/**
 * VIBERYTE ULTIMATE CERTIFICATION SYSTEM
 * 
 * Uses ALL 4 APIs for maximum accuracy:
 * 1. YELP API - Reviews, ratings, photos, price level
 * 2. GOOGLE PLACES API - Additional reviews, ratings, photos, hours
 * 3. OPENAI VISION - Analyzes venue photos for quality/vibe
 * 4. CLAUDE AI - Final scoring + comprehensive tagging (5-12 tags)
 * 
 * Process:
 * - Gather data from Yelp + Google
 * - OpenAI looks at photos and assesses quality
 * - Claude synthesizes everything and scores 1-10
 * - Auto-certifies score ≥ 7
 * - Flags for removal score < 5
 */

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Client } from '@googlemaps/google-maps-services-js';
import fetch from 'node-fetch';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ 
  apiKey: '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'
});
const openai = new OpenAI({
  apiKey: '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'
});
const googleMaps = new Client({});
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';

console.log('🏆 VIBERYTE ULTIMATE CERTIFICATION SYSTEM');
console.log('   Using: Yelp + Google + OpenAI + Claude\n');

// Add certification columns
try {
  db.exec('ALTER TABLE venues ADD COLUMN viberyte_certified INTEGER DEFAULT 0;');
  db.exec('ALTER TABLE venues ADD COLUMN viberyte_score INTEGER DEFAULT 0;');
  db.exec('ALTER TABLE venues ADD COLUMN certification_reasoning TEXT;');
  console.log('✅ Added certification columns\n');
} catch (err) {
  console.log('ℹ️  Certification columns exist\n');
}

// Get all NJ/NY venues
const venues = db.prepare(`
  SELECT id, name, address, city, state, category, 
         google_place_id, google_rating, yelp_id, yelp_rating,
         vibe_tags, music_genres, cuisine
  FROM venues 
  WHERE should_exclude = 0 
    AND state IN ('NY', 'NJ', 'New York', 'New Jersey')
  ORDER BY id
`).all();

console.log(`Found ${venues.length} venues to certify\n`);

const updateStmt = db.prepare(`
  UPDATE venues SET
    yelp_id = ?,
    yelp_rating = ?,
    yelp_review_count = ?,
    yelp_price_level = ?,
    google_place_id = ?,
    google_rating = ?,
    vibe_tags = ?,
    music_genres = ?,
    cuisine = ?,
    ideal_for = ?,
    special_features = ?,
    viberyte_score = ?,
    viberyte_certified = ?,
    certification_reasoning = ?,
    should_exclude = ?
  WHERE id = ?
`);

let certified = 0;
let flagged = 0;

for (let i = 0; i < venues.length; i++) {
  const venue = venues[i];
  
  console.log(`\n━━━ [${i + 1}/${venues.length}] ${venue.name} - ${venue.city} ━━━`);
  
  try {
    // ═══════════════════════════════════════════
    // STEP 1: YELP API - Reviews, Rating, Photos
    // ═══════════════════════════════════════════
    console.log('  🔍 YELP API...');
    
    let yelpData = null;
    let yelpReviews = [];
    let yelpPhotos = [];
    
    try {
      const yelpSearch = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(venue.name)}&location=${encodeURIComponent(venue.address || `${venue.city}, ${venue.state}`)}`,
        { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } }
      );
      
      if (yelpSearch.ok) {
        const searchData = await yelpSearch.json();
        if (searchData.businesses && searchData.businesses.length > 0) {
          yelpData = searchData.businesses[0];
          
          if (yelpData.id) {
            // Get reviews
            await new Promise(resolve => setTimeout(resolve, 200));
            const reviewsRes = await fetch(
              `https://api.yelp.com/v3/businesses/${yelpData.id}/reviews`,
              { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } }
            );
            if (reviewsRes.ok) {
              const reviewsData = await reviewsRes.json();
              yelpReviews = reviewsData.reviews || [];
            }
            
            // Get photos
            if (yelpData.photos) {
              yelpPhotos = yelpData.photos;
            }
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.log(`    ⚠️  ${err.message}`);
    }
    
    const yelpRating = yelpData?.rating || venue.yelp_rating || 0;
    const yelpReviewCount = yelpData?.review_count || 0;
    const yelpPrice = yelpData?.price || null;
    
    console.log(`    ✅ ${yelpRating}⭐ (${yelpReviewCount} reviews) ${yelpPrice || ''}`);
    
    // ═══════════════════════════════════════════
    // STEP 2: GOOGLE PLACES API - Additional Data
    // ═══════════════════════════════════════════
    console.log('  🌐 GOOGLE PLACES API...');
    
    let googleData = null;
    let googlePhotos = [];
    let googleReviews = [];
    
    try {
      // Search for place
      const placeSearch = await googleMaps.findPlaceFromText({
        params: {
          input: `${venue.name} ${venue.city} ${venue.state}`,
          inputtype: 'textquery',
          fields: ['place_id', 'name', 'rating', 'user_ratings_total'],
          key: GOOGLE_API_KEY
        }
      });
      
      if (placeSearch.data.candidates && placeSearch.data.candidates.length > 0) {
        const placeId = placeSearch.data.candidates[0].place_id;
        
        // Get place details
        await new Promise(resolve => setTimeout(resolve, 200));
        const placeDetails = await googleMaps.placeDetails({
          params: {
            place_id: placeId,
            fields: ['rating', 'user_ratings_total', 'photos', 'reviews', 'price_level'],
            key: GOOGLE_API_KEY
          }
        });
        
        if (placeDetails.data.result) {
          googleData = placeDetails.data.result;
          googleReviews = googleData.reviews || [];
          googlePhotos = googleData.photos || [];
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.log(`    ⚠️  ${err.message}`);
    }
    
    const googleRating = googleData?.rating || venue.google_rating || 0;
    const googleReviewCount = googleData?.user_ratings_total || 0;
    const googlePrice = googleData?.price_level || null;
    
    console.log(`    ✅ ${googleRating}⭐ (${googleReviewCount} reviews) ${googlePrice ? '$'.repeat(googlePrice) : ''}`);
    
    // ═══════════════════════════════════════════
    // STEP 3: OPENAI VISION - Analyze Photos
    // ═══════════════════════════════════════════
    console.log('  👁️  OPENAI VISION analyzing photos...');
    
    let photoAnalysis = '';
    const photosToAnalyze = [...yelpPhotos.slice(0, 3), ...googlePhotos.slice(0, 2)];
    
    if (photosToAnalyze.length > 0) {
      try {
        const photoPrompt = `Analyze these venue photos and assess quality/vibe.

Rate the venue's VISUAL QUALITY on these factors:
1. AMBIANCE: Upscale/elegant vs casual/basic (1-10)
2. INTERIOR: Modern/stylish vs dated/plain (1-10)
3. PRESENTATION: Professional photos vs amateur snapshots (1-10)
4. VIBE: Trendy/hip vs generic/forgettable (1-10)

Respond in format:
AMBIANCE: [score]/10
INTERIOR: [score]/10
PRESENTATION: [score]/10
VIBE: [score]/10
OVERALL_IMPRESSION: [1-2 sentences]`;

        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: photoPrompt },
                ...photosToAnalyze.slice(0, 4).map(photo => ({
                  type: "image_url",
                  image_url: { url: typeof photo === 'string' ? photo : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}` }
                }))
              ]
            }
          ],
          max_tokens: 300
        });
        
        photoAnalysis = visionResponse.choices[0].message.content;
        console.log(`    ✅ Visual analysis complete`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.log(`    ⚠️  ${err.message}`);
      }
    } else {
      console.log(`    ⚠️  No photos available`);
    }
    
    // ═══════════════════════════════════════════
    // STEP 4: CLAUDE AI - Final Scoring + Tagging
    // ═══════════════════════════════════════════
    console.log('  🤖 CLAUDE final certification + tagging...');
    
    const allReviews = [
      ...yelpReviews.slice(0, 3).map(r => `Yelp (${r.rating}⭐): ${r.text}`),
      ...googleReviews.slice(0, 2).map(r => `Google (${r.rating}⭐): ${r.text}`)
    ].join('\n\n');
    
    const categories = yelpData?.categories?.map(c => c.title).join(', ') || venue.category;
    
    const certificationPrompt = `VIBERYTE CERTIFICATION - Analyze and score this venue.

VENUE: ${venue.name}
LOCATION: ${venue.city}, ${venue.state}
CATEGORY: ${categories}

━━━ DATA FROM 3 SOURCES ━━━

YELP: ${yelpRating}⭐ (${yelpReviewCount} reviews) ${yelpPrice || ''}
GOOGLE: ${googleRating}⭐ (${googleReviewCount} reviews) ${googlePrice ? '$'.repeat(googlePrice) : ''}

OPENAI PHOTO ANALYSIS:
${photoAnalysis || 'No photos analyzed'}

REVIEWS:
${allReviews || 'No reviews available'}

━━━ VIBERYTE CERTIFICATION CRITERIA ━━━

SCORE 1-10:
✅ CERTIFIED (7-10): Upscale, trendy, unique atmosphere, 4.0+ stars, good vibe
❌ REJECT (1-4): Generic takeout, strip mall, poor ambiance, < 3.5 stars
⚠️ BORDERLINE (5-6): Decent food but no special vibe

CRITICAL: Be STRICT. Only certify places with good atmosphere/vibe.

━━━ RESPONSE FORMAT ━━━

VIBERYTE_SCORE: [1-10]
REASONING: [2-3 sentences explaining score]

CUISINE: [comma-separated cuisines]
VIBE: [5-12 tags: upscale, casual, trendy, romantic, intimate, lively, chill, rooftop, speakeasy, elegant, cozy, loud, quiet, latenight, pregame, hip, modern, vibey]
MUSIC: [plays-hiphop, plays-afrobeat, plays-latin, plays-rnb, plays-reggae, plays-house, plays-jazz, live-music, dj, OR "none"]
BEST_FOR: [date-night, solo-dining, friends, group, business-lunch, celebration, brunch, late-night, nightlife, pregame]
FEATURES: [outdoor-seating, rooftop, happy-hour, hookah, live-music, dj, dancing, full-bar, craft-cocktails, private-rooms]`;

    let score = 0;
    let reasoning = '';
    let cuisine = '';
    let vibeTags = [];
    let musicGenres = [];
    let idealFor = [];
    let features = [];
    
    try {
      const claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{ role: "user", content: certificationPrompt }]
      });
      
      const response = claudeResponse.content[0].text;
      const lines = response.split('\n');
      
      lines.forEach(line => {
        if (line.startsWith('VIBERYTE_SCORE:')) {
          score = parseInt(line.replace('VIBERYTE_SCORE:', '').trim());
        } else if (line.startsWith('REASONING:')) {
          reasoning = line.replace('REASONING:', '').trim();
        } else if (line.startsWith('CUISINE:')) {
          cuisine = line.replace('CUISINE:', '').trim();
        } else if (line.startsWith('VIBE:')) {
          vibeTags = line.replace('VIBE:', '').trim().split(',').map(t => t.trim()).filter(t => t);
        } else if (line.startsWith('MUSIC:')) {
          const music = line.replace('MUSIC:', '').trim();
          if (music !== 'none') {
            musicGenres = music.split(',').map(t => t.trim()).filter(t => t);
          }
        } else if (line.startsWith('BEST_FOR:')) {
          idealFor = line.replace('BEST_FOR:', '').trim().split(',').map(t => t.trim()).filter(t => t);
        } else if (line.startsWith('FEATURES:')) {
          features = line.replace('FEATURES:', '').trim().split(',').map(t => t.trim()).filter(t => t);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.log(`    ❌ ${err.message}`);
      continue;
    }
    
    // Determine certification status
    const isCertified = score >= 7 ? 1 : 0;
    const shouldExclude = score < 5 ? 1 : 0;
    
    if (isCertified) {
      certified++;
      console.log(`    ✅ CERTIFIED - Score: ${score}/10`);
    } else if (shouldExclude) {
      flagged++;
      console.log(`    ❌ FLAGGED FOR REMOVAL - Score: ${score}/10`);
    } else {
      console.log(`    ⚠️  BORDERLINE - Score: ${score}/10`);
    }
    
    console.log(`    💭 ${reasoning}`);
    console.log(`    🏷️  Tags: ${vibeTags.length + musicGenres.length + idealFor.length + features.length} total`);
    
    // Update database
    updateStmt.run(
      yelpData?.id || venue.yelp_id,
      yelpRating,
      yelpReviewCount,
      yelpPrice ? yelpPrice.length : null,
      googleData?.place_id || venue.google_place_id,
      googleRating,
      vibeTags.join(','),
      musicGenres.join(','),
      cuisine,
      idealFor.join(','),
      features.join(','),
      score,
      isCertified,
      reasoning,
      shouldExclude,
      venue.id
    );
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  if ((i + 1) % 10 === 0) {
    console.log(`\n━━━ PROGRESS: ${i + 1}/${venues.length} | Certified: ${certified} | Flagged: ${flagged} ━━━\n`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('VIBERYTE CERTIFICATION COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ CERTIFIED: ${certified} venues (score ≥ 7)`);
console.log(`❌ FLAGGED FOR REMOVAL: ${flagged} venues (score < 5)`);
console.log(`⚠️  BORDERLINE: ${venues.length - certified - flagged} venues (score 5-6)\n`);

// Final stats
const finalStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN viberyte_certified = 1 THEN 1 END) as certified,
    COUNT(CASE WHEN should_exclude = 1 THEN 1 END) as excluded,
    COUNT(CASE WHEN viberyte_score BETWEEN 5 AND 6 THEN 1 END) as borderline
  FROM venues
  WHERE state IN ('NY', 'NJ')
`).get();

console.log('📊 FINAL DATABASE STATS:');
console.log(`   Total NJ/NY Venues: ${finalStats.total}`);
console.log(`   ✅ Viberyte Certified: ${finalStats.certified}`);
console.log(`   ❌ Excluded: ${finalStats.excluded}`);
console.log(`   ⚠️  Borderline (manual review): ${finalStats.borderline}\n`);

db.close();
