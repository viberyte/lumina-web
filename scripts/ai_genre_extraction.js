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

const VALID_GENRES = ['Afrobeats', 'Hip-Hop', 'Latin', 'EDM', 'House', 'R&B', 'Reggae', 'Jazz', 'Rock', 'Pop', 'Techno', 'Dancehall', 'Live Music'];

async function extractGenres(name, description) {
  const prompt = `Extract music genres from this event. Return ONLY a JSON array of genres from this list: ${VALID_GENRES.join(', ')}.

Event: ${name}
Description: ${description?.substring(0, 500) || 'No description'}

Return format: ["Genre1", "Genre2"]
If uncertain, return ["House"]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50
    });
    
    const content = response.choices[0].message.content.trim();
    const genres = JSON.parse(content);
    return Array.isArray(genres) ? genres : ['House'];
  } catch (error) {
    console.error('AI error:', error.message);
    return ['House']; // Default fallback
  }
}

async function processEvents() {
  console.log('Starting AI genre extraction...');
  
  const events = db.prepare(`
    SELECT id, name, description 
    FROM events 
    WHERE music_genre IS NULL 
    AND source_type IN ('resident_advisor', 'posh', 'joonbug', 'dice')
    LIMIT 100
  `).all();
  
  console.log(`Processing ${events.length} events (limited to 100 for cost control)`);
  
  let updated = 0;
  
  for (const event of events) {
    const genres = await extractGenres(event.name, event.description);
    
    if (genres.length > 0) {
      db.prepare('UPDATE events SET music_genres = ?, music_genre = ? WHERE id = ?')
        .run(JSON.stringify(genres), genres[0], event.id);
      updated++;
      console.log(`[${updated}/${events.length}] ${event.name} → ${genres.join(', ')}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\nCompleted! Updated ${updated} events`);
  db.close();
}

processEvents().catch(console.error);
