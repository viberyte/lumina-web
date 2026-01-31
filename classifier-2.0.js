import Database from 'better-sqlite3';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// ALL YOUR API KEYS
const openai = new OpenAI({
  apiKey: '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'
});

const anthropic = new Anthropic({
  apiKey: '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'
});

const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const YELP_API_KEY = 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx';

const PROGRESS_FILE = '/opt/viberyte/lumina-web/classifier-progress.json';

console.log('🚀 CLASSIFIER 2.0 - COMPLETE VENUE ENHANCEMENT\n');
console.log('Sources: Yelp + Google Places + Websites + PDFs + Claude AI + GPT-4\n');

// Load progress
let progress = { lastProcessedId: 0, stats: { processed: 0, menusFound: 0, itemsAdded: 0, photosAdded: 0, tagsAdded: 0 } };
if (fs.existsSync(PROGRESS_FILE)) {
  progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  console.log(`📥 Resuming from venue ID ${progress.lastProcessedId}\n`);
}

// Get ALL certified venues (not just missing menus)
const allVenues = db.prepare(`
  SELECT v.* 
  FROM venues v
  WHERE v.viberyte_certified = 1
    AND v.id > ?
  ORDER BY v.id
`).all(progress.lastProcessedId);

console.log(`📋 Processing ${allVenues.length} certified venues\n`);

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════
// FIND PDF MENUS
// ═══════════════════════════════════════════
async function findPDFMenus(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const pdfRegex = /href=["'](.*?\.pdf.*?)["']/gi;
    const matches = [...html.matchAll(pdfRegex)];
    
    const pdfUrls = matches
      .map(m => m[1])
      .filter(url => url.toLowerCase().includes('menu'))
      .map(url => {
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) {
          const base = new URL(url);
          return base.origin + url;
        }
        return url;
      })
      .slice(0, 3);
    
    if (pdfUrls.length > 0) {
      console.log(`   ✅ Found ${pdfUrls.length} PDF(s)`);
    }
    
    return pdfUrls;
  } catch (error) {
    return [];
  }
}

async function extractPDFText(pdfUrl) {
  try {
    const response = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    if (!response.ok) return null;
    
    const buffer = await response.buffer();
    const tempPath = `/tmp/menu_${Date.now()}.pdf`;
    fs.writeFileSync(tempPath, buffer);
    
    const { stdout } = await execAsync(`pdftotext "${tempPath}" -`);
    fs.unlinkSync(tempPath);
    
    return stdout.substring(0, 10000);
  } catch (error) {
    return null;
  }
}

async function scrapeWebsite(url) {
  if (!url || !url.startsWith('http')) return null;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
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
    return null;
  }
}

async function getGooglePlaceData(name, address) {
  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name + ' ' + address)}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.candidates?.[0]?.place_id) return null;
    
    const placeId = searchData.candidates[0].place_id;
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,photos,reviews,editorial_summary,price_level,website&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    
    const result = detailsData.result || {};
    
    const photoUrls = (result.photos || []).slice(0, 10).map(photo => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
    );
    
    const menuText = (result.reviews || []).map(r => r.text).join(' ').substring(0, 5000);
    
    return {
      neighborhood: result.formatted_address?.split(',')[1]?.trim(),
      photos: photoUrls,
      menuHints: menuText,
      priceLevel: result.price_level
    };
  } catch (error) {
    return null;
  }
}

async function getYelpData(name, city) {
  try {
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
    
    return {
      categories: (details.categories || []).map(c => c.title),
      photos: details.photos || [],
      priceRange: details.price,
      neighborhood: details.location?.neighborhood?.[0],
      menuUrl: details.attributes?.menu_url,
      reviews: (details.reviews || []).map(r => r.text).join(' ').substring(0, 3000)
    };
  } catch (error) {
    return null;
  }
}

async function extractWithClaude(venueName, sourceText, cuisine) {
  if (!sourceText || sourceText.length < 100) return null;
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Extract menu items, cuisine tags, and vibe tags for ${venueName}.

Text:
${sourceText}

Return ONLY valid JSON:
{
  "menu": [
    {"name": "Dish", "price": 25.99, "category": "Appetizers", "description": "brief"}
  ],
  "cuisine_tags": ["Italian", "Pasta", "Wine Bar"],
  "vibe_tags": ["romantic", "upscale", "intimate"],
  "mood_tags": ["cozy", "elegant"],
  "music_genres": ["jazz", "lounge"],
  "neighborhood_vibe": "Trendy SoHo dining"
}

Only items with clear prices. Return ONLY JSON.`
      }]
    });

    let response = message.content[0].text.trim();
    response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const data = JSON.parse(response);
    
    if (data.menu && Array.isArray(data.menu)) {
      console.log(`   ✅ Claude: ${data.menu.length} items + tags`);
    }
    
    return data;
    
  } catch (error) {
    return null;
  }
}

async function extractWithGPT(venueName, sourceText, cuisine) {
  if (!sourceText || sourceText.length < 100) return null;
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract menu items and tags. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Extract for ${venueName} (${cuisine}).

Text:
${sourceText}

Return JSON:
{
  "menu": [{"name": "Dish", "price": 15.99, "category": "Appetizers", "description": "brief"}],
  "cuisine_tags": ["Italian", "Pasta"],
  "vibe_tags": ["romantic", "upscale"],
  "mood_tags": ["cozy"],
  "music_genres": ["jazz"]
}

Only items with prices. ONLY JSON.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    let response = completion.choices[0]?.message?.content || '{}';
    response = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const data = JSON.parse(response);
    
    if (data.menu && data.menu.length > 0) {
      console.log(`   ✅ GPT: ${data.menu.length} items + tags`);
    }
    
    return data;
    
  } catch (error) {
    return null;
  }
}

const insertMenuItem = db.prepare(`
  INSERT OR IGNORE INTO menu_items (venue_id, item_name, price, category, description)
  VALUES (?, ?, ?, ?, ?)
`);

const updateVenue = db.prepare(`
  UPDATE venues 
  SET 
    professional_photos = COALESCE(?, professional_photos),
    vibe_tags = COALESCE(?, vibe_tags),
    mood_tags = COALESCE(?, mood_tags),
    music_genres = COALESCE(?, music_genres),
    neighborhood = COALESCE(?, neighborhood),
    cuisine_types = COALESCE(?, cuisine_types),
    price_tier = COALESCE(?, price_tier)
  WHERE id = ?
`);

// ═══════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════
for (const venue of allVenues) {
  try {
    progress.stats.processed++;
    console.log(`\n[${progress.stats.processed}/${allVenues.length}] ${venue.name}`);
    console.log(`   📍 ${venue.neighborhood || venue.city}`);
    console.log(`   🍽️ ${venue.cuisine_primary || 'Unknown'}`);
    
    let allPhotos = [];
    let menuText = '';
    let extractedData = null;
    let neighborhood = venue.neighborhood;
    let cuisineTags = [];
    let priceLevel = null;
    
    // Yelp
    const yelpData = await getYelpData(venue.name, venue.city);
    if (yelpData) {
      allPhotos.push(...yelpData.photos);
      menuText += yelpData.reviews || '';
      cuisineTags.push(...yelpData.categories);
      neighborhood = yelpData.neighborhood || neighborhood;
      priceLevel = yelpData.priceRange;
      console.log(`   ✅ Yelp: ${yelpData.photos.length} photos`);
    }
    await sleep(1000);
    
    // Google Places
    const googleData = await getGooglePlaceData(venue.name, venue.address);
    if (googleData) {
      allPhotos.push(...googleData.photos);
      menuText += googleData.menuHints || '';
      neighborhood = googleData.neighborhood || neighborhood;
      priceLevel = priceLevel || googleData.priceLevel;
      console.log(`   ✅ Google: ${googleData.photos.length} photos`);
    }
    await sleep(1000);
    
    // Website
    if (venue.website) {
      const websiteText = await scrapeWebsite(venue.website);
      if (websiteText) {
        menuText += websiteText;
        console.log(`   ✅ Website scraped`);
      }
      
      // PDFs
      const pdfUrls = await findPDFMenus(venue.website);
      for (const pdfUrl of pdfUrls) {
        const pdfText = await extractPDFText(pdfUrl);
        if (pdfText) {
          menuText += pdfText;
          console.log(`   ✅ PDF extracted`);
        }
        await sleep(1000);
      }
    }
    
    // Extract with Claude
    if (menuText.length > 100) {
      extractedData = await extractWithClaude(venue.name, menuText, venue.cuisine_primary);
      await sleep(2000);
    }
    
    // Fallback to GPT
    if (!extractedData && menuText.length > 100) {
      extractedData = await extractWithGPT(venue.name, menuText, venue.cuisine_primary);
      await sleep(2000);
    }
    
    // Save menu items
    if (extractedData?.menu && extractedData.menu.length > 0) {
      progress.stats.menusFound++;
      
      for (const item of extractedData.menu) {
        try {
          insertMenuItem.run(
            venue.id,
            item.name,
            item.price || 0,
            item.category || 'Main',
            item.description || ''
          );
          progress.stats.itemsAdded++;
        } catch (e) {}
      }
      
      console.log(`   ✅ Saved ${extractedData.menu.length} items`);
    }
    
    // Update venue
    const updates = {
      photos: allPhotos.length > 0 ? JSON.stringify(allPhotos.slice(0, 10)) : null,
      vibe_tags: extractedData?.vibe_tags ? JSON.stringify(extractedData.vibe_tags) : null,
      mood_tags: extractedData?.mood_tags ? JSON.stringify(extractedData.mood_tags) : null,
      music_genres: extractedData?.music_genres ? JSON.stringify(extractedData.music_genres) : null,
      neighborhood: neighborhood,
      cuisine_types: cuisineTags.length > 0 ? JSON.stringify(cuisineTags) : null,
      price_tier: priceLevel
    };
    
    updateVenue.run(
      updates.photos,
      updates.vibe_tags,
      updates.mood_tags,
      updates.music_genres,
      updates.neighborhood,
      updates.cuisine_types,
      updates.price_tier,
      venue.id
    );
    
    if (allPhotos.length > 0) {
      progress.stats.photosAdded += allPhotos.length;
      console.log(`   📸 ${allPhotos.length} photos`);
    }
    
    if (extractedData?.vibe_tags || cuisineTags.length > 0) {
      progress.stats.tagsAdded++;
      console.log(`   🏷️ Tags added`);
    }
    
    // Save progress
    progress.lastProcessedId = venue.id;
    saveProgress();
    
    // Progress report
    if (progress.stats.processed % 10 === 0) {
      console.log(`\n📊 PROGRESS: ${progress.stats.processed}/${allVenues.length}`);
      console.log(`   Menus: ${progress.stats.menusFound}`);
      console.log(`   Items: ${progress.stats.itemsAdded}`);
      console.log(`   Photos: ${progress.stats.photosAdded}`);
      console.log(`   Tagged: ${progress.stats.tagsAdded}\n`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    continue;
  }
}

db.close();

console.log(`\n✅ CLASSIFIER 2.0 COMPLETE!`);
console.log(`   Processed: ${progress.stats.processed} venues`);
console.log(`   Menus: ${progress.stats.menusFound}`);
console.log(`   Items: ${progress.stats.itemsAdded}`);
console.log(`   Photos: ${progress.stats.photosAdded}`);
console.log(`   Tagged: ${progress.stats.tagsAdded}`);

// Clean up progress file
fs.unlinkSync(PROGRESS_FILE);
