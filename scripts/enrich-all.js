import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';
const CONCURRENCY = 10;
const BATCH_SIZE = 500;

const getVenues = () => db.prepare(`
  SELECT id, name, category, description, bio, known_for, 
         cuisine_primary, cuisine_secondary, menu_highlights,
         lounge_type, unified_tags, cuisine_style, music_genres,
         energy_level, city, neighborhood
  FROM venues 
  WHERE should_exclude = 0
    AND (unified_tags IS NULL OR unified_tags = '' OR unified_tags = '[]')
    AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
      OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
      OR (image_url IS NOT NULL AND image_url != ''))
  ORDER BY CASE WHEN category IN ('lounge', 'nightclub', 'bar', 'rooftop') THEN 0 ELSE 1 END, id
  LIMIT ?
`).all(BATCH_SIZE);

const SYSTEM_PROMPT = `You classify venues for Lumina, a nightlife/dining discovery app. Output ONLY valid JSON:

{
  "lounge_type": "upscale-lounge|cocktail-lounge|hookah-lounge|dive-bar|sports-bar|rooftop|nightclub|upscale-dining|casual-dining|lounge-restaurant|speakeasy|brunch-spot|null",
  "cuisine_style": "upscale|trendy|casual|fine-dining|null",
  "music_genres": ["hip-hop","r&b","afrobeats","dancehall","soca","latin","reggaeton","house","edm","live-jazz","live-band","top-40","mixed"],
  "has_hookah": true|false,
  "energy_level": "high|lively|medium|calm|low",
  "unified_tags": ["array of tags"]
}

For unified_tags, use ONLY: pregame, late-night, after-hours, date-night, group-friendly, birthday-spot, girls-night, guys-night, chill-vibes, high-energy, dancing, bottle-service, live-dj, live-music, rooftop, outdoor, upscale, trendy, casual, intimate, loud, can-talk, hookah, craft-cocktails, velvet-rope, reservations-recommended

Be generous - if ANY signal suggests a tag, include it. Output ONLY JSON.`;

async function enrichVenue(venue) {
  const context = `Name: ${venue.name}
Category: ${venue.category}
City: ${venue.city || 'NYC'}, ${venue.neighborhood || ''}
Description: ${venue.description || 'N/A'}
Bio: ${venue.bio || 'N/A'}
Known for: ${venue.known_for || 'N/A'}
Cuisine: ${venue.cuisine_primary || ''} ${venue.cuisine_secondary || ''}
Menu: ${venue.menu_highlights || 'N/A'}
Current lounge_type: ${venue.lounge_type || 'none'}
Current style: ${venue.cuisine_style || 'none'}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: context }],
      temperature: 0.2,
      max_tokens: 400
    });
    const content = response.choices[0].message.content.trim().replace(/```json\n?|\n?```/g, '').trim();
    return { id: venue.id, name: venue.name, ...JSON.parse(content) };
  } catch (err) {
    console.error(`✗ ${venue.name}: ${err.message}`);
    return null;
  }
}

async function processBatch(venues) {
  return (await Promise.all(venues.map(enrichVenue))).filter(Boolean);
}

async function main() {
  console.log('🚀 AI Enrichment with fine-tuned model');
  console.log(`Model: ${MODEL}\n`);
  
  const venues = getVenues();
  console.log(`📊 Found ${venues.length} venues to enrich\n`);

  const updateStmt = db.prepare(`
    UPDATE venues SET
      lounge_type = COALESCE(?, lounge_type),
      cuisine_style = COALESCE(?, cuisine_style),
      music_genres = COALESCE(?, music_genres),
      unified_tags = ?,
      has_hookah = ?,
      energy_level = COALESCE(?, energy_level),
      enriched_at = datetime('now')
    WHERE id = ?
  `);

  let enriched = 0, failed = 0;

  for (let i = 0; i < venues.length; i += CONCURRENCY) {
    const batch = venues.slice(i, i + CONCURRENCY);
    const results = await processBatch(batch);
    
    for (const r of results) {
      try {
        updateStmt.run(
          r.lounge_type,
          r.cuisine_style,
          JSON.stringify(r.music_genres || []),
          JSON.stringify(r.unified_tags || []),
          r.has_hookah ? 1 : 0,
          r.energy_level,
          r.id
        );
        console.log(`✓ ${r.name} → ${r.lounge_type || 'null'} | ${(r.unified_tags || []).slice(0,3).join(', ')}`);
        enriched++;
      } catch (e) { console.error(`✗ DB error ${r.name}: ${e.message}`); failed++; }
    }
    
    const pct = Math.round((i + batch.length) / venues.length * 100);
    console.log(`--- ${pct}% (${enriched} done, ${failed} failed) ---\n`);
  }

  console.log(`\n✅ Complete: ${enriched}/${venues.length} venues enriched`);
  
  const audit = db.prepare(`
    SELECT 
      SUM(CASE WHEN unified_tags IS NOT NULL AND unified_tags != '' AND unified_tags != '[]' THEN 1 ELSE 0 END) as has_tags,
      SUM(CASE WHEN lounge_type IS NOT NULL AND lounge_type != '' THEN 1 ELSE 0 END) as has_lounge_type,
      SUM(CASE WHEN music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]' THEN 1 ELSE 0 END) as has_music,
      SUM(CASE WHEN has_hookah = 1 THEN 1 ELSE 0 END) as has_hookah,
      COUNT(*) as total
    FROM venues WHERE should_exclude = 0
  `).get();
  
  console.log('\n📊 FINAL AUDIT:');
  console.log(`   unified_tags: ${audit.has_tags}/${audit.total}`);
  console.log(`   lounge_type:  ${audit.has_lounge_type}/${audit.total}`);
  console.log(`   music_genres: ${audit.has_music}/${audit.total}`);
  console.log(`   has_hookah:   ${audit.has_hookah}/${audit.total}`);
  
  db.close();
}

main().catch(console.error);
