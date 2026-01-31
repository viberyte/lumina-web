/**
 * Import Happy Hours, Pregame Spots, Museums from TikTok
 * Properly capitalizes names and extracts specials
 */

const Database = require('better-sqlite3');
const path = require('path');
const OpenAI = require('openai');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

const APIFY_URL = 'https://api.apify.com/v2/datasets/tJfbxNf2u7hfSzcU2/items?token=apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';

const openai = new OpenAI({
  apiKey: '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',
});

const LUMINA_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

function properCase(str) {
  if (!str) return null;
  return str
    .toLowerCase()
    .replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase())
    .replace(/\b(Nyc|Nj|Ny)\b/gi, match => match.toUpperCase())
    .trim();
}

async function extractVenueInfo(video) {
  const searchTerm = (video.input || '').toLowerCase();
  
  let venueType = 'bar';
  if (searchTerm.includes('happy') || searchTerm.includes('hour')) venueType = 'happy_hour';
  else if (searchTerm.includes('pregame') || searchTerm.includes('pre game')) venueType = 'pregame';
  else if (searchTerm.includes('museum')) venueType = 'museum';
  
  const prompt = `Analyze this TikTok and extract venue information.

Caption: "${video.text}"
Author: @${video.authorMeta?.name || 'unknown'}
Author Bio: "${video.authorMeta?.signature || ''}"
Hashtags: ${video.hashtags?.map(h => '#' + h.name).join(' ') || 'none'}
Location: ${video.locationMeta?.locationName || ''}, ${video.locationMeta?.address || ''}
Search Term: "${video.input || ''}"

Extract:
1. Venue name (PROPERLY CAPITALIZED - e.g., "The Smith" not "the smith")
2. Category: ${venueType === 'museum' ? 'museum' : 'bar/restaurant/lounge'}
3. City (New York or specific NJ city)
4. State (NY or NJ)
5. Neighborhood if mentioned
6. Happy hour specials if mentioned (drinks, food, times, days)
7. Brief description

Return JSON only:
{
  "name": "Properly Capitalized Venue Name" or null,
  "category": "bar" | "restaurant" | "lounge" | "museum",
  "city": "City Name",
  "state": "NY" | "NJ",
  "neighborhood": "Neighborhood" or null,
  "happy_hour_info": "Specials details" or null,
  "description": "Brief description",
  "good_for_pregame": true | false,
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: LUMINA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      // Ensure proper capitalization
      if (data.name) data.name = properCase(data.name);
      if (data.city) data.city = properCase(data.city);
      if (data.neighborhood) data.neighborhood = properCase(data.neighborhood);
      return data;
    }
    return null;
  } catch (error) {
    console.error('AI error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🍻 Happy Hour / Pregame / Museum TikTok Import');
  console.log(`   Model: ${LUMINA_MODEL}\n`);

  console.log('📥 Fetching from Apify...');
  const response = await fetch(APIFY_URL);
  const videos = await response.json();
  console.log(`   Found ${videos.length} videos\n`);

  // Check if happy_hour_info column exists, if not add it
  try {
    db.exec(`ALTER TABLE venues ADD COLUMN happy_hour_info TEXT`);
    console.log('   Added happy_hour_info column\n');
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE venues ADD COLUMN pregame_suitable INTEGER DEFAULT 0`);
  } catch (e) {}

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO venues (
      name, category, city, state, neighborhood,
      description, happy_hour_info, pregame_suitable, price_tier,
      professional_photo_url, website, tiktok_handle,
      primary_vibes, energy_level, viberyte_score,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, '$$',
      ?, ?, ?,
      '["social", "casual"]', 'medium', 50,
      datetime('now'), datetime('now')
    )
  `);

  const updateHappyHourStmt = db.prepare(`
    UPDATE venues SET 
      happy_hour_info = COALESCE(happy_hour_info, ?),
      pregame_suitable = MAX(pregame_suitable, ?),
      updated_at = datetime('now')
    WHERE LOWER(name) = LOWER(?)
  `);

  const results = { processed: 0, extracted: 0, inserted: 0, updated: 0, skipped: 0, duplicates: 0 };
  const extractedVenues = new Map();

  for (const video of videos) {
    results.processed++;
    
    console.log(`[${results.processed}/${videos.length}] "${(video.text || '').substring(0, 50)}..."`);
    console.log(`   Search: ${video.input || 'unknown'}`);

    const extracted = await extractVenueInfo(video);
    
    if (!extracted || !extracted.name) {
      console.log('   ❌ No venue name found');
      results.skipped++;
      continue;
    }

    results.extracted++;
    console.log(`   ✅ ${extracted.name} (${extracted.category}) [${extracted.confidence}]`);
    if (extracted.happy_hour_info) {
      console.log(`   🍺 Happy Hour: ${extracted.happy_hour_info.substring(0, 60)}...`);
    }

    if (extracted.confidence === 'low') {
      results.skipped++;
      continue;
    }

    const key = extracted.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (extractedVenues.has(key)) {
      results.duplicates++;
      continue;
    }
    extractedVenues.set(key, true);

    // Check if exists
    const existing = db.prepare('SELECT id, happy_hour_info FROM venues WHERE LOWER(name) = LOWER(?)').get(extracted.name);
    
    if (existing) {
      // Update with happy hour info if we have new info
      if (extracted.happy_hour_info || extracted.good_for_pregame) {
        updateHappyHourStmt.run(
          extracted.happy_hour_info,
          extracted.good_for_pregame ? 1 : 0,
          extracted.name
        );
        console.log(`   📝 Updated existing (ID: ${existing.id})`);
        results.updated++;
      } else {
        console.log(`   ⏭️ Exists (ID: ${existing.id})`);
        results.duplicates++;
      }
      continue;
    }

    try {
      const result = insertStmt.run(
        extracted.name,
        extracted.category || 'bar',
        extracted.city || 'New York',
        extracted.state || 'NY',
        extracted.neighborhood,
        extracted.description,
        extracted.happy_hour_info,
        extracted.good_for_pregame ? 1 : 0,
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

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS');
  console.log('='.repeat(50));
  console.log(`   Processed: ${results.processed}`);
  console.log(`   Extracted: ${results.extracted}`);
  console.log(`   Inserted:  ${results.inserted}`);
  console.log(`   Updated:   ${results.updated}`);
  console.log(`   Duplicates: ${results.duplicates}`);
  console.log(`   Skipped:   ${results.skipped}`);

  // Show venues with happy hour info
  console.log('\n🍺 Venues with Happy Hour Info:');
  const happyHourVenues = db.prepare(`
    SELECT id, name, city, happy_hour_info 
    FROM venues 
    WHERE happy_hour_info IS NOT NULL 
    ORDER BY updated_at DESC 
    LIMIT 15
  `).all();
  
  happyHourVenues.forEach(v => {
    console.log(`   ${v.id}: ${v.name} (${v.city})`);
    if (v.happy_hour_info) console.log(`      → ${v.happy_hour_info.substring(0, 70)}...`);
  });

  // Show museums
  console.log('\n🏛️ Museums:');
  const museums = db.prepare(`SELECT id, name, city FROM venues WHERE category = 'museum' LIMIT 10`).all();
  museums.forEach(m => console.log(`   ${m.id}: ${m.name} (${m.city})`));
}

main().catch(console.error);
