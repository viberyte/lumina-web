import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 15;
const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

const VIBE_TAGS = [
  'afrobeats', 'amapiano', 'hip-hop', 'r&b', 'latin', 'reggaeton', 
  'house', 'techno', 'edm', 'dancehall', 'soca', 'kompa', 'jazz',
  'live-music', 'dj-set', 'rooftop', 'lounge', 'club', 'day-party',
  'brunch', 'late-night', 'upscale', 'casual', 'lgbtq', 'date-night',
  'girls-night', 'bottle-service', 'free-entry', 'outdoor', 'warehouse'
];

const CROWD_TYPES = [
  'mixed', 'black', 'latino', 'caribbean', 'lgbtq', 
  'young-professional', 'college', 'mature', 'diverse', 'international'
];

async function enrichEvents() {
  console.log('🤖 AI EVENT ENRICHMENT\n');
  console.log(`Using model: ${MODEL}\n`);
  
  // Get events needing enrichment
  const events = db.prepare(`
    SELECT id, name, venue_name, description, music_genre, city, time
    FROM events 
    WHERE event_date >= date('now') 
      AND (vibe_tags IS NULL OR vibe_tags = '')
      AND name IS NOT NULL
      AND name != ''
    ORDER BY event_date ASC
    LIMIT 5000
  `).all();
  
  console.log(`Found ${events.length} events to enrich\n`);
  
  if (events.length === 0) {
    console.log('✅ All events already enriched!');
    return;
  }
  
  const updateStmt = db.prepare(`
    UPDATE events SET 
      vibe_tags = ?,
      music_genres = ?,
      why_go = ?,
      crowd_type = ?,
      enriched_at = datetime('now')
    WHERE id = ?
  `);
  
  let enriched = 0;
  
  // Process in batches
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(events.length/BATCH_SIZE)}...`);
    
    const prompt = `You are Lumina's nightlife intelligence system. Analyze these NYC events and return a JSON array.

For each event, provide:
- id (from input)
- vibe_tags (array of 2-5 tags from: ${VIBE_TAGS.join(', ')})
- music_genres (array of 1-3 genres)
- why_go (1 sentence hook, max 100 chars, exciting and specific)
- crowd_type (1-2 from: ${CROWD_TYPES.join(', ')})

Events to analyze:
${JSON.stringify(batch.map(e => ({
  id: e.id,
  name: e.name,
  venue: e.venue_name,
  description: (e.description || '').substring(0, 200),
  time: e.time
})), null, 2)}

Return ONLY valid JSON array, no markdown or explanation.`;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const content = response.choices[0].message.content.trim();
      
      // Parse JSON (handle markdown wrapper)
      let results;
      try {
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        results = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.log('   ⚠️ Parse error, skipping batch');
        continue;
      }
      
      // Update database
      for (const r of results) {
        try {
          updateStmt.run(
            Array.isArray(r.vibe_tags) ? r.vibe_tags.join(',') : r.vibe_tags,
            Array.isArray(r.music_genres) ? r.music_genres.join(',') : r.music_genres,
            r.why_go || '',
            Array.isArray(r.crowd_type) ? r.crowd_type.join(',') : r.crowd_type,
            r.id
          );
          enriched++;
          console.log(`   ✅ ${batch.find(e => e.id === r.id)?.name?.substring(0, 40)}`);
        } catch (err) {}
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.log(`   ❌ API error: ${err.message}`);
    }
  }
  
  console.log(`\n🎉 Enriched ${enriched} events!`);
  
  // Show sample
  const sample = db.prepare(`
    SELECT name, vibe_tags, music_genres, why_go, crowd_type 
    FROM events 
    WHERE vibe_tags IS NOT NULL AND vibe_tags != ''
    ORDER BY enriched_at DESC 
    LIMIT 5
  `).all();
  
  console.log('\n📋 Sample enriched events:');
  sample.forEach(e => {
    console.log(`\n   ${e.name}`);
    console.log(`   Vibes: ${e.vibe_tags}`);
    console.log(`   Why go: ${e.why_go}`);
  });
  
  db.close();
}

enrichEvents().catch(console.error);
