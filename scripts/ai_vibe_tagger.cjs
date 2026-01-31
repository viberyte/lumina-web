/**
 * AI Vibe Tagging System
 * Uses fine-tuned Lumina model to add hidden intelligence
 */

const Database = require('better-sqlite3');
const path = require('path');
const OpenAI = require('openai');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

const openai = new OpenAI({
  apiKey: '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'
});

const LUMINA_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tagVenueWithAI(venue) {
  const menuInfo = venue.menu_highlights ? JSON.parse(venue.menu_highlights) : null;
  
  const prompt = `Analyze this venue and provide comprehensive tagging:

VENUE: ${venue.name}
Category: ${venue.category}
City: ${venue.city}, ${venue.state}
Neighborhood: ${venue.neighborhood || 'unknown'}
Price: ${venue.price_tier || '$$'}
Rating: ${venue.google_rating || 'N/A'} (${venue.google_reviews_count || 0} reviews)
Description: ${venue.description || 'none'}
Happy Hour: ${venue.happy_hour_info || 'none'}
Late Night: ${venue.late_night_spot ? 'Yes (open past 2 AM)' : 'No'}
${menuInfo ? `Must Try: ${menuInfo.must_try?.join(', ') || 'none'}` : ''}

Return ONLY this JSON (no markdown):
{
  "primary_vibes": ["upscale/trendy/casual/romantic/lively - max 3"],
  "secondary_vibes": ["instagram-worthy/date-friendly/locals-only/cozy"],
  "energy_level": "calm/moderate/lively/high",
  "energy_progression": ["can_wind_down/can_turn_up/steady_energy"],
  
  "first_date_suitable": true/false,
  "anniversary_suitable": true/false,
  "girls_night_suitable": true/false,
  "guys_night_suitable": true/false,
  "pregame_suitable": true/false,
  "brunch_spot": true/false,
  
  "cuisine_primary": "Italian/Mexican/American or null",
  "cuisine_secondary": "Mediterranean/Fusion or null",
  "cuisine_style": "upscale/casual/fast-casual or null",
  "cuisine_tags": ["pasta-focused/cocktail-bar"],
  
  "lounge_type": "upscale/casual/hookah/rooftop or null",
  "lounge_vibes": ["calm/lively/mixy/chill"],
  
  "reasoning": "brief explanation"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: LUMINA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ AI error: ${error.message}`);
    return null;
  }
}

async function tagVenue(venue) {
  console.log(`[${venue.id}] ${venue.name} - ${venue.category}`);

  const tags = await tagVenueWithAI(venue);
  
  if (!tags) {
    console.log('   ❌ Failed');
    return false;
  }

  console.log(`   ✨ ${tags.primary_vibes.join(', ')} | ${tags.energy_level}`);
  if (tags.first_date_suitable) console.log('   💕 First date');
  if (tags.pregame_suitable) console.log('   🍻 Pregame');
  if (tags.cuisine_primary) console.log(`   🍽️ ${tags.cuisine_primary}`);

  const updateStmt = db.prepare(`
    UPDATE venues SET
      primary_vibes = ?,
      secondary_vibes = ?,
      energy_level = ?,
      energy_progression = ?,
      first_date_suitable = ?,
      anniversary_suitable = ?,
      girls_night_suitable = ?,
      guys_night_suitable = ?,
      pregame_suitable = ?,
      brunch_spot = ?,
      cuisine_primary = ?,
      cuisine_secondary = ?,
      cuisine_style = ?,
      cuisine_tags = ?,
      lounge_type = ?,
      lounge_vibes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  updateStmt.run(
    JSON.stringify(tags.primary_vibes),
    JSON.stringify(tags.secondary_vibes),
    tags.energy_level,
    JSON.stringify(tags.energy_progression),
    tags.first_date_suitable ? 1 : 0,
    tags.anniversary_suitable ? 1 : 0,
    tags.girls_night_suitable ? 1 : 0,
    tags.guys_night_suitable ? 1 : 0,
    tags.pregame_suitable ? 1 : 0,
    tags.brunch_spot ? 1 : 0,
    tags.cuisine_primary,
    tags.cuisine_secondary,
    tags.cuisine_style,
    JSON.stringify(tags.cuisine_tags),
    tags.lounge_type,
    JSON.stringify(tags.lounge_vibes),
    venue.id
  );

  return true;
}

async function main() {
  console.log('🏷️ AI Vibe Tagging System');
  console.log(`   🤖 Model: ${LUMINA_MODEL}\n`);

  // Add columns
  const columns = [
    'ALTER TABLE venues ADD COLUMN primary_vibes TEXT',
    'ALTER TABLE venues ADD COLUMN secondary_vibes TEXT',
    'ALTER TABLE venues ADD COLUMN energy_level TEXT',
    'ALTER TABLE venues ADD COLUMN energy_progression TEXT',
    'ALTER TABLE venues ADD COLUMN first_date_suitable INTEGER DEFAULT 0',
    'ALTER TABLE venues ADD COLUMN anniversary_suitable INTEGER DEFAULT 0',
    'ALTER TABLE venues ADD COLUMN girls_night_suitable INTEGER DEFAULT 0',
    'ALTER TABLE venues ADD COLUMN guys_night_suitable INTEGER DEFAULT 0',
    'ALTER TABLE venues ADD COLUMN cuisine_primary TEXT',
    'ALTER TABLE venues ADD COLUMN cuisine_secondary TEXT',
    'ALTER TABLE venues ADD COLUMN cuisine_style TEXT',
    'ALTER TABLE venues ADD COLUMN cuisine_tags TEXT',
    'ALTER TABLE venues ADD COLUMN lounge_type TEXT',
    'ALTER TABLE venues ADD COLUMN lounge_vibes TEXT'
  ];

  for (const sql of columns) {
    try { db.exec(sql); } catch (e) {}
  }

  const venues = db.prepare(`
    SELECT id, name, category, city, state, neighborhood, price_tier,
           description, happy_hour_info, late_night_spot, 
           google_rating, google_reviews_count, menu_highlights, brunch_spot
    FROM venues 
    WHERE primary_vibes IS NULL
    ORDER BY id DESC
    LIMIT 100
  `).all();

  console.log(`📊 Tagging ${venues.length} venues\n`);

  const stats = { processed: 0, success: 0, failed: 0 };

  for (const venue of venues) {
    stats.processed++;
    
    if (await tagVenue(venue)) {
      stats.success++;
    } else {
      stats.failed++;
    }

    await sleep(1000);

    if (stats.processed % 10 === 0) {
      console.log(`\n📊 Progress: ${stats.processed}/${venues.length} | Success: ${stats.success}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Tagged: ${stats.success} | ❌ Failed: ${stats.failed}`);
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM venues WHERE primary_vibes IS NULL').get();
  console.log(`📌 Remaining: ${remaining.count} venues\n`);
}

main().catch(console.error);
