import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';
const CONCURRENCY = 10;
const BATCH_SIZE = 400;

// Only nightlife venues missing music_genres
const getVenues = () => db.prepare(`
  SELECT id, name, category, bio, known_for, description, unified_tags, lounge_type, city, neighborhood
  FROM venues 
  WHERE should_exclude = 0
    AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
    AND (music_genres IS NULL OR music_genres = '' OR music_genres = '[]' OR music_genres = '["mixed"]')
    AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
      OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
      OR (image_url IS NOT NULL AND image_url != ''))
  ORDER BY category, id
  LIMIT ?
`).all(BATCH_SIZE);

const SYSTEM_PROMPT = `You classify music genres for nightlife venues. Based on the venue info, determine what music genres are played there. Output ONLY valid JSON:

{
  "music_genres": ["genre1", "genre2"],
  "confidence": 0.8
}

Use ONLY these genres:
- "hip-hop" - Hip-hop, rap, trap
- "r&b" - R&B, neo-soul
- "afrobeats" - Afrobeats, amapiano, afro-house
- "dancehall" - Dancehall, reggae
- "soca" - Soca, Caribbean party music
- "latin" - Latin, salsa, merengue, bachata
- "reggaeton" - Reggaeton, dembow
- "house" - House music, deep house
- "edm" - EDM, electronic, techno
- "live-jazz" - Live jazz performances
- "live-band" - Live band, cover bands
- "top-40" - Top 40, mainstream pop
- "mixed" - Multiple genres, varies by night

Be specific. If a venue is Caribbean-themed, use "afrobeats", "dancehall", "soca". If Latin-themed, use "latin", "reggaeton". Only use "mixed" if you truly cannot determine.

Confidence: 0.9 if strong signals, 0.7 if moderate, 0.5 if guessing.
Output ONLY JSON.`;

async function enrichVenue(venue) {
  const context = `Name: ${venue.name}
Category: ${venue.category}
Lounge Type: ${venue.lounge_type || 'none'}
City: ${venue.city}, ${venue.neighborhood || ''}
Bio: ${venue.bio || 'N/A'}
Known for: ${venue.known_for || 'N/A'}
Description: ${venue.description || 'N/A'}
Tags: ${venue.unified_tags || '[]'}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: context }],
      temperature: 0.2,
      max_tokens: 200
    });
    const content = response.choices[0].message.content.trim().replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(content);
    return { id: venue.id, name: venue.name, ...parsed };
  } catch (err) {
    console.error(`✗ ${venue.name}: ${err.message}`);
    return null;
  }
}

async function processBatch(venues) {
  return (await Promise.all(venues.map(enrichVenue))).filter(Boolean);
}

async function main() {
  console.log('🎵 Music Genre Enrichment');
  console.log(`Model: ${MODEL}\n`);
  
  const venues = getVenues();
  console.log(`📊 Found ${venues.length} nightlife venues to enrich\n`);

  if (venues.length === 0) {
    console.log('✅ All nightlife venues already have music genres!');
    db.close();
    return;
  }

  const updateStmt = db.prepare(`UPDATE venues SET music_genres = ? WHERE id = ?`);

  let enriched = 0, failed = 0, skipped = 0;

  for (let i = 0; i < venues.length; i += CONCURRENCY) {
    const batch = venues.slice(i, i + CONCURRENCY);
    const results = await processBatch(batch);
    
    for (const r of results) {
      try {
        // Only update if confidence >= 0.6 and has specific genres
        if (r.confidence >= 0.6 && r.music_genres && r.music_genres.length > 0 && !r.music_genres.includes('mixed')) {
          updateStmt.run(JSON.stringify(r.music_genres), r.id);
          console.log(`✓ ${r.name} → ${r.music_genres.join(', ')} (${r.confidence})`);
          enriched++;
        } else if (r.music_genres && r.music_genres.length > 0) {
          // Low confidence or mixed - still update but note it
          updateStmt.run(JSON.stringify(r.music_genres), r.id);
          console.log(`~ ${r.name} → ${r.music_genres.join(', ')} (${r.confidence}) [low confidence]`);
          enriched++;
        } else {
          console.log(`- ${r.name} → skipped (no genres)`);
          skipped++;
        }
      } catch (e) { 
        console.error(`✗ DB error ${r.name}: ${e.message}`); 
        failed++; 
      }
    }
    
    const pct = Math.round((i + batch.length) / venues.length * 100);
    console.log(`--- ${pct}% (${enriched} enriched, ${skipped} skipped, ${failed} failed) ---\n`);
  }

  console.log(`\n✅ Complete: ${enriched}/${venues.length} venues enriched`);
  
  // Audit
  const audit = db.prepare(`
    SELECT music_genres, COUNT(*) as cnt
    FROM venues
    WHERE should_exclude = 0 AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
      AND music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]'
    GROUP BY music_genres
    ORDER BY cnt DESC
    LIMIT 20
  `).all();
  
  console.log('\n📊 Top Music Genres:');
  audit.forEach(r => console.log(`   ${r.music_genres}: ${r.cnt}`));
  
  db.close();
}

main().catch(console.error);
