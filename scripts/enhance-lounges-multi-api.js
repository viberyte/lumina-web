/**
 * MULTI-API LOUNGE ENHANCEMENT
 * Uses Google Places + Yelp + OpenAI for music genre detection
 */
import Database from 'better-sqlite3';
import OpenAI from 'openai';
import { Client } from '@googlemaps/google-maps-services-js';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/lumina.db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googlePlaces = new Client({});

const YELP_API_KEY = process.env.YELP_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const db = new Database(DB_PATH);

async function getGoogleReviews(venue) {
  try {
    if (!venue.google_place_id) return [];
    
    const response = await googlePlaces.placeDetails({
      params: {
        place_id: venue.google_place_id,
        fields: ['reviews'],
        key: GOOGLE_API_KEY
      }
    });
    
    const reviews = response.data.result?.reviews || [];
    return reviews.slice(0, 5).map(r => r.text); // Top 5 reviews
  } catch (error) {
    console.log(`    Google Places error: ${error.message}`);
    return [];
  }
}

async function getYelpReviews(venue) {
  try {
    if (!venue.yelp_id) {
      // Search by name and location
      const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(venue.name)}&location=${encodeURIComponent(venue.city + ', ' + (venue.state || 'NY'))}&limit=1`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
      });
      
      const searchData = await searchResponse.json();
      if (!searchData.businesses || searchData.businesses.length === 0) return [];
      
      venue.yelp_id = searchData.businesses[0].id;
    }
    
    // Get reviews
    const reviewsUrl = `https://api.yelp.com/v3/businesses/${venue.yelp_id}/reviews?limit=5`;
    const reviewsResponse = await fetch(reviewsUrl, {
      headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
    });
    
    const reviewsData = await reviewsResponse.json();
    return reviewsData.reviews?.map(r => r.text) || [];
  } catch (error) {
    console.log(`    Yelp error: ${error.message}`);
    return [];
  }
}

async function enhanceWithAI(venue, googleReviews, yelpReviews) {
  try {
    const allReviews = [...googleReviews, ...yelpReviews].join('\n\n');
    
    const prompt = `You are analyzing a lounge/bar for music genre detection.

VENUE:
- Name: ${venue.name}
- Location: ${venue.city}, ${venue.neighborhood || ''}
- Category: ${venue.category}
- Current Description: ${venue.bio || venue.description || 'None'}
- Current Vibe Tags: ${venue.vibe_tags || 'None'}

CUSTOMER REVIEWS (${googleReviews.length + yelpReviews.length} total):
${allReviews || 'No reviews available'}

Based on the venue name, description, and ESPECIALLY the customer reviews, detect:
1. What music genres are played here? Look for mentions of: DJ, music type, vibe, atmosphere
2. Energy level of the venue
3. Best use cases

IMPORTANT: 
- Most NYC/NJ lounges play MULTIPLE genres (e.g., Hip-Hop + R&B + Afrobeats)
- If reviews mention "DJ" or "music" but don't specify genre, default to ["hip-hop", "r&b"]
- If it's a sports bar/casual bar with no music mentions, use ["none"]

Respond ONLY with valid JSON:
{
  "music_genres_normalized": ["hip-hop", "r&b", "afrobeats", "house", "latin", "jazz", "reggaeton", "open-format", "none"],
  "energy_level": "calm" | "moderate" | "lively" | "high",
  "lounge_type": "upscale" | "casual" | "hookah" | "rooftop" | "sports" | "cigar" | null,
  "first_date_suitable": true | false,
  "solo_friendly": true | false,
  "pregame_spot": true | false,
  "late_night_spot": true | false,
  "bio": "2-3 sentence compelling description based on reviews"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a nightlife intelligence expert analyzing real customer reviews. Respond ONLY with valid JSON. Most lounges play MULTIPLE music genres.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    const content = response.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
    
  } catch (error) {
    console.error(`    ✗ AI Error: ${error.message}`);
    return null;
  }
}

async function updateVenue(venueId, enhancement) {
  const stmt = db.prepare(`
    UPDATE venues SET
      music_genres_normalized = ?,
      energy_level = ?,
      lounge_type = ?,
      first_date_suitable = ?,
      solo_friendly = ?,
      pregame_spot = ?,
      late_night_spot = ?,
      bio = ?,
      last_enhanced = datetime('now'),
      enhancement_version = 'multi_api_v1'
    WHERE id = ?
  `);
  
  stmt.run(
    JSON.stringify(enhancement.music_genres_normalized),
    enhancement.energy_level,
    enhancement.lounge_type,
    enhancement.first_date_suitable ? 1 : 0,
    enhancement.solo_friendly ? 1 : 0,
    enhancement.pregame_spot ? 1 : 0,
    enhancement.late_night_spot ? 1 : 0,
    enhancement.bio,
    venueId
  );
}

async function main() {
  console.log('🎵 Multi-API Lounge Enhancement\n');
  console.log('Using: Google Places + Yelp + OpenAI\n');
  
  // Get unenhanced lounges/bars
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE (category LIKE '%lounge%' OR category LIKE '%bar%')
    AND (music_genres_normalized LIKE '%none%' OR music_genres_normalized IS NULL)
    LIMIT 35
  `).all();
  
  console.log(`Found ${venues.length} venues to enhance\n`);
  
  let processed = 0;
  let enhanced = 0;
  let errors = 0;
  
  for (const venue of venues) {
    console.log(`\n[${processed + 1}/${venues.length}] ${venue.name} (${venue.city})`);
    
    // Step 1: Get Google Reviews
    console.log('  → Fetching Google reviews...');
    const googleReviews = await getGoogleReviews(venue);
    console.log(`    Found ${googleReviews.length} Google reviews`);
    
    // Step 2: Get Yelp Reviews
    console.log('  → Fetching Yelp reviews...');
    const yelpReviews = await getYelpReviews(venue);
    console.log(`    Found ${yelpReviews.length} Yelp reviews`);
    
    // Step 3: Enhance with AI
    console.log('  → Analyzing with OpenAI...');
    const enhancement = await enhanceWithAI(venue, googleReviews, yelpReviews);
    
    if (enhancement) {
      updateVenue(venue.id, enhancement);
      console.log(`  ✓ Enhanced!`);
      console.log(`    Music: ${enhancement.music_genres_normalized.join(', ')}`);
      console.log(`    Energy: ${enhancement.energy_level}`);
      enhanced++;
    } else {
      console.log(`  ✗ Enhancement failed`);
      errors++;
    }
    
    processed++;
    
    // Rate limit: 2 seconds between requests
    if (processed < venues.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n\n📊 Enhancement Complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Enhanced: ${enhanced}`);
  console.log(`   Errors: ${errors}`);
  
  // Show updated stats
  const hipHopCount = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE (category LIKE '%lounge%' OR category LIKE '%bar%')
    AND music_genres_normalized LIKE '%hip-hop%'
  `).get();
  
  const remainingNone = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE (category LIKE '%lounge%' OR category LIKE '%bar%')
    AND music_genres_normalized LIKE '%none%'
  `).get();
  
  console.log(`\n📈 Updated Stats:`);
  console.log(`   Hip-Hop Lounges: ${hipHopCount.count}`);
  console.log(`   Still Unenhanced: ${remainingNone.count}`);
  
  db.close();
}

main().catch(console.error);
