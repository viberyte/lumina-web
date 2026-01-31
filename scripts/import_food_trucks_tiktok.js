/**
 * Import Food Trucks from TikTok Apify Dataset
 * 
 * Uses Lumina fine-tuned model to extract:
 * - Food truck name
 * - Cuisine type
 * - Location hints
 * - Description
 */

const Database = require('better-sqlite3');
const path = require('path');
const OpenAI = require('openai');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

const APIFY_URL = 'https://api.apify.com/v2/datasets/bZKVB2b10lMBzpcQm/items?token=apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';

const openai = new OpenAI({
  apiKey: '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',
});

const LUMINA_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1';

async function extractFoodTruckInfo(video) {
  const prompt = `Analyze this TikTok video about a food truck and extract information.

Caption: "${video.text}"

Author: @${video.authorMeta?.name || 'unknown'}
Author Bio: "${video.authorMeta?.signature || ''}"

Hashtags: ${video.hashtags?.map(h => '#' + h.name).join(' ') || 'none'}

Location: ${video.locationMeta?.locationName || ''}, ${video.locationMeta?.address || ''}

Based on this, extract:
1. Food truck name (if identifiable from caption, author name, or bio)
2. Cuisine type (e.g., Nigerian, Mexican, Korean, etc.)
3. City (default to New York if NYC mentioned)
4. A brief description based on the content

If you cannot identify a specific food truck name, return null for name.

Respond in JSON format only:
{
  "name": "Food Truck Name" or null,
  "cuisine": "Cuisine Type",
  "city": "City Name",
  "neighborhood": "Neighborhood if mentioned" or null,
  "description": "Brief description",
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: LUMINA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    // Parse JSON from response
    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('AI extraction failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚚 Food Truck TikTok Import');
  console.log(`   Model: ${LUMINA_MODEL}\n`);

  // Fetch data from Apify
  console.log('📥 Fetching TikTok data from Apify...');
  const response = await fetch(APIFY_URL);
  const videos = await response.json();
  console.log(`   Found ${videos.length} videos\n`);

  // Prepare insert statement
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO venues (
      name, category, subcategory, city, state, neighborhood,
      description, cuisine_primary, price_tier,
      professional_photo_url, website, tiktok_handle,
      primary_vibes, energy_level, viberyte_score,
      created_at, updated_at
    ) VALUES (
      ?, 'food_truck', 'street_food', ?, 'NY', ?,
      ?, ?, '$$',
      ?, ?, ?,
      '["casual", "street food", "authentic"]', 'medium', 50,
      datetime('now'), datetime('now')
    )
  `);

  // Track results
  const results = {
    processed: 0,
    extracted: 0,
    inserted: 0,
    skipped: 0,
    duplicates: 0,
  };

  // Store extracted trucks to dedupe
  const extractedTrucks = new Map();

  for (const video of videos) {
    results.processed++;
    
    console.log(`\n[${results.processed}/${videos.length}] Processing...`);
    console.log(`   Caption: "${(video.text || '').substring(0, 60)}..."`);
    console.log(`   Author: @${video.authorMeta?.name || 'unknown'}`);

    const extracted = await extractFoodTruckInfo(video);
    
    if (!extracted || !extracted.name) {
      console.log('   ❌ Could not extract food truck name');
      results.skipped++;
      continue;
    }

    results.extracted++;
    console.log(`   ✅ Extracted: ${extracted.name} (${extracted.cuisine})`);
    console.log(`      Confidence: ${extracted.confidence}`);

    // Skip low confidence
    if (extracted.confidence === 'low') {
      console.log('   ⚠️ Skipping low confidence result');
      results.skipped++;
      continue;
    }

    // Check for duplicates in this run
    const key = extracted.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (extractedTrucks.has(key)) {
      console.log('   ⏭️ Duplicate in batch, skipping');
      results.duplicates++;
      continue;
    }
    extractedTrucks.set(key, true);

    // Check if already in database
    const existing = db.prepare('SELECT id FROM venues WHERE LOWER(name) = LOWER(?)').get(extracted.name);
    if (existing) {
      console.log(`   ⏭️ Already exists in database (ID: ${existing.id})`);
      results.duplicates++;
      continue;
    }

    // Insert into database
    try {
      const result = insertStmt.run(
        extracted.name,
        extracted.city || 'New York',
        extracted.neighborhood,
        extracted.description,
        extracted.cuisine,
        video.videoMeta?.coverUrl || null,
        video.webVideoUrl || null,
        video.authorMeta?.name || null
      );
      
      console.log(`   💾 Inserted with ID: ${result.lastInsertRowid}`);
      results.inserted++;
    } catch (error) {
      console.log(`   ❌ Insert failed: ${error.message}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS');
  console.log('='.repeat(50));
  console.log(`   Videos processed: ${results.processed}`);
  console.log(`   Names extracted:  ${results.extracted}`);
  console.log(`   Inserted to DB:   ${results.inserted}`);
  console.log(`   Skipped:          ${results.skipped}`);
  console.log(`   Duplicates:       ${results.duplicates}`);

  // Show what we added
  console.log('\n📍 Food Trucks in Database:\n');
  const allTrucks = db.prepare(`
    SELECT id, name, cuisine_primary, city, neighborhood
    FROM venues 
    WHERE category = 'food_truck'
    ORDER BY created_at DESC
    LIMIT 15
  `).all();

  for (const truck of allTrucks) {
    console.log(`   ${truck.id}: ${truck.name} (${truck.cuisine_primary}) - ${truck.neighborhood || truck.city}`);
  }
}

main().catch(console.error);
