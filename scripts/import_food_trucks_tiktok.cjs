/**
 * Import Food Trucks from TikTok Apify Dataset
 * Uses Lumina fine-tuned model
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

const LUMINA_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

async function extractFoodTruckInfo(video) {
  const prompt = `Analyze this TikTok about a food truck. Extract the food truck name if mentioned.

Caption: "${video.text}"
Author: @${video.authorMeta?.name || 'unknown'}
Author Bio: "${video.authorMeta?.signature || ''}"
Hashtags: ${video.hashtags?.map(h => '#' + h.name).join(' ') || 'none'}
Location: ${video.locationMeta?.locationName || ''}, ${video.locationMeta?.address || ''}

Return JSON only:
{"name": "Food Truck Name" or null, "cuisine": "Type", "city": "City", "neighborhood": null, "description": "Brief desc", "confidence": "high"|"medium"|"low"}`;

  try {
    const response = await openai.chat.completions.create({
      model: LUMINA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('AI error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚚 Food Truck TikTok Import');
  console.log(`   Model: ${LUMINA_MODEL}\n`);

  console.log('📥 Fetching from Apify...');
  const response = await fetch(APIFY_URL);
  const videos = await response.json();
  console.log(`   Found ${videos.length} videos\n`);

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

  const results = { processed: 0, extracted: 0, inserted: 0, skipped: 0, duplicates: 0 };
  const extractedTrucks = new Map();

  for (const video of videos) {
    results.processed++;
    
    console.log(`[${results.processed}/${videos.length}] "${(video.text || '').substring(0, 50)}..."`);

    const extracted = await extractFoodTruckInfo(video);
    
    if (!extracted || !extracted.name) {
      console.log('   ❌ No name found');
      results.skipped++;
      continue;
    }

    results.extracted++;
    console.log(`   ✅ ${extracted.name} (${extracted.cuisine}) [${extracted.confidence}]`);

    if (extracted.confidence === 'low') {
      results.skipped++;
      continue;
    }

    const key = extracted.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (extractedTrucks.has(key)) {
      results.duplicates++;
      continue;
    }
    extractedTrucks.set(key, true);

    const existing = db.prepare('SELECT id FROM venues WHERE LOWER(name) = LOWER(?)').get(extracted.name);
    if (existing) {
      console.log(`   ⏭️ Exists (ID: ${existing.id})`);
      results.duplicates++;
      continue;
    }

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
      console.log(`   💾 ID: ${result.lastInsertRowid}`);
      results.inserted++;
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n📊 RESULTS');
  console.log(`   Processed: ${results.processed}`);
  console.log(`   Extracted: ${results.extracted}`);
  console.log(`   Inserted:  ${results.inserted}`);
  console.log(`   Duplicates: ${results.duplicates}`);

  const trucks = db.prepare(`SELECT id, name, cuisine_primary FROM venues WHERE category = 'food_truck' LIMIT 15`).all();
  console.log('\n📍 Food Trucks:');
  trucks.forEach(t => console.log(`   ${t.id}: ${t.name} (${t.cuisine_primary})`));
}

main().catch(console.error);
