/**
 * IMPORT 1,641 EVENTS FROM JSON FILES
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('📅 IMPORTING EVENTS\n');

db.prepare('DELETE FROM events').run();
console.log('✅ Cleared old events\n');

const files = [
  '/opt/viberyte/lumina-web/data/events/dice-2025-11-04.json',
  '/opt/viberyte/lumina-web/data/events/posh-2025-11-04-v2.json',
  '/opt/viberyte/lumina-web/data/events/tao-2025-11-04.json'
];

const insertStmt = db.prepare(`
  INSERT INTO events (
    name, venue_name, date, time, description,
    music_genre, price, ticket_url, image_url,
    city, neighborhood, tags
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let imported = 0;

files.forEach(file => {
  try {
    console.log(`📂 ${file.split('/').pop()}...`);
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    
    data.forEach(event => {
      try {
        insertStmt.run(
          event.name || event.title || 'Event',
          event.venue_name || event.venue || null,
          event.date || event.event_date || null,
          event.time || event.start_time || null,
          event.description || null,
          event.music_genre || event.genre || null,
          event.price || null,
          event.ticket_url || event.url || null,
          event.image_url || event.image || null,
          event.city || 'New York',
          event.neighborhood || null,
          event.tags ? JSON.stringify(event.tags) : null
        );
        imported++;
      } catch (err) {}
    });
    
    console.log(`  ✅ ${data.length} events`);
    
  } catch (err) {
    console.log(`  ⚠️  Error: ${err.message}`);
  }
});

console.log(`\n✅ IMPORTED ${imported} EVENTS\n`);

db.close();
