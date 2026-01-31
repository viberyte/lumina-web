/**
 * LUMINA V2 - ULTIMATE ENHANCEMENT
 * =================================
 * OpenAI + Google + Yelp + 10-15 PHOTOS + Deep Comment Analysis
 * THIS IS THE COMPLETE MOAT
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@googlemaps/google-maps-services-js';
import yelp from 'yelp-fusion';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/lumina.db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleMaps = new Client({});
const yelpClient = yelp.client(process.env.YELP_API_KEY);

const NJ_REGIONS = {
  north: ['Hoboken', 'Jersey City', 'Newark', 'Weehawken', 'Union City', 'North Bergen', 'West New York', 'Edgewater', 'Fort Lee'],
  central: ['New Brunswick', 'Edison', 'Woodbridge', 'Perth Amboy', 'Piscataway', 'Somerset'],
  south: ['Camden', 'Cherry Hill', 'Trenton', 'Atlantic City', 'Vineland', 'Millville']
};

function getNJRegion(city) {
  if (!city) return null;
  for (const [region, cities] of Object.entries(NJ_REGIONS)) {
    if (cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) return region;
  }
  return null;
}

class UltimateEnhancer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { 
      processed: 0, enhanced: 0, errors: 0,
      googleSuccess: 0, yelpSuccess: 0,
      totalPhotos: 0, totalReviews: 0
    };
    this.batchSize = 3;
  }

  getGooglePhotoUrl(photoReference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  }

  async getGoogleData(venue) {
    try {
      if (!venue.google_place_id) {
        const search = await googleMaps.findPlaceFromText({
          params: {
            input: `${venue.name} ${venue.city || 'New York'}`,
            inputtype: 'textquery',
            fields: ['place_id'],
            key: process.env.GOOGLE_PLACES_API_KEY
          }
        });

        if (search.data.candidates?.length > 0) {
          venue.google_place_id = search.data.candidates[0].place_id;
          this.db.prepare('UPDATE venues SET google_place_id = ? WHERE id = ?')
            .run(venue.google_place_id, venue.id);
        } else return null;
      }

      const details = await googleMaps.placeDetails({
        params: {
          place_id: venue.google_place_id,
          fields: ['reviews', 'rating', 'user_ratings_total', 'price_level', 'photos'],
          key: process.env.GOOGLE_PLACES_API_KEY
        }
      });

      const result = details.data.result;
      this.stats.googleSuccess++;
      
      // Get up to 10 Google photos
      const googlePhotos = (result.photos || []).slice(0, 10).map(p => 
        this.getGooglePhotoUrl(p.photo_reference)
      );

      return {
        reviews: result.reviews || [],
        rating: result.rating,
        reviewCount: result.user_ratings_total,
        priceLevel: result.price_level,
        photos: googlePhotos
      };
    } catch (error) {
      return null;
    }
  }

  async getYelpData(venue) {
    try {
      let businessId = venue.yelp_id;
      
      if (!businessId) {
        const search = await yelpClient.search({
          term: venue.name,
          location: `${venue.city || 'New York'}, ${venue.state || 'NY'}`,
          limit: 1
        });
        
        if (search.jsonBody.businesses.length === 0) return null;
        
        businessId = search.jsonBody.businesses[0].id;
        this.db.prepare('UPDATE venues SET yelp_id = ? WHERE id = ?').run(businessId, venue.id);
      }
      
      const business = await yelpClient.business(businessId);
      const reviews = await yelpClient.reviews(businessId);
      
      this.stats.yelpSuccess++;
      
      // Yelp provides up to 3 photos in business endpoint, get them all
      return {
        rating: business.jsonBody.rating,
        reviewCount: business.jsonBody.review_count,
        priceLevel: business.jsonBody.price?.length || null,
        reviews: reviews.jsonBody.reviews || [],
        photos: business.jsonBody.photos || [],
        categories: business.jsonBody.categories || []
      };
    } catch (error) {
      return null;
    }
  }

  extractDeepInsights(googleData, yelpData) {
    const allReviews = [];
    
    // Combine reviews from both sources
    if (googleData?.reviews) {
      allReviews.push(...googleData.reviews.map(r => ({
        text: r.text,
        rating: r.rating,
        source: 'Google',
        author: r.author_name || 'Anonymous'
      })));
    }
    
    if (yelpData?.reviews) {
      allReviews.push(...yelpData.reviews.map(r => ({
        text: r.text,
        rating: r.rating,
        source: 'Yelp',
        author: r.user?.name || 'Anonymous'
      })));
    }
    
    // Sort by rating (highest first) and take top 20 for analysis
    const topReviews = allReviews
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20);
    
    this.stats.totalReviews += topReviews.length;
    
    return topReviews.map(r => 
      `[${r.source} ${r.rating}⭐] ${r.text}`
    ).join('\n\n').substring(0, 4000); // More review text for better analysis
  }

  combinePhotos(googleData, yelpData) {
    const allPhotos = [];
    
    if (googleData?.photos) allPhotos.push(...googleData.photos);
    if (yelpData?.photos) allPhotos.push(...yelpData.photos);
    
    // Return up to 15 unique photos
    const uniquePhotos = [...new Set(allPhotos)].slice(0, 15);
    this.stats.totalPhotos += uniquePhotos.length;
    
    return uniquePhotos;
  }

  async enhanceWithAI(venue, googleData, yelpData, reviews) {
    try {
      const njRegion = getNJRegion(venue.city);
      const avgRating = googleData?.rating && yelpData?.rating 
        ? ((googleData.rating + yelpData.rating) / 2).toFixed(1)
        : googleData?.rating || yelpData?.rating || 'N/A';

      const prompt = `You are LUMINA's intelligence engine analyzing REAL customer feedback to create an unbeatable competitive advantage.

VENUE: ${venue.name}
LOCATION: ${venue.city}, ${venue.state || 'NY'}${njRegion ? ` (North NJ - also serves NYC)` : ''}
CATEGORY: ${venue.category || 'Unknown'}
RATING: ${avgRating}/5 ⭐
${googleData ? `Google: ${googleData.rating}/5 (${googleData.reviewCount} reviews)` : ''}
${yelpData ? `Yelp: ${yelpData.rating}/5 (${yelpData.reviewCount} reviews)` : ''}

CUSTOMER REVIEWS (Top 20 from Google + Yelp):
${reviews}

MISSION: Extract DEEP intelligence from what customers ACTUALLY say. Focus on:
- What makes this place special vs competitors
- Who goes here and why
- Music/vibe/atmosphere from customer perspective
- Best times to visit based on experiences
- Insider tips customers mention
- What to order/try
- Red flags or things to know

RESPOND WITH VALID JSON ONLY:
{
  "cuisine_primary": "Italian|French|Japanese|Chinese|Mexican|Caribbean|African|American|Mediterranean|etc",
  "cuisine_secondary": "string or null",
  "cuisine_style": "upscale|casual|fast-casual",
  "cuisine_tags": ["pasta-focused", "seafood-heavy", "wine-focused", "cocktail-bar", "small-plates"],
  
  "primary_vibes": ["upscale", "trendy", "romantic", "casual", "lively", "chill", "energetic"],
  "secondary_vibes": ["instagram-worthy", "date-friendly", "hidden-gem", "celebrity-spot", "locals-only", "tourist-friendly"],
  
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
  "lounge_vibes": ["calm", "lively", "mixy", "chill"] or null,
  
  "music_genres_normalized": ["afrobeats", "hip-hop", "r&b", "house", "latin", "jazz", "live-band", "dj", "none"],
  "atmosphere_tags": ["intimate", "loud", "quiet", "energetic", "cozy", "spacious", "dimly-lit", "bright"],
  
  "bio": "Compelling 2-3 sentences based on what customers love most",
  "neighborhood_vibe": "What the neighborhood is like",
  "best_time_to_visit": "Based on customer experiences - when to go",
  "pro_tips": "Insider tips from reviews (reservations, dress code, what to order, secret menu)",
  "signature_items": "Dishes/drinks customers rave about",
  "what_to_know": "Important things (parking, wait times, noise level, dress code)"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a venue intelligence expert extracting competitive advantages from customer reviews. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1800
      });

      const content = response.choices[0].message.content.trim()
        .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(content);
    } catch (error) {
      console.error(`      ✗ AI Error: ${error.message}`);
      return null;
    }
  }

  async updateVenue(venueId, enhancement, photos, googleData, yelpData) {
    this.db.prepare(`
      UPDATE venues SET
        cuisine_primary = ?, cuisine_secondary = ?, cuisine_style = ?, cuisine_details = ?,
        primary_vibes = ?, secondary_vibes = ?,
        first_date_suitable = ?, anniversary_suitable = ?, girls_night_suitable = ?,
        guys_night_suitable = ?, solo_friendly = ?, large_group_suitable = ?,
        pregame_spot = ?, brunch_spot = ?, late_night_spot = ?,
        energy_level = ?, energy_progression = ?,
        lounge_type = ?, lounge_vibes = ?,
        music_genres_normalized = ?, atmosphere_tags = ?,
        bio = ?, neighborhood_vibe = ?, best_time_to_visit = ?,
        pro_tips = ?, signature_items = ?,
        google_photos = ?, professional_photos = ?,
        google_rating = ?, yelp_rating = ?,
        google_price_level = ?, yelp_price_level = ?,
        has_photo = ?,
        last_enhanced = ?, enhancement_version = 'v3_ultimate'
      WHERE id = ?
    `).run(
      enhancement.cuisine_primary, enhancement.cuisine_secondary, enhancement.cuisine_style,
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
      enhancement.signature_items,
      JSON.stringify(photos),
      photos[0] || null,  // First photo as professional_photo_url
      googleData?.rating,
      yelpData?.rating,
      googleData?.priceLevel,
      yelpData?.priceLevel,
      photos.length > 0 ? 1 : 0,
      new Date().toISOString(),
      venueId
    );
  }

  async run() {
    console.log('🔥 LUMINA V2 - ULTIMATE VENUE INTELLIGENCE SYSTEM');
    console.log('='.repeat(70));
    console.log('🎯 OpenAI + Google Places + Yelp + 10-15 Photos + Deep Reviews');
    console.log('🔒 THE UNBREAKABLE MOAT | 9 DAYS TO DOMINANCE');
    console.log('='.repeat(70) + '\n');

    const venues = this.db.prepare(`
      SELECT id, name, category, city, state, google_place_id, yelp_id
      FROM venues 
      WHERE should_exclude = 0
      ORDER BY RANDOM()
      LIMIT  670
    `).all();

    console.log(`📊 Processing ${venues.length} venues with ULTIMATE enhancement\n`);

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
          console.log(`   🔍 Google Places...`);
          const googleData = await this.getGoogleData(venue);
          if (googleData) {
            console.log(`   ✓ Google: ${googleData.rating}/5 (${googleData.reviewCount} reviews, ${googleData.photos.length} photos)`);
          }
          
          await new Promise(r => setTimeout(r, 500));
          
          // Get Yelp data
          console.log(`   🔍 Yelp Fusion...`);
          const yelpData = await this.getYelpData(venue);
          if (yelpData) {
            console.log(`   ✓ Yelp: ${yelpData.rating}/5 (${yelpData.reviewCount} reviews, ${yelpData.photos.length} photos)`);
          }
          
          if (googleData || yelpData) {
            // Combine photos (10-15 total)
            const photos = this.combinePhotos(googleData, yelpData);
            console.log(`   📸 Combined: ${photos.length} professional photos`);
            
            // Deep review analysis
            const reviews = this.extractDeepInsights(googleData, yelpData);
            console.log(`   💬 Analyzing reviews...`);
            
            // AI Enhancement
            const enhancement = await this.enhanceWithAI(venue, googleData, yelpData, reviews);
            
            if (enhancement) {
              await this.updateVenue(venue.id, enhancement, photos, googleData, yelpData);
              this.stats.enhanced++;
              
              console.log(`   ✓ ${enhancement.cuisine_primary} (${enhancement.cuisine_style})`);
              console.log(`   ✓ Vibes: ${enhancement.primary_vibes.slice(0, 3).join(', ')}`);
              console.log(`   🔒 Hidden: ${enhancement.secondary_vibes.slice(0, 2).join(', ')}`);
              console.log(`   ⚡ Energy: ${enhancement.energy_level}`);
              if (enhancement.signature_items) {
                console.log(`   🍽️  Must-try: ${enhancement.signature_items.substring(0, 50)}...`);
              }
            } else {
              this.stats.errors++;
            }
          }
          
          await new Promise(r => setTimeout(r, 2000));
          
        } catch (error) {
          this.stats.errors++;
          console.error(`   ✗ FAILED: ${error.message}`);
        }
      }
      
      if (i + this.batchSize < venues.length) {
        console.log('\n⏳ Cooling down 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    this.db.close();

    console.log('\n' + '='.repeat(70));
    console.log('🏆 ULTIMATE ENHANCEMENT COMPLETE');
    console.log('='.repeat(70));
    console.log(`✓ Processed: ${this.stats.processed}`);
    console.log(`✓ Enhanced: ${this.stats.enhanced}`);
    console.log(`✓ Google Success: ${this.stats.googleSuccess}`);
    console.log(`✓ Yelp Success: ${this.stats.yelpSuccess}`);
    console.log(`📸 Total Photos: ${this.stats.totalPhotos}`);
    console.log(`💬 Total Reviews Analyzed: ${this.stats.totalReviews}`);
    console.log(`✗ Errors: ${this.stats.errors}`);
    console.log('\n🔒 THE MOAT IS COMPLETE AND UNBREAKABLE');
    console.log('='.repeat(70) + '\n');
  }
}

new UltimateEnhancer().run().catch(console.error);
