import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import fs from 'fs';
// import { ApifyClient } from 'apify-client';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';

// Apify API key (add yours here)
const APIFY_API_KEY = 'YOUR_APIFY_API_KEY'; // Replace with your Apify API key
// const apifyClient = new ApifyClient({ token: APIFY_API_KEY });

console.log('🍽️ COMPREHENSIVE MENU SCRAPER\n');

// Get venues without menus
const venuesWithoutMenus = db.prepare(`
  SELECT v.* 
  FROM venues v
  WHERE v.viberyte_certified = 1
    AND v.id NOT IN (SELECT DISTINCT venue_id FROM menu_items)
    AND v.category LIKE '%dining%'
  ORDER BY v.name
`).all();

console.log(`📋 Found ${venuesWithoutMenus.length} venues missing menus\n`);

// Load Apify data for tags
const apify1 = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/apify_venues_1.json', 'utf8'));
const apify2 = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/apify_venues_2.json', 'utf8'));
const allApify = [...apify1, ...apify2];

const apifyMap = new Map();
allApify.forEach(v => {
  const key = v.title?.toLowerCase().trim();
  if (key) apifyMap.set(key, v);
});

console.log(`📦 Loaded ${apifyMap.size} Apify venues\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════
// APIFY WEBSITE CONTENT CRAWLER
// ═══════════════════════════════════════════
async function scrapeWebsiteWithApify(url) {
  if (!url || !url.startsWith('http')) return null;
  
  try {
    console.log(`   🕷️ Apify crawling: ${url.substring(0, 50)}...`);
    
    // Run the Website Content Crawler
    const run = await apifyClient.actor("apify/website-content-crawler").call({
      startUrls: [{ url }],
      maxCrawlDepth: 1,
      maxCrawlPages: 3,
      crawlerType: 'playwright:chrome'
    });

    // Fetch results
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) return null;
    
    // Combine text from all pages
    const menuText = items
      .map(item => item.text || '')
      .join('\n')
      .substring(0, 10000);
    
    console.log(`   ✅ Apify extracted ${menuText.length} chars`);
    return menuText;
    
  } catch (error) {
    console.log(`   ❌ Apify crawl failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// SIMPLE WEBSITE SCRAPER (FALLBACK)
// ═══════════════════════════════════════════
async function scrapeWebsiteSimple(url) {
  if (!url || !url.startsWith('http')) return null;
  
  try {
    console.log(`   🌐 Simple fetch: ${url.substring(0, 50)}...`);
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);
    
    return text;
  } catch (error) {
    console.log(`   ❌ Simple fetch failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// GOOGLE PLACES MENU SEARCH
// ═══════════════════════════════════════════
async function getGooglePlaceMenu(name, address) {
  try {
    console.log(`   🔍 Google Places search...`);
    
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name + ' ' + address)}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.candidates?.[0]?.place_id) return null;
    
    const placeId = searchData.candidates[0].place_id;
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=editorial_summary,reviews&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    
    const reviews = detailsData.result?.reviews || [];
    const menuText = reviews.map(r => r.text).join(' ').substring(0, 5000);
    
    return menuText || null;
  } catch (error) {
    console.log(`   ❌ Google Places failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// YELP API MENU SEARCH
// ═══════════════════════════════════════════
async function getYelpMenu(name, city) {
  try {
    console.log(`   🔍 Yelp search...`);
    
    const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&location=${encodeURIComponent(city)}&limit=1`;
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const business = data.businesses?.[0];
    
    if (!business) return null;
    
    const detailsUrl = `https://api.yelp.com/v3/businesses/${business.id}`;
    const detailsRes = await fetch(detailsUrl, {
      headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
    });
    
    const details = await detailsRes.json();
    const menuHints = details.reviews?.map(r => r.text).join(' ').substring(0, 5000);
    
    return menuHints || null;
  } catch (error) {
    console.log(`   ❌ Yelp failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// EXTRACT MENU WITH GPT-4
// ═══════════════════════════════════════════
async function extractMenuWithGPT(venueName, sourceText, cuisine) {
  if (!sourceText || sourceText.length < 100) return null;
  
  try {
    console.log(`   🤖 GPT-4 extracting menu...`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract menu items from text. Return ONLY valid JSON array, no markdown.'
        },
        {
          role: 'user',
          content: `Extract menu items for ${venueName} (${cuisine} restaurant).

Text:
${sourceText}

Return JSON array:
[
  {"name": "Dish Name", "price": 15.99, "category": "Appetizers", "description": "brief"}
]

Only items with clear prices. Return ONLY JSON array.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    let response = completion.choices[0]?.message?.content || '[]';
    
    response = response.trim();
    response = response.replace(/```json\n?/g, '');
    response = response.replace(/```\n?/g, '');
    
    const items = JSON.parse(response);
    
    if (!Array.isArray(items) || items.length === 0) return null;
    
    console.log(`   ✅ Extracted ${items.length} menu items`);
    return items;
    
  } catch (error) {
    console.log(`   ❌ GPT extraction failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// EXTRACT TAGS FROM APIFY
// ═══════════════════════════════════════════
function extractTagsFromApify(venueName) {
  const key = venueName.toLowerCase().trim();
  const apifyVenue = apifyMap.get(key);
  
  if (!apifyVenue) return null;
  
  return {
    description: apifyVenue.description,
    categories: apifyVenue.categories,
    imageUrls: apifyVenue.imageUrls?.slice(0, 5) || [],
    reviews: apifyVenue.reviews,
    menu: apifyVenue.menu
  };
}

// ═══════════════════════════════════════════
// GENERATE VIBE TAGS WITH AI
// ═══════════════════════════════════════════
async function generateVibeTags(venueName, description, cuisine) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You tag venues with vibe/mood descriptors. Return ONLY JSON.'
        },
        {
          role: 'user',
          content: `Tag this ${cuisine} restaurant with vibe descriptors.

Name: ${venueName}
Description: ${description}

Return JSON:
{
  "vibe_tags": ["romantic", "upscale", "trendy"],
  "mood_tags": ["intimate", "lively", "cozy"],
  "music_genres": ["jazz", "lounge"],
  "context_tags": ["date-night", "business", "group-friendly"]
}

Only return JSON.`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    let response = completion.choices[0]?.message?.content || '{}';
    response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(response);
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════
// MAIN PROCESSING LOOP
// ═══════════════════════════════════════════
const insertMenuItem = db.prepare(`
  INSERT INTO menu_items (venue_id, item_name, price, category, description)
  VALUES (?, ?, ?, ?, ?)
`);

const updateVenueTags = db.prepare(`
  UPDATE venues 
  SET vibe_tags = ?, mood_tags = ?, music_genres = ?, context_tags = ?, professional_photos = ?
  WHERE id = ?
`);

let processed = 0;
let menusFound = 0;
let itemsAdded = 0;

for (const venue of venuesWithoutMenus) {
  processed++;
  console.log(`\n[${processed}/${venuesWithoutMenus.length}] ${venue.name}`);
  console.log(`   📍 ${venue.neighborhood}, ${venue.city}`);
  console.log(`   🍽️ ${venue.cuisine_primary || 'Unknown cuisine'}`);
  
  // Step 1: Get Apify data
  const apifyData = extractTagsFromApify(venue.name);
  if (apifyData) {
    console.log(`   ✅ Found in Apify data`);
    
    if (apifyData.imageUrls?.length > 0) {
      updateVenueTags.run(null, null, null, null, JSON.stringify(apifyData.imageUrls), venue.id);
    }
  }
  
  // Step 2: Try multiple sources for menu
  let menuText = null;
  
  // Try Apify website crawler first (most reliable)
  if (venue.website || apifyData?.menu) {
    const url = venue.website || apifyData?.menu;
    // menuText = await scrapeWebsiteWithApify(url);
    await sleep(3000); // Apify rate limit
  }
  
  // Fallback to simple scraper
  if (!menuText && (venue.website || apifyData?.menu)) {
    const url = venue.website || apifyData?.menu;
    menuText = await scrapeWebsiteSimple(url);
    await sleep(1000);
  }
  
  // Try Google Places
  if (!menuText && venue.address) {
    menuText = await getGooglePlaceMenu(venue.name, venue.address);
    await sleep(1000);
  }
  
  // Try Yelp
  if (!menuText) {
    menuText = await getYelpMenu(venue.name, venue.city);
    await sleep(1000);
  }
  
  // Use Apify description if nothing else
  if (!menuText && apifyData?.description) {
    menuText = apifyData.description;
  }
  
  // Step 3: Extract menu items
  if (menuText) {
    const menuItems = await extractMenuWithGPT(
      venue.name, 
      menuText, 
      venue.cuisine_primary || 'restaurant'
    );
    
    if (menuItems && menuItems.length > 0) {
      menusFound++;
      
      for (const item of menuItems) {
        try {
          insertMenuItem.run(
            venue.id,
            item.name,
            item.price || 0,
            item.category || 'Main',
            item.description || ''
          );
          itemsAdded++;
        } catch (e) {
          // Skip duplicates
        }
      }
      
      console.log(`   ✅ Added ${menuItems.length} menu items`);
    }
    
    await sleep(2000);
  }
  
  // Step 4: Generate vibe tags
  const description = apifyData?.description || venue.bio || venue.description;
  if (description) {
    const tags = await generateVibeTags(venue.name, description, venue.cuisine_primary);
    
    if (tags) {
      updateVenueTags.run(
        JSON.stringify(tags.vibe_tags || []),
        JSON.stringify(tags.mood_tags || []),
        JSON.stringify(tags.music_genres || []),
        JSON.stringify(tags.context_tags || []),
        null,
        venue.id
      );
      console.log(`   🏷️ Added vibe tags`);
    }
    
    await sleep(1500);
  }
  
  if (processed % 10 === 0) {
    console.log(`\n📊 Progress: ${processed}/${venuesWithoutMenus.length}`);
    console.log(`   Menus found: ${menusFound}`);
    console.log(`   Items added: ${itemsAdded}\n`);
  }
}

db.close();

console.log(`\n✅ COMPLETE!`);
console.log(`   Processed: ${processed} venues`);
console.log(`   Menus found: ${menusFound}`);
console.log(`   Menu items added: ${itemsAdded}`);
