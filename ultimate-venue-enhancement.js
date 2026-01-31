/**
 * 🌟 ULTIMATE VENUE ENHANCEMENT SYSTEM
 * Complete rewrite using OpenAI GPT-4o-mini
 * 
 * Enhances ALL certified venues with:
 * ✅ Google Places - Neighborhoods & coordinates
 * ✅ Yelp - Reviews, ratings, photos
 * ✅ OpenAI - Complete intelligent tagging
 * ✅ Menu scraping - Automatic extraction
 */

import Database from 'better-sqlite3';
import { Client } from '@googlemaps/google-maps-services-js';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// === API CONFIGURATION ===
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';
const OPENAI_API_KEY = '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';
const googleMapsClient = new Client({});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

// === SETTINGS ===
const BATCH_SIZE = 50;
const AI_BATCH_SIZE = 5;
const PAUSE_BETWEEN_BATCHES = 3000;

console.log('\n' + '='.repeat(80));
console.log('🌟 ULTIMATE VENUE ENHANCEMENT SYSTEM');
console.log('='.repeat(80));
console.log('\n🔧 Configuration:');
console.log(`   AI Model: OpenAI GPT-4o-mini`);
console.log(`   Batch Size: ${BATCH_SIZE} venues`);
console.log(`   AI Batch: ${AI_BATCH_SIZE} venues per analysis`);
console.log(`   Target: CERTIFIED VENUES ONLY\n`);
console.log('🎯 Features:');
console.log('   ✅ Neighborhoods (Google Places)');
console.log('   ✅ Reviews & ratings (Yelp)');
console.log('   ✅ Comprehensive AI tagging:');
console.log('      • Mood tags (upscale, romantic, chill, trendy, vibrant)');
console.log('      • Context tags (date_night, friends, solo, business, groups)');
console.log('      • Cuisine (6 levels: primary → subtypes → dietary → meals → style → specialties)');
console.log('      • Music genres (R&B, Hip-Hop, Afrobeats, House, Jazz)');
console.log('      • Dress code (casual → smart casual → upscale → formal)');
console.log('      • Vibe intensity (1-10 energy scale)');
console.log('      • Signature items & pro tips');
console.log('   ✅ Menu scraping for restaurants\n');
console.log('⏱️  Estimated Time: 2-3 hours');
console.log('💰 Estimated Cost: ~$15-25');
console.log('='.repeat(80) + '\n');

function setupDatabase(db) {
  console.log('📋 Setting up database schema...\n');
  
  const newColumns = [
    'neighborhood TEXT',
    'standardized_category TEXT',
    'mood_tags TEXT',
    'context_tags TEXT',
    'best_for TEXT',
    'time_tags TEXT',
    'cuisine_primary TEXT',
    'cuisine_subtypes TEXT',
    'dietary_tags TEXT',
    'meal_types TEXT',
    'food_style_tags TEXT',
    'specialty_tags TEXT',
    'music_genres_normalized TEXT',
    'dress_code TEXT',
    'vibe_intensity INTEGER',
    'ambiance_notes TEXT',
    'signature_items TEXT',
    'best_time_to_visit TEXT',
    'pro_tips TEXT',
    'yelp_attributes TEXT',
    'yelp_photos_json TEXT',
    'place_types TEXT',
    'hours_json TEXT',
    'last_enhanced DATETIME',
    'enhancement_version TEXT'
  ];
  
  let added = 0;
  for (const column of newColumns) {
    try {
      db.prepare(`ALTER TABLE venues ADD COLUMN ${column}`).run();
      added++;
    } catch (e) {}
  }
  
  console.log(`   ✅ Database schema ready (${added} new columns)\n`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      category TEXT,
      item_name TEXT NOT NULL,
      description TEXT,
      price REAL,
      dietary_tags TEXT,
      is_signature BOOLEAN DEFAULT 0,
      is_popular BOOLEAN DEFAULT 0,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );
    
    CREATE TABLE IF NOT EXISTS venue_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER UNIQUE NOT NULL,
      has_menu BOOLEAN DEFAULT 0,
      menu_url TEXT,
      menu_source TEXT,
      total_items INTEGER DEFAULT 0,
      last_scraped DATETIME,
      scrape_status TEXT,
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );
  `);
  
  console.log('   ✅ Menu tables ready\n');
}

async function enhanceWithGooglePlaces(venue) {
  try {
    if (venue.latitude && venue.longitude) {
      const response = await googleMapsClient.reverseGeocode({
        params: {
          latlng: { lat: venue.latitude, lng: venue.longitude },
          key: GOOGLE_API_KEY,
          result_type: 'neighborhood|sublocality'
        }
      });
      
      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        
        for (const component of result.address_components) {
          if (component.types.includes('neighborhood')) {
            return { neighborhood: component.long_name };
          }
          if (component.types.includes('sublocality_level_1')) {
            return { neighborhood: component.long_name };
          }
        }
      }
    }
    
    if (venue.google_place_id) {
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: venue.google_place_id,
          key: GOOGLE_API_KEY,
          fields: ['address_component', 'geometry', 'opening_hours']
        }
      });
      
      if (response.data.result) {
        const result = response.data.result;
        
        for (const component of result.address_components) {
          if (component.types.includes('neighborhood')) {
            return {
              neighborhood: component.long_name,
              latitude: result.geometry?.location?.lat || venue.latitude,
              longitude: result.geometry?.location?.lng || venue.longitude
            };
          }
        }
      }
    }
    
  } catch (error) {}
  
  return { neighborhood: venue.city };
}

async function enhanceWithYelp(venue) {
  try {
    let yelpData = null;
    
    if (venue.yelp_id) {
      const response = await fetch(`https://api.yelp.com/v3/businesses/${venue.yelp_id}`, {
        headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
      });
      
      if (response.ok) {
        yelpData = await response.json();
      }
    } else {
      const searchParams = new URLSearchParams({
        term: venue.name,
        location: `${venue.city}, ${venue.state || 'NY'}`,
        limit: 1
      });
      
      const response = await fetch(`https://api.yelp.com/v3/businesses/search?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.businesses && data.businesses.length > 0) {
          yelpData = data.businesses[0];
        }
      }
    }
    
    if (yelpData) {
      const attributes = [];
      if (yelpData.transactions?.includes('pickup')) attributes.push('takeout');
      if (yelpData.transactions?.includes('delivery')) attributes.push('delivery');
      if (yelpData.transactions?.includes('restaurant_reservation')) attributes.push('reservations');
      
      return {
        yelp_id: yelpData.id,
        yelp_rating: yelpData.rating,
        yelp_review_count: yelpData.review_count,
        yelp_price: yelpData.price,
        yelp_categories: yelpData.categories?.map(c => c.title) || [],
        yelp_attributes: attributes,
        yelp_photos: yelpData.photos || []
      };
    }
    
  } catch (error) {}
  
  return null;
}

async function analyzeVenuesWithOpenAI(venues) {
  try {
    const venueDescriptions = venues.map((v, i) => {
      return `${i + 1}. ${v.name}
Location: ${v.neighborhood || v.city}, ${v.city}
Type: ${v.category || v.business_type || 'Unknown'}
Description: ${v.description || v.bio || 'N/A'}
Current Cuisine: ${v.cuisine || v.cuisine_types || 'Unknown'}
Current Music: ${v.music_genres || 'Unknown'}
Yelp Categories: ${v.yelp_categories?.join(', ') || 'N/A'}
Price: ${v.yelp_price || v.price_tier || 'N/A'}`;
    }).join('\n\n');
    
    const prompt = `You are analyzing nightlife and dining venues for a premium recommendation app. Provide COMPREHENSIVE tagging for each venue.

For EACH venue, analyze and provide:

**STANDARDIZED CATEGORY** (pick ONE):
dining, nightclub, lounge, bar, rooftop, cafe, cultural, attraction

**MOOD TAGS** (3-5 tags):
high_energy, chill, upscale, intimate, spacious, romantic, trendy, classic, edgy, vibrant, party, social, quiet, local, sophisticated, lively

**CONTEXT TAGS** (3-5 tags - best use cases):
date_night, friends, solo, business, groups, celebrations, casual_hangout, special_occasion

**TIME TAGS** (1-3 tags):
late_night, brunch, happy_hour, weekend, weekday, lunch, dinner

**CUISINE PRIMARY** (1-3 main cuisines if restaurant):
Italian, Mexican, Japanese, Chinese, American, French, Mediterranean, etc.

**CUISINE SUBTYPES** (specific styles if applicable):
Neapolitan Pizza, Sushi Bar, Tex-Mex, Ramen, BBQ, etc.

**DIETARY TAGS** (if applicable):
Vegan, Vegetarian, Vegan-Friendly, Gluten-Free, Halal, Kosher, etc.

**MEAL TYPES** (what meals served):
Breakfast, Brunch, Lunch, Dinner, Late-Night

**FOOD STYLE** (2-4 descriptors if restaurant):
Fine Dining, Casual Dining, Comfort Food, Street Food, Modern, Traditional

**SPECIALTY TAGS** (signature items/features):
Pizza, Sushi, Burgers, Cocktails, Wine Bar, Live Music, DJ, etc.

**MUSIC GENRES** (actual music played):
Afrobeats, Hip-Hop, R&B, Latin, Reggaeton, House, EDM, Jazz, Live Music, etc.

**DRESS CODE**:
casual, smart_casual, upscale, formal

**VIBE INTENSITY** (1-10 scale):
1-3 = quiet/relaxed, 4-6 = moderate energy, 7-10 = high energy/party

**AMBIANCE NOTES** (1-2 sentences):
Describe atmosphere, lighting, decor, overall feeling

**SIGNATURE ITEMS** (2-4 items if known):
What this place is known for

**BEST TIME TO VISIT**:
When to go for best experience

**PRO TIPS** (1-2 insider tips):
Helpful advice for first-timers

Venues:
${venueDescriptions}

Return ONLY a JSON array with ONE object per venue (in same order):
[
  {
    "standardized_category": "dining",
    "mood_tags": ["upscale", "romantic", "intimate"],
    "context_tags": ["date_night", "celebrations"],
    "time_tags": ["dinner", "weekend"],
    "cuisine_primary": ["Italian"],
    "cuisine_subtypes": ["Neapolitan Pizza"],
    "dietary_tags": ["Vegetarian-Friendly"],
    "meal_types": ["Dinner"],
    "food_style": ["Fine Dining"],
    "specialty_tags": ["Pizza", "Wine Bar"],
    "music_genres": ["Jazz"],
    "dress_code": "smart_casual",
    "vibe_intensity": 6,
    "ambiance_notes": "Elegant Italian trattoria with warm lighting and intimate seating.",
    "signature_items": ["Vodka Rigatoni", "Tiramisu"],
    "best_time_to_visit": "Dinner Thu-Sat, 7pm",
    "pro_tips": "Request corner booth for intimacy."
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000
    });
    
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in OpenAI response');
    }
    
    const analyses = JSON.parse(jsonMatch[0]);
    
    return venues.map((venue, i) => ({
      ...venue,
      ai_analysis: analyses[i] || null
    }));
    
  } catch (error) {
    console.error(`         ⚠️  OpenAI error: ${error.message}`);
    return venues.map(v => ({ ...v, ai_analysis: null }));
  }
}

async function scrapeMenuFromWebsite(venue) {
  if (!venue.website) return null;
  
  try {
    const baseUrl = new URL(venue.website).origin;
    let menuUrl = null;
    
    for (const path of ['/menu', '/food', '/our-menu', '/dinner-menu']) {
      try {
        const testUrl = baseUrl + path;
        const response = await fetch(testUrl, { method: 'HEAD', timeout: 5000 });
        if (response.ok) {
          menuUrl = testUrl;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!menuUrl) return null;
    
    const response = await fetch(menuUrl, { timeout: 10000 });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const menuItems = [];
    
    $('.menu-item, .dish, .food-item, [class*="menu"]').each((i, elem) => {
      const $elem = $(elem);
      const name = $elem.find('.name, .title, h3, h4, strong').first().text().trim();
      const priceText = $elem.find('.price, [class*="price"]').first().text().trim();
      const priceMatch = priceText.match(/\$?\s*(\d+(?:\.\d{2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      
      if (name && price) {
        menuItems.push({ name, price });
      }
    });
    
    return menuItems.length > 0 ? {
      items: menuItems,
      url: menuUrl,
      source: 'website'
    } : null;
    
  } catch (error) {
    return null;
  }
}

async function ultimateEnhancement() {
  const db = new Database(dbPath);
  
  setupDatabase(db);
  
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE viberyte_certified = 1
    AND (last_enhanced IS NULL OR last_enhanced < datetime('now', '-7 days'))
    ORDER BY viberyte_score DESC, name
  `).all();
  
  console.log(`🎯 Found ${venues.length} certified venues to enhance\n`);
  console.log('='.repeat(80) + '\n');
  
  if (venues.length === 0) {
    console.log('✅ All certified venues are already up to date!\n');
    db.close();
    return;
  }
  
  let processed = 0;
  let googleCalls = 0;
  let yelpCalls = 0;
  let openaiCalls = 0;
  let menusScraped = 0;
  let errors = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(venues.length / BATCH_SIZE);
    
    console.log(`📦 BATCH ${batchNum}/${totalBatches} (${batch.length} venues)`);
    console.log('─'.repeat(80));
    
    console.log(`\n   🌐 Step 1/4: Google Places (neighborhoods)...`);
    const googleEnhanced = [];
    for (const venue of batch) {
      try {
        const googleData = await enhanceWithGooglePlaces(venue);
        if (googleData) googleCalls++;
        googleEnhanced.push({ ...venue, ...googleData });
        await sleep(100);
      } catch (error) {
        googleEnhanced.push(venue);
        errors++;
      }
    }
    console.log(`      ✓ Complete (${googleEnhanced.length} venues)`);
    
    console.log(`\n   🔍 Step 2/4: Yelp API (reviews & ratings)...`);
    const yelpEnhanced = [];
    for (const venue of googleEnhanced) {
      try {
        const yelpData = await enhanceWithYelp(venue);
        if (yelpData) yelpCalls++;
        yelpEnhanced.push({ ...venue, ...yelpData });
        await sleep(100);
      } catch (error) {
        yelpEnhanced.push(venue);
        errors++;
      }
    }
    console.log(`      ✓ Complete (${yelpEnhanced.length} venues)`);
    
    console.log(`\n   🤖 Step 3/4: OpenAI GPT-4o-mini (AI tagging)...`);
    const aiEnhanced = [];
    for (let j = 0; j < yelpEnhanced.length; j += AI_BATCH_SIZE) {
      const aiBatch = yelpEnhanced.slice(j, j + AI_BATCH_SIZE);
      const analyzed = await analyzeVenuesWithOpenAI(aiBatch);
      aiEnhanced.push(...analyzed);
      openaiCalls++;
      
      process.stdout.write(`\r      Progress: ${aiEnhanced.length}/${yelpEnhanced.length}`);
      await sleep(1000);
    }
    console.log(' ✓');
    
    console.log(`\n   🍽️  Step 4/4: Menu scraping (restaurants)...`);
    const menuEnhanced = [];
    for (const venue of aiEnhanced) {
      const isDining = venue.ai_analysis?.standardized_category === 'dining' || 
                       venue.category === 'dining' || 
                       venue.business_type === 'restaurant';
      
      if (isDining && venue.website) {
        try {
          const menuData = await scrapeMenuFromWebsite(venue);
          if (menuData && menuData.items.length > 0) {
            venue.menu_data = menuData;
            menusScraped++;
          }
        } catch (error) {}
      }
      
      menuEnhanced.push(venue);
    }
    console.log(`      ✓ Complete (${menusScraped} menus found)`);
    
    console.log(`\n   💾 Saving to database...`);
    
    const updateStmt = db.prepare(`
      UPDATE venues SET
        neighborhood = ?,
        standardized_category = ?,
        mood_tags = ?,
        context_tags = ?,
        best_for = ?,
        time_tags = ?,
        cuisine_primary = ?,
        cuisine_subtypes = ?,
        dietary_tags = ?,
        meal_types = ?,
        food_style_tags = ?,
        specialty_tags = ?,
        music_genres_normalized = ?,
        dress_code = ?,
        vibe_intensity = ?,
        ambiance_notes = ?,
        signature_items = ?,
        best_time_to_visit = ?,
        pro_tips = ?,
        yelp_id = ?,
        yelp_rating = ?,
        yelp_review_count = ?,
        yelp_photos_json = ?,
        last_enhanced = datetime('now'),
        enhancement_version = ?
      WHERE id = ?
    `);
    
    const menuInsertStmt = db.prepare(`
      INSERT INTO menu_items (venue_id, item_name, price, source)
      VALUES (?, ?, ?, ?)
    `);
    
    const menuMetaStmt = db.prepare(`
      INSERT OR REPLACE INTO venue_menus (venue_id, has_menu, menu_url, menu_source, total_items, last_scraped, scrape_status)
      VALUES (?, 1, ?, ?, ?, datetime('now'), 'success')
    `);
    
    const transaction = db.transaction((venues) => {
      for (const venue of venues) {
        try {
          const analysis = venue.ai_analysis || {};
          
          updateStmt.run(
            venue.neighborhood || venue.city,
            analysis.standardized_category || venue.category,
            JSON.stringify(analysis.mood_tags || []),
            JSON.stringify(analysis.context_tags || []),
            (analysis.context_tags || []).join(','),
            JSON.stringify(analysis.time_tags || []),
            JSON.stringify(analysis.cuisine_primary || []),
            JSON.stringify(analysis.cuisine_subtypes || []),
            JSON.stringify(analysis.dietary_tags || []),
            JSON.stringify(analysis.meal_types || []),
            JSON.stringify(analysis.food_style || []),
            JSON.stringify(analysis.specialty_tags || []),
            JSON.stringify(analysis.music_genres || []),
            analysis.dress_code,
            analysis.vibe_intensity,
            analysis.ambiance_notes,
            JSON.stringify(analysis.signature_items || []),
            analysis.best_time_to_visit,
            analysis.pro_tips,
            venue.yelp_id,
            venue.yelp_rating,
            venue.yelp_review_count,
            JSON.stringify(venue.yelp_photos || []),
            '2.0',
            venue.id
          );
          
          if (venue.menu_data) {
            for (const item of venue.menu_data.items) {
              menuInsertStmt.run(
                venue.id,
                item.name,
                item.price,
                venue.menu_data.source
              );
            }
            
            menuMetaStmt.run(
              venue.id,
              venue.menu_data.url,
              venue.menu_data.source,
              venue.menu_data.items.length
            );
          }
          
          processed++;
        } catch (error) {
          console.error(`\n         ❌ ${venue.name}: ${error.message}`);
          errors++;
        }
      }
    });
    
    transaction(menuEnhanced);
    
    console.log(`      ✓ Saved ${batch.length} venues`);
    
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const remaining = ((venues.length - processed) / processed * elapsed).toFixed(1);
    
    console.log(`\n   📊 Batch Summary:`);
    console.log(`      Processed: ${processed}/${venues.length} venues`);
    console.log(`      Errors: ${errors}`);
    console.log(`      Time elapsed: ${elapsed} min`);
    console.log(`      Est. remaining: ${remaining} min\n`);
    
    if (i + BATCH_SIZE < venues.length) {
      console.log(`   ⏸️  Pausing ${PAUSE_BETWEEN_BATCHES/1000}s before next batch...\n`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }
  
  db.close();
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const cost = (googleCalls * 0.017 + openaiCalls * 0.02).toFixed(2);
  
  console.log('='.repeat(80));
  console.log('\n🎉 ULTIMATE ENHANCEMENT COMPLETE!\n');
  console.log('📊 Final Summary:');
  console.log(`   ✅ Venues enhanced: ${processed}`);
  console.log(`   🌐 Google API calls: ${googleCalls}`);
  console.log(`   🔍 Yelp API calls: ${yelpCalls}`);
  console.log(`   🤖 OpenAI API calls: ${openaiCalls}`);
  console.log(`   🍽️  Menus scraped: ${menusScraped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️  Total time: ${totalTime} minutes\n`);
  console.log('💰 Estimated API Costs:');
  console.log(`   Google Places: ~$${(googleCalls * 0.017).toFixed(2)}`);
  console.log(`   Yelp: $0 (free tier)`);
  console.log(`   OpenAI GPT-4o-mini: ~$${(openaiCalls * 0.02).toFixed(2)}`);
  console.log(`   Total: ~$${cost}\n`);
  console.log('='.repeat(80) + '\n');
  
  showSampleResults();
}

function showSampleResults() {
  const db = new Database(dbPath);
  
  console.log('📊 SAMPLE RESULTS (Top 5 Enhanced Venues):\n');
  
  const samples = db.prepare(`
    SELECT name, city, neighborhood, standardized_category, 
           mood_tags, best_for, cuisine_primary, music_genres_normalized,
           dress_code, vibe_intensity, signature_items, pro_tips
    FROM venues 
    WHERE last_enhanced IS NOT NULL
    ORDER BY viberyte_certified DESC, viberyte_score DESC
    LIMIT 5
  `).all();
  
  samples.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name}`);
    console.log(`   📍 ${v.neighborhood}, ${v.city}`);
    console.log(`   🏷️  ${v.standardized_category}`);
    console.log(`   😊 Mood: ${JSON.parse(v.mood_tags || '[]').join(', ')}`);
    console.log(`   👥 Best for: ${v.best_for}`);
    console.log(`   👔 Dress: ${v.dress_code} | ⚡ Vibe: ${v.vibe_intensity}/10`);
    
    const cuisine = JSON.parse(v.cuisine_primary || '[]');
    if (cuisine.length > 0) console.log(`   🍽️  Cuisine: ${cuisine.join(', ')}`);
    
    const music = JSON.parse(v.music_genres_normalized || '[]');
    if (music.length > 0) console.log(`   🎵 Music: ${music.join(', ')}`);
    
    const sigs = JSON.parse(v.signature_items || '[]');
    if (sigs.length > 0) console.log(`   ⭐ Signatures: ${sigs.join(', ')}`);
    
    if (v.pro_tips) console.log(`   💡 ${v.pro_tips}`);
    console.log('');
  });
  
  console.log('📈 ENHANCEMENT STATISTICS:\n');
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN cuisine_primary IS NOT NULL AND cuisine_primary != '[]' THEN 1 ELSE 0 END) as with_cuisine,
      SUM(CASE WHEN mood_tags IS NOT NULL AND mood_tags != '[]' THEN 1 ELSE 0 END) as with_mood,
      SUM(CASE WHEN neighborhood != city THEN 1 ELSE 0 END) as with_neighborhood,
      SUM(CASE WHEN dress_code IS NOT NULL THEN 1 ELSE 0 END) as with_dress_code
    FROM venues
    WHERE last_enhanced IS NOT NULL
  `).get();
  
  const menuStats = db.prepare(`
    SELECT COUNT(DISTINCT venue_id) as venues_with_menus, SUM(total_items) as total_items
    FROM venue_menus WHERE has_menu = 1
  `).get();
  
  console.log(`   Total enhanced: ${stats.total}`);
  console.log(`   With cuisine: ${stats.with_cuisine} (${((stats.with_cuisine / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With mood tags: ${stats.with_mood} (${((stats.with_mood / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With neighborhoods: ${stats.with_neighborhood} (${((stats.with_neighborhood / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With dress codes: ${stats.with_dress_code} (${((stats.with_dress_code / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With menus: ${menuStats.venues_with_menus} venues (${menuStats.total_items || 0} items)\n`);
  
  db.close();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

ultimateEnhancement().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});
