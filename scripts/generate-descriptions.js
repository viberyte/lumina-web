import Database from 'better-sqlite3';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

async function generateDescription(venue) {
  const vibe_tags = venue.vibe_tags ? JSON.parse(venue.vibe_tags) : [];
  const music_genres = venue.music_genres ? JSON.parse(venue.music_genres) : [];
  const cuisine_types = venue.cuisine_types ? JSON.parse(venue.cuisine_types) : [];
  
  const prompt = `Write a 1-2 sentence venue description for:

Name: ${venue.name}
Category: ${venue.category}
Neighborhood: ${venue.neighborhood}, ${venue.city}
${vibe_tags.length > 0 ? `Vibes: ${vibe_tags.join(', ')}` : ''}
${music_genres.length > 0 ? `Music: ${music_genres.join(', ')}` : ''}
${cuisine_types.length > 0 ? `Cuisine: ${cuisine_types.join(', ')}` : ''}
${venue.price_tier ? `Price: ${venue.price_tier}` : ''}

Make it compelling, concise, and capture the essence. No marketing fluff. 1-2 sentences max.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 100,
  });

  return response.choices[0].message.content.trim();
}

async function main() {
  const db = new Database(dbPath);
  
  const venues = db.prepare(`
    SELECT id, name, category, neighborhood, city, vibe_tags, music_genres, 
           cuisine_types, price_tier
    FROM venues
    WHERE (description IS NULL OR description = '')
      AND should_exclude = 0
    ORDER BY id
  `).all();
  
  console.log(`Generating descriptions for ${venues.length} venues\n`);
  
  const updateStmt = db.prepare('UPDATE venues SET description = ? WHERE id = ?');
  
  let completed = 0;
  let failed = 0;
  
  for (const venue of venues) {
    try {
      console.log(`[${completed + 1}/${venues.length}] ${venue.name}...`);
      
      const description = await generateDescription(venue);
      updateStmt.run(description, venue.id);
      
      completed++;
      console.log(`  ✅ "${description}"\n`);
      
      // Rate limiting
      if (completed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      failed++;
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  db.close();
  
  console.log('='.repeat(60));
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
