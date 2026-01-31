/**
 * VIBERYTE COMPLETE CERTIFICATION SYSTEM V2
 * 
 * New Features:
 * - Multiple professional photos (Yelp + Google)
 * - Dress code inference (Upscale/Smart Casual/Casual/No Dress Code)
 * - Booking links with UTM tracking
 * - Strict quality scoring (exclude <6)
 */

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Client } from '@googlemaps/google-maps-services-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

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

console.log('🏆 VIBERYTE CERTIFICATION V2');
console.log('   ✨ NEW: Multiple photos + Dress code');
console.log('   🔗 Booking links with UTM tracking');
console.log('   ❌ Exclude score < 6\n');

const venues = db.prepare(`
  SELECT id, name, address, city, state, category, website,
         google_place_id, google_rating, yelp_id, yelp_rating
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
    professional_photos = ?,
    dress_code = ?,
    vibe_tags = ?,
    music_genres = ?,
    cuisine = ?,
    ideal_for = ?,
    special_features = ?,
    opentable_url = ?,
    resy_url = ?,
    yelp_reservation_url = ?,
    booking_available = ?,
    viberyte_score = ?,
    viberyte_certified = ?,
    certification_reasoning = ?,
    should_exclude = ?
  WHERE id = ?
`);

// Function to scrape booking links
async function findBookingLinks(venue, yelpUrl, website) {
  let opentable = null;
  let resy = null;
  let yelpReservation = null;
  
  if (yelpUrl) {
    try {
      const yelpPage = await fetch(yelpUrl, { timeout: 5000 });
      const yelpHtml = await yelpPage.text();
      const $ = cheerio.load(yelpHtml);
      
      $('a').each((i, elem) => {
        const href = $(elem).attr('href') || '';
        const text = $(elem).text().toLowerCase();
        
        if (href.includes('opentable.com')) opentable = href;
        else if (href.includes('resy.com')) resy = href;
        else if (text.includes('reservation') && href.includes('yelp.com')) yelpReservation = href;
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {}
  }
  
  if (website && !opentable && !resy) {
    try {
      const sitePage = await fetch(website, { timeout: 5000 });
      const siteHtml = await sitePage.text();
      const $ = cheerio.load(siteHtml);
      
      $('a').each((i, elem) => {
        const href = $(elem).attr('href') || '';
        if (href.includes('opentable.com')) opentable = href;
        if (href.includes('resy.com')) resy = href;
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {}
  }
  
  const addUTM = (url) => {
    if (!url) return null;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=viberyte&utm_medium=referral&utm_campaign=${encodeURIComponent(venue.name)}`;
  };
  
  return {
    opentable: addUTM(opentable),
    resy: addUTM(resy),
    yelpReservation: addUTM(yelpReservation)
  };
}

let certified = 0;
let excluded = 0;

for (let i = 0; i < venues.length; i++) {
  const venue = venues[i];
  
  console.log(`\n━━━ [${i + 1}/${venues.length}] ${venue.name} - ${venue.city} ━━━`);
  
  try {
    // YELP API
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
            await new Promise(resolve => setTimeout(resolve, 200));
            const reviewsRes = await fetch(
              `https://api.yelp.com/v3/businesses/${yelpData.id}/reviews`,
              { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } }
            );
            if (reviewsRes.ok) {
              const reviewsData = await reviewsRes.json();
              yelpReviews = reviewsData.reviews || [];
            }
            
            // Collect ALL Yelp photos
            if (yelpData.photos) yelpPhotos = yelpData.photos;
            if (yelpData.image_url) yelpPhotos.unshift(yelpData.image_url);
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
    const yelpUrl = yelpData?.url || null;
    
    console.log(`    ✅ ${yelpRating}⭐ (${yelpReviewCount} reviews) ${yelpPrice || ''} | ${yelpPhotos.length} photos`);
    
    // GOOGLE PLACES API
    console.log('  🌐 GOOGLE PLACES API...');
    let googleData = null;
    let googlePhotos = [];
    let googleReviews = [];
    
    try {
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
    
    console.log(`    ✅ ${googleRating}⭐ (${googleReviewCount} reviews) ${googlePrice ? '$'.repeat(googlePrice) : ''} | ${googlePhotos.length} photos`);
    
    // Combine all photos (dedupe)
    const allPhotos = [...new Set([
      ...yelpPhotos.slice(0, 5),
      ...googlePhotos.slice(0, 5).map(p => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
      )
    ])];
    
    console.log(`    📸 Total professional photos: ${allPhotos.length}`);
    
    // OPENAI VISION
    console.log('  👁️  OPENAI VISION...');
    let photoAnalysis = '';
    
    if (allPhotos.length > 0) {
      try {
        const photoPrompt = `Analyze these venue photos. Rate 1-10:
AMBIANCE: Upscale vs basic
INTERIOR: Modern vs dated
PRESENTATION: Professional vs amateur
VIBE: Trendy vs forgettable

Format:
AMBIANCE: X/10
INTERIOR: X/10
PRESENTATION: X/10
VIBE: X/10
OVERALL: [1-2 sentences]`;

        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: photoPrompt },
              ...allPhotos.slice(0, 4).map(photo => ({
                type: "image_url",
                image_url: { url: photo }
              }))
            ]
          }],
          max_tokens: 300
        });
        
        photoAnalysis = visionResponse.choices[0].message.content;
        console.log(`    ✅ Visual analysis complete`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.log(`    ⚠️  ${err.message}`);
      }
    } else {
      console.log(`    ⚠️  No photos`);
    }
    
    // CLAUDE CERTIFICATION + DRESS CODE
    console.log('  🤖 CLAUDE certification + dress code...');
    
    const allReviews = [
      ...yelpReviews.slice(0, 3).map(r => `Yelp (${r.rating}⭐): ${r.text}`),
      ...googleReviews.slice(0, 2).map(r => `Google (${r.rating}⭐): ${r.text}`)
    ].join('\n\n');
    
    const categories = yelpData?.categories?.map(c => c.title).join(', ') || venue.category;
    
    const certificationPrompt = `VIBERYTE CERTIFICATION

VENUE: ${venue.name}
LOCATION: ${venue.city}, ${venue.state}
CATEGORY: ${categories}
YELP: ${yelpRating}⭐ (${yelpReviewCount} reviews) ${yelpPrice || ''}
GOOGLE: ${googleRating}⭐ (${googleReviewCount} reviews) ${googlePrice ? '$'.repeat(googlePrice) : ''}

PHOTOS ANALYSIS:
${photoAnalysis || 'No analysis'}

REVIEWS:
${allReviews || 'None'}

━━━ SCORING (BE HARSH) ━━━

Score 1-10:
✅ 8-10: Premium, upscale, unique vibe, 4.0+ stars
✅ 6-7: Good but not special
❌ <6: Mediocre, exclude

━━━ DRESS CODE ━━━

Based on price level, vibe, and reviews, assign ONE:
- "Upscale" - Dress to impress (fine dining, rooftop lounges, upscale clubs)
- "Smart Casual" - Nice but relaxed (trendy restaurants, cocktail bars)
- "Casual" - Come as you are (regular restaurants, dive bars)
- "No Dress Code" - Anything goes (fast casual, takeout spots)

━━━ RESPOND ━━━

VIBERYTE_SCORE: [1-10]
REASONING: [2 sentences]
DRESS_CODE: [Upscale/Smart Casual/Casual/No Dress Code]
CUISINE: [cuisines]
VIBE: [5-12 tags]
MUSIC: [genres or "none"]
BEST_FOR: [occasions]
FEATURES: [features]`;

    let score = 0;
    let reasoning = '';
    let dressCode = 'Casual';
    let cuisine = '';
    let vibeTags = [];
    let musicGenres = [];
    let idealFor = [];
    let features = [];
    
    try {
      const claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 700,
        messages: [{ role: "user", content: certificationPrompt }]
      });
      
      const response = claudeResponse.content[0].text;
      const lines = response.split('\n');
      
      lines.forEach(line => {
        if (line.startsWith('VIBERYTE_SCORE:')) score = parseInt(line.replace('VIBERYTE_SCORE:', '').trim());
        else if (line.startsWith('REASONING:')) reasoning = line.replace('REASONING:', '').trim();
        else if (line.startsWith('DRESS_CODE:')) dressCode = line.replace('DRESS_CODE:', '').trim();
        else if (line.startsWith('CUISINE:')) cuisine = line.replace('CUISINE:', '').trim();
        else if (line.startsWith('VIBE:')) vibeTags = line.replace('VIBE:', '').trim().split(',').map(t => t.trim()).filter(t => t);
        else if (line.startsWith('MUSIC:')) {
          const music = line.replace('MUSIC:', '').trim();
          if (music !== 'none') musicGenres = music.split(',').map(t => t.trim()).filter(t => t);
        }
        else if (line.startsWith('BEST_FOR:')) idealFor = line.replace('BEST_FOR:', '').trim().split(',').map(t => t.trim()).filter(t => t);
        else if (line.startsWith('FEATURES:')) features = line.replace('FEATURES:', '').trim().split(',').map(t => t.trim()).filter(t => t);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.log(`    ❌ ${err.message}`);
      continue;
    }
    
    // SCRAPE BOOKING LINKS
    console.log('  🔗 Scraping booking links...');
    const bookingLinks = await findBookingLinks(venue, yelpUrl, venue.website);
    const hasBooking = (bookingLinks.opentable || bookingLinks.resy || bookingLinks.yelpReservation) ? 1 : 0;
    
    if (hasBooking) {
      console.log(`    ✅ Found: ${bookingLinks.opentable ? 'OpenTable' : ''}${bookingLinks.resy ? ' Resy' : ''}${bookingLinks.yelpReservation ? ' Yelp' : ''}`);
    } else {
      console.log(`    ⚠️  No booking links`);
    }
    
    // DETERMINE STATUS
    const isCertified = score >= 8 ? 1 : 0;
    const shouldExclude = score < 6 ? 1 : 0;
    
    if (isCertified) {
      certified++;
      console.log(`    ✅ CERTIFIED - Score: ${score}/10 | Dress: ${dressCode}`);
    } else if (shouldExclude) {
      excluded++;
      console.log(`    ❌ EXCLUDED - Score: ${score}/10`);
    } else {
      console.log(`    ⚠️  GOOD (not certified) - Score: ${score}/10 | Dress: ${dressCode}`);
    }
    
    console.log(`    💭 ${reasoning}`);
    console.log(`    🏷️  Tags: ${vibeTags.length + musicGenres.length + idealFor.length + features.length}`);
    
    // UPDATE DATABASE
    updateStmt.run(
      yelpData?.id || venue.yelp_id,
      yelpRating,
      yelpReviewCount,
      yelpPrice ? yelpPrice.length : null,
      googleData?.place_id || venue.google_place_id,
      googleRating,
      JSON.stringify(allPhotos),
      dressCode,
      vibeTags.join(','),
      musicGenres.join(','),
      cuisine,
      idealFor.join(','),
      features.join(','),
      bookingLinks.opentable,
      bookingLinks.resy,
      bookingLinks.yelpReservation,
      hasBooking,
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
    console.log(`\n━━━ PROGRESS: ${i + 1}/${venues.length} | Certified: ${certified} | Excluded: ${excluded} ━━━\n`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CERTIFICATION COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ CERTIFIED (≥8): ${certified}`);
console.log(`❌ EXCLUDED (<6): ${excluded}\n`);

const finalStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN viberyte_certified = 1 THEN 1 END) as certified,
    COUNT(CASE WHEN should_exclude = 1 THEN 1 END) as excluded,
    COUNT(CASE WHEN booking_available = 1 THEN 1 END) as with_booking,
    COUNT(CASE WHEN professional_photos IS NOT NULL THEN 1 END) as with_photos
  FROM venues
  WHERE state IN ('NY', 'NJ')
`).get();

console.log('📊 FINAL STATS:');
console.log(`   Total: ${finalStats.total}`);
console.log(`   ✅ Certified: ${finalStats.certified}`);
console.log(`   ❌ Excluded: ${finalStats.excluded}`);
console.log(`   🔗 Booking Links: ${finalStats.with_booking}`);
console.log(`   📸 Professional Photos: ${finalStats.with_photos}\n`);

db.close();
