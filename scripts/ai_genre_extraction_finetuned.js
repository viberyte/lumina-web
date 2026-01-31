import Database from 'better-sqlite3';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, '../data/lumina.db'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const FINE_TUNED_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

async function extractGenres(name, description) {
  const prompt = `Extract music genres from this nightlife event. Valid genres: Afrobeats, Hip-Hop, Latin, EDM, House, Techno, R&B, Reggae, Dancehall, Jazz, Rock, Pop, Live Music.

Event: ${name}
Description: ${description?.substring(0, 400) || ''}

Return ONLY a JSON array: ["Genre1", "Genre2"]`;

  try {
    const response = await openai.chat.completions.create({
      model: FINE_TUNED_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 50
    });
    
    const content = response.choices[0].message.content.trim();
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const genres = JSON.parse(cleaned);
    return Array.isArray(genres) ? genres : ['House'];
  } catch (error) {
    console.error('Error:', error.message);
    return ['House'];
  }
}

async function processEvents() {
  console.log('Using fine-tuned model for genre extraction...');
  
  const events = db.prepare(`
    SELECT id, name, description 
    FROM events 
    WHERE music_genre IS NULL 
    AND source_type IN ('resident_advisor', 'posh', 'joonbug', 'dice')
    LIMIT 500
  `).all();
  
  console.log(`Processing ${events.length} events with fine-tuned model`);
  
  let updated = 0;
  let batch = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    const genres = await extractGenres(event.name, event.description);
    
    if (genres.length > 0) {
      db.prepare('UPDATE events SET music_genres = ?, music_genre = ? WHERE id = ?')
        .run(JSON.stringify(genres), genres[0], event.id);
      updated++;
      
      if (updated % 25 === 0) {
        console.log(`[${updated}/${events.length}] Processed...`);
      }
    }
    
    // Rate limiting: 100 requests per minute
    await new Promise(resolve => setTimeout(resolve, 650));
  }
  
  console.log(`\nCompleted! Updated ${updated} events using fine-tuned model`);
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN music_genre IS NOT NULL THEN 1 ELSE 0 END) as with_genre
    FROM events
  `).get();
  
  console.log(`Final stats: ${stats.with_genre}/${stats.total} events (${(stats.with_genre/stats.total*100).toFixed(1)}%)`);
  
  db.close();
}

processEvents().catch(console.error);
