import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/lumina.db');
const db = new Database(dbPath);

async function generateEventImages() {
  console.log('Starting event image generation...');
  
  const events = db.prepare(`
    SELECT e.id, e.name, e.venue_name, e.music_genre, e.music_genres, 
           e.description, e.vibe_tags, e.source_type, v.image_url as venue_photo
    FROM events e
    LEFT JOIN venues v ON e.venue_name = v.name
    WHERE e.image_url IS NULL OR e.image_url = ''
    ORDER BY e.source_type, e.id
  `).all();
  
  console.log(`Found ${events.length} events without images`);
  
  let updated = 0;
  let useVenuePhoto = 0;
  let generated = 0;
  
  for (const event of events) {
    try {
      if (event.venue_photo) {
        db.prepare('UPDATE events SET image_url = ? WHERE id = ?')
          .run(event.venue_photo, event.id);
        useVenuePhoto++;
        console.log(`[${event.id}] Used venue photo: ${event.name}`);
        continue;
      }
      
      const genres = (event.music_genres || event.music_genre || '').toLowerCase();
      let placeholderUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819';
      
      if (genres.includes('afrobeat')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f';
      } else if (genres.includes('hip-hop') || genres.includes('hiphop')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89';
      } else if (genres.includes('edm') || genres.includes('house') || genres.includes('electronic')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3';
      } else if (genres.includes('latin') || genres.includes('reggaeton') || genres.includes('salsa')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1511192336575-5a79af67a629';
      } else if (genres.includes('jazz') || genres.includes('live')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f';
      } else if (genres.includes('r&b') || genres.includes('rnb') || genres.includes('soul')) {
        placeholderUrl = 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae';
      }
      
      db.prepare('UPDATE events SET image_url = ? WHERE id = ?')
        .run(placeholderUrl, event.id);
      generated++;
      
      if (updated % 100 === 0) {
        console.log(`[${event.id}] Generated placeholder: ${event.name}`);
      }
      
      updated++;
      
      if (updated % 200 === 0) {
        console.log(`Processed ${updated}/${events.length}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error.message);
    }
  }
  
  console.log('\nEvent image generation complete!');
  console.log(`Stats:`);
  console.log(`   - Used venue photos: ${useVenuePhoto}`);
  console.log(`   - Generated placeholders: ${generated}`);
  console.log(`   - Total updated: ${updated}`);
  
  db.close();
}

generateEventImages().catch(console.error);
