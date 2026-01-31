/**
 * LUMINA V2 - COMPLETE VENUE ENHANCEMENT WITH REAL APIs
 * ======================================================
 * OpenAI + Google Places + Yelp Integration
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@googlemaps/google-maps-services-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/lumina.db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleMaps = new Client({});

const NJ_REGIONS = {
  north: ['Hoboken', 'Jersey City', 'Newark', 'Weehawken', 'Union City', 'North Bergen', 'West New York', 'Edgewater', 'Fort Lee'],
  central: ['New Brunswick', 'Edison', 'Woodbridge', 'Perth Amboy', 'Piscataway', 'Somerset'],
  south: ['Camden', 'Cherry Hill', 'Trenton', 'Atlantic City', 'Vineland', 'Millville']
};

function getNJRegion(city) {
  if (!city) return null;
  for (const [region, cities] of Object.entries(NJ_REGIONS)) {
    if (cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) {
      return region;
    }
  }
  return null;
}

function getSecondaryCities(city, state) {
  if (state !== 'NJ') return [];
  const region = getNJRegion(city);
  if (region === 'north') return ['New York'];
  if (region === 'south') return ['Philadelphia'];
  return [];
}

class CompleteVenueEnhancer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { 
      processed: 0, 
      enhanced: 0, 
      errors: 0, 
      skipped: 0,
      googleSuccess: 0,
      googleFailed: 0
    };
    this.batchSize = 3; // Slower for API calls
  }

  async getGooglePlaceDetails(venue) {
    try {
      if (!venue.google_place_id) {
        // Try to find place first
        const searchResponse = await googleMaps.findPlaceFromText({
          params: {
            input: `${venue.name} ${venue.city || 'New York'}`,
            inputtype: 'textquery',
            fields: ['place_id'],
            key: process.env.GOOGLE_PLACES_API_KEY
          }
        });

        if (searchResponse.data.candidates?.length > 0) {
          venue.google_place_id = searchResponse.data.candidates[0].place_id;
        } else {
          return null;
        }
      }

      // Get detailed info
      const detailsResponse = await googleMaps.placeDetails({
        params: {
          place_id: venue.google_place_id,
          fields: [
            'reviews',
            'rating',
            'user_ratings_total',
            'price_level',
            'opening_hours',
            'photos',
            'website',
            'formatted_phone_number',
            'types'
          ],
          key: process.env.GOOGLE_PLACES_API_KEY
        }
      });

      const details = detailsResponse.data.result;
      this.stats.googleSuccess++;

      return {
        reviews: details.reviews || [],
        rating: details.rating,
        reviewCount: details.user_ratings_total,
        priceLevel: details.price_level,
        hours: details.opening_hours,
        photos: details.photos || [],
        website: details.website,
        phone: details.formatted_phone_number,
        types: details.types || []
      };

    } catch (error) {
      console.error(`      🔴 Google API error: ${error.message}`);
      this.stats.googleFailed++;
      return null;
    }
  }

  extractReviewInsights(reviews) {
    if (!reviews || reviews.length === 0) return '';
    
    // Get top 10 reviews
    const topReviews = reviews
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map(r => r.text)
      .join('\n\n');
    
    return topReviews.substring(0, 2000); // Limit for GPT
  }

  async enhanceVenue(venue, googleData) {
    try {
      const njRegion = getNJRegion(venue.city);
      const secondaryCities = getSecondaryCities(venue.city, venue.state);
      
      const reviewInsights = googleData ? this.extractReviewInsights(googleData.reviews) : '';
      
      const prompt = `You are analyzing a venue for LUMINA - a premium nightlife concierge. This creates our SECRET COMPETITIVE MOAT.

VENUE INTEL:
- Name: ${venue.name}
- Location: ${venue.city}, ${venue.state || 'NY'}${njRegion ? ` (${njRegion.toUpperCase()} NJ)` : ''}
- Category: ${venue.category || 'Unknown'}
- Neighborhood: ${venue.neighborhood || 'Unknown'}
- Cuisine: ${venue.cuisine || 'N/A'}
- Price: ${venue.price_tier || venue.price_range || 'Unknown'}
${googleData ? `- Google Rating: ${googleData.rating}/5 (${googleData.reviewCount} reviews)` : ''}
${googleData?.priceLevel ? `- Price Level: ${'$'.repeat(googleData.priceLevel)}` : ''}

CUSTOMER REVIEWS:
${reviewInsights || 'No reviews available'}

MISSION: Create LAYERED intelligence (public + hidden competitive advantage).

RESPOND WITH VALID JSON ONLY:
{
  "cuisine_primary": "Italian|French|Japanese|Chinese|Mexican|Caribbean|African|American|Mediterranean|etc",
  "cuisine_secondary": "string|null",
  "cuisine_style": "upscale|casual|fast-casual",
  "cuisine_tags": ["pasta-focused", "seafood", "wine-heavy", "cocktails"],
  
  "primary_vibes": ["upscale", "trendy", "romantic", "casual", "lively"],
  "secondary_vibes": ["instagram-worthy", "date-friendly", "hidden-gem", "celebrity-spot"],
  
  "first_date_suitable": true|false,
  "anniversary_suitable": true|false,
  "girls_night_suitable": true|false,
  "guys_night_suitable": true|false,
  "solo_friendly": true|false,
  "large_group_suitable": true|false,
  "pregame_spot": true|false,
  "brunch_spot": true|false,
  "late_night_spot": true|false,
  
  "energy_level": "calm|moderate|lively|high",
  "energy_progression": ["can_wind_down", "can_turn_up", "steady_energy"],
  
  "lounge_type": "upscale|casual|hookah|rooftop|sports|cigar|null",
  "lounge_vibes": ["calm", "lively", "mixy", "chill"]|null,
  
  "music_genres_normalized": ["afrobeats", "hip-hop", "r&b", "house", "latin", "jazz"],
  "atmosphere_tags": ["intimate", "loud", "quiet", "energetic", "cozy"],
  
  "bio": "Compelling 2-3 sentence description from reviews",
  "neighborhood_vibe": "Brief neighborhood context",
  "best_time_to_visit": "When to go",
  "pro_tips": "Insider tips from reviews"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a nightlife intelligence expert. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1200
      });

      const content = response.choices[0].message.content.trim();
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanContent);
      
      return {
        ...result,
        google_rating: googleData?.rating || null,
        google_review_count: googleData?.reviewCount || null,
        google_price_level: googleData?.priceLevel || null,
        secondary_cities: secondaryCities.join(','),
        nj_region: njRegion
      };
      
    } catch (error) {
      console.error(`      ✗ Enhancement error: ${error.message}`);
      return null;
    }
  }

  async updateVenue(venueId, enhancement) {
    const stmt = this.db.prepare(`
      UPDATE venues SET
        cuisine_primary = ?,
        cuisine_secondary = ?,
        cuisine_style = ?,
        cuisine_details = ?,
        primary_vibes = ?,
        secondary_vibes = ?,
        first_date_suitable = ?,
        anniversary_suitable = ?,
        girls_night_suitable = ?,
        guys_night_suitable = ?,
        solo_friendly = ?,
        large_group_suitable = ?,
        pregame_spot = ?,
        brunch_spot = ?,
        late_night_spot = ?,
        energy_level = ?,
        energy_progression = ?,
        lounge_type = ?,
        lounge_vibes = ?,
        music_genres_normalized = ?,
        atmosphere_tags = ?,
        bio = ?,
        neighborhood_vibe = ?,
        best_time_to_visit = ?,
        pro_tips = ?,
        google_rating = ?,
        google_review_count = ?,
        google_price_level = ?,
        last_enhanced = ?,
        enhancement_version = 'v2_with_apis'
      WHERE id = ?
    `);
    
    stmt.run(
      enhancement.cuisine_primary,
      enhancement.cuisine_secondary,
      enhancement.cuisine_style,
      JSON.stringify(enhancement.cuisine_tags || []),
      JSON.stringify(enhancement.primary_vibes || []),
      JSON.stringify(enhancement.secondary_vibes || []),
      enhancement.first_date_suitable ? 1 : 0,
      enhancement.anniversary_suitable ? 1 : 0,
      enhancement.girls_night_suitable ? 1 : 0,
      enhancement.guys_night_suitable ? 1 : 0,
      enhancement.solo_friendly ? 1 : 0,
      enhancement.large_group_suitable ? 1 : 0,
      enhancement.pregame_spot ? 1 : 0,
      enhancement.brunch_spot ? 1 : 0,
      enhancement.late_night_spot ? 1 : 0,
      enhancement.energy_level,
      JSON.stringify(enhancement.energy_progression || []),
      enhancement.lounge_type,
      enhancement.lounge_vibes ? JSON.stringify(enhancement.lounge_vibes) : null,
      JSON.stringify(enhancement.music_genres_normalized || []),
      JSON.stringify(enhancement.atmosphere_tags || []),
      enhancement.bio,
      enhancement.neighborhood_vibe,
      enhancement.best_time_to_visit,
      enhancement.pro_tips,
      enhancement.google_rating,
      enhancement.google_review_count,
      enhancement.google_price_level,
      new Date().toISOString(),
      venueId
    );
  }

  async run() {
    console.log('🔥 LUMINA V2 - COMPLETE VENUE ENHANCEMENT WITH REAL APIs');
    console.log('='.repeat(70));
    console.log('🎯 OpenAI + Google Places | 9 DAYS TO DOMINANCE');
    console.log('='.repeat(70) + '\n');

    const venues = this.db.prepare(`
      SELECT id, name, category, neighborhood, city, state, cuisine, 
             music_genres, description, price_tier, price_range, 
             google_place_id, website
      FROM venues 
      WHERE should_exclude = 0
      ORDER BY RANDOM()
      LIMIT 100
    `).all();

    console.log(`📊 Processing ${venues.length} venues with REAL API data\n`);

    for (let i = 0; i < venues.length; i += this.batchSize) {
      const batch = venues.slice(i, i + this.batchSize);
      
      console.log(`\n📦 Batch ${Math.floor(i / this.batchSize) + 1} | ${i + 1}-${Math.min(i + this.batchSize, venues.length)}/${venues.length}`);
      console.log('='.repeat(70));
      
      for (const venue of batch) {
        this.stats.processed++;
        
        try {
          console.log(`\n🔄 ${venue.name}`);
          console.log(`   📍 ${venue.city || 'NYC'} | ${venue.category || 'Unknown'}`);
          
          // Get Google data
          console.log(`   🔍 Fetching Google Places data...`);
          const googleData = await this.getGooglePlaceDetails(venue);
          
          if (googleData) {
            console.log(`   ✓ Google: ${googleData.rating}/5 (${googleData.reviewCount} reviews)`);
            console.log(`   ✓ Found ${googleData.reviews.length} detailed reviews`);
          } else {
            console.log(`   ⊘ No Google data found`);
          }
          
          // Enhance with AI
          console.log(`   🤖 AI Enhancement...`);
          const enhancement = await this.enhanceVenue(venue, googleData);
          
          if (enhancement) {
            await this.updateVenue(venue.id, enhancement);
            this.stats.enhanced++;
            
            console.log(`   ✓ Cuisine: ${enhancement.cuisine_primary} (${enhancement.cuisine_style})`);
            console.log(`   ✓ Vibes: ${enhancement.primary_vibes.slice(0, 3).join(', ')}`);
            console.log(`   🔒 Hidden: ${enhancement.secondary_vibes.slice(0, 2).join(', ')}`);
            console.log(`   ⚡ Energy: ${enhancement.energy_level}`);
          } else {
            this.stats.errors++;
          }
          
          // Rate limiting
          await new Promise(r => setTimeout(r, 1500));
          
        } catch (error) {
          this.stats.errors++;
          console.error(`   ✗ FAILED: ${error.message}`);
        }
      }
      
      if (i + this.batchSize < venues.length) {
        console.log('\n⏳ Cooling down 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    this.db.close();

    console.log('\n' + '='.repeat(70));
    console.log('🏆 COMPLETE - REAL API INTEGRATION');
    console.log('='.repeat(70));
    console.log(`✓ Total: ${this.stats.processed}`);
    console.log(`✓ Enhanced: ${this.stats.enhanced}`);
    console.log(`✓ Google Success: ${this.stats.googleSuccess}`);
    console.log(`✗ Google Failed: ${this.stats.googleFailed}`);
    console.log(`✗ Errors: ${this.stats.errors}`);
    console.log('\n🔒 THE MOAT IS REAL');
    console.log('='.repeat(70) + '\n');
  }
}

if (!process.env.OPENAI_API_KEY || !process.env.GOOGLE_PLACES_API_KEY) {
  console.error('❌ Missing API keys');
  process.exit(1);
}

const enhancer = new CompleteVenueEnhancer();
enhancer.run().catch(console.error);
