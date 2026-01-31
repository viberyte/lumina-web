import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Read Tao events
const events = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/events/tao-2025-12-18.json', 'utf-8'));

console.log(`\n🎉 Importing ${events.length} Tao Group Events\n`);

// Venue name mapping
const venueMap = {
  'loosies': 'Loosies',
  'taodowntown': 'Tao Downtown',
  'thefleurroomny': 'The Fleur Room', 
  'thehighlightroomny': 'The Highlight Room'
};

async function classifyGenre(eventName) {
  try {
    const prompt = `Classify this event by music genre. Event: "${eventName}"
    
Return ONLY ONE of: Hip-Hop, Afrobeats, House, Latin, R&B Soul, EDM, Reggae & Dancehall, Jazz, or Other`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 20
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    return 'Other';
  }
}

// Process unique events only
const uniqueEvents = [];
const seen = new Set();

for (const event of events) {
  const key = `${event.name}-${event.ticket_url}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueEvents.push(event);
  }
}

console.log(`✅ Deduplicated: ${uniqueEvents.length} unique events\n`);

let imported = 0;

for (const event of uniqueEvents) {
  // Extract venue from URL
  const venueMatch = event.ticket_url.match(/events\/([^\/]+)/);
  const venueSlug = venueMatch ? venueMatch[1] : null;
  const venueName = venueSlug ? (venueMap[venueSlug] || 'TAO Group Venue') : 'TAO Group Venue';

  // Classify genre
  const genre = await classifyGenre(event.name);
  
  console.log(`📍 ${event.name} → ${venueName} (${genre})`);

  // Parse date
  let eventDate = null;
  if (event.event_date) {
    try {
      const dateStr = event.event_date.replace(/(\w{3})(\d+)(\w+)/, '$1 $2 2025');
      eventDate = new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {}
  }

  // Insert event (using correct column names)
  db.prepare(`
    INSERT OR IGNORE INTO events (
      name, date, venue_name, music_genre, image_url, 
      ticket_url, promoter_name, city, source_type, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    event.name,
    eventDate,
    venueName,
    genre,
    event.image_url,
    event.ticket_url,
    'TAO Group',
    'Manhattan',
    'taogroup.com'
  );

  imported++;
  
  // Rate limit
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n✅ Imported ${imported} Tao Group events!`);
db.close();
