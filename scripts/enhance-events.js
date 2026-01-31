import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: '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' });

const GENRES = [
  'EDM', 'House', 'Tech House', 'Techno', 'Amapiano', 'Afrobeats', 
  'Hip-Hop', 'R&B', 'Latin', 'Reggaeton', 'Dancehall', 'Jazz', 
  'Live Music', 'Bass Music', 'Dubstep', 'Drum & Bass',
  'Disco', 'Soul', 'Funk', 'Pop', 'Reggae', 'Soca', 'Bachata', 'LGBTQ+'
];

async function enhanceEvents() {
  // Get events needing enhancement
  const events = db.prepare(`
    SELECT id, name, venue_name, date, time, music_genre, description, why_recommended
    FROM events 
    WHERE music_genre IS NULL OR music_genre = ''
       OR why_recommended IS NULL OR why_recommended = ''
       OR time IS NULL OR time = ''
    ORDER BY date ASC
    LIMIT 100
  `).all();
  
  console.log(`Enhancing ${events.length} events...\n`);
  
  let updated = 0;
  
  for (const event of events) {
    try {
      const response = await openai.chat.completions.create({
        model: 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2',
        messages: [{
          role: 'system',
          content: `You enhance nightlife event data. Return ONLY valid JSON with these fields:
{
  "genre": "one of: ${GENRES.join(', ')}",
  "time": "typical start time like 10:00 PM (nightclub=10-11PM, brunch=12-2PM, concert=7-9PM)",
  "description": "1-2 sentence exciting description of the event vibe (no venue policies or social media spam)",
  "why_recommended": "1 sentence why someone should go, be specific and enticing"
}`
        }, {
          role: 'user', 
          content: `Event: ${event.name}
Venue: ${event.venue_name || 'Unknown'}
Date: ${event.date}
Current time: ${event.time || 'missing'}
Current genre: ${event.music_genre || 'missing'}`
        }],
        temperature: 0.3
      });
      
      const content = response.choices[0].message.content.trim();
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        const updates = [];
        const params = [];
        
        if (data.genre && (!event.music_genre || event.music_genre === '')) {
          updates.push('music_genre = ?');
          params.push(data.genre);
        }
        if (data.time && (!event.time || event.time === '')) {
          updates.push('time = ?');
          params.push(data.time);
        }
        if (data.description) {
          updates.push('description = ?');
          params.push(data.description);
        }
        if (data.why_recommended && (!event.why_recommended || event.why_recommended === '')) {
          updates.push('why_recommended = ?');
          params.push(data.why_recommended);
        }
        
        if (updates.length > 0) {
          params.push(event.id);
          db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
          console.log(`✅ ${event.name}`);
          console.log(`   Genre: ${data.genre} | Time: ${data.time}`);
          updated++;
        }
      }
    } catch (err) {
      console.log(`❌ ${event.name}: ${err.message}`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n=== Done! Enhanced ${updated} events ===`);
}

enhanceEvents().catch(console.error);
