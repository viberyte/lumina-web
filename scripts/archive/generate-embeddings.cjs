const Database = require('better-sqlite3');
const OpenAI = require('openai');

async function main() {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log('🧠 Generating venue embeddings...\n');

  // Add embedding column if it doesn't exist
  try {
    db.exec(`ALTER TABLE venues ADD COLUMN embedding TEXT`);
    console.log('✅ Added embedding column');
  } catch (e) {
    console.log('⏭️  Embedding column already exists');
  }

  // Get all venues without embeddings
  const venues = db.prepare(`
    SELECT id, name, city, neighborhood, category, cuisine_primary, 
           vibe_tags, music_genres_normalized, description, ideal_for,
           special_features, price_tier
    FROM venues 
    WHERE should_exclude = 0 
    AND embedding IS NULL
    LIMIT 100
  `).all();

  console.log(`📊 Processing ${venues.length} venues...\n`);

  let processed = 0;
  let failed = 0;

  for (const venue of venues) {
    try {
      // Create rich description
      const vibes = venue.vibe_tags ? JSON.parse(venue.vibe_tags).join(', ') : 'casual';
      const music = venue.music_genres_normalized ? JSON.parse(venue.music_genres_normalized).join(', ') : '';
      
      const description = `
${venue.name} is a ${venue.cuisine_primary || venue.category} venue in ${venue.neighborhood || venue.city}.
Atmosphere: ${vibes}
${music ? `Music: ${music}` : ''}
${venue.ideal_for ? `Perfect for: ${venue.ideal_for}` : ''}
${venue.special_features ? `Known for: ${venue.special_features}` : ''}
${venue.price_tier ? `Price: ${venue.price_tier}` : ''}
${venue.description || ''}
      `.trim();
      
      // Generate embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: description
      });
      
      const embedding = JSON.stringify(response.data[0].embedding);
      
      // Save to database
      db.prepare(`UPDATE venues SET embedding = ? WHERE id = ?`).run(embedding, venue.id);
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`✅ Processed ${processed}/${venues.length} venues`);
      }
      
      // Rate limit: ~3 requests/second
      await new Promise(resolve => setTimeout(resolve, 350));
      
    } catch (error) {
      console.error(`❌ Failed for ${venue.name}:`, error.message);
      failed++;
    }
  }

  db.close();

  console.log(`\n🎉 Done! Processed: ${processed}, Failed: ${failed}`);
  console.log(`💰 Cost: ~$${(processed * 0.00002).toFixed(4)}`);
}

main().catch(console.error);
