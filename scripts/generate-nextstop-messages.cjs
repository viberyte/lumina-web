const Database = require('better-sqlite3');
const https = require('https');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// First, add the column if it doesn't exist
try {
  db.exec(`ALTER TABLE venues ADD COLUMN nextstop_messages TEXT`);
  console.log('Added nextstop_messages column');
} catch (e) {
  console.log('Column already exists');
}

// Get venues with good data
const venues = db.prepare(`
  SELECT 
    id, name, category, 
    energy_level, music_genres, vibe_tags, primary_vibes,
    crowd_type_tags, price_tier, hours_json,
    first_date_suitable, girls_night_suitable, birthday_suitable
  FROM venues 
  WHERE google_photos IS NOT NULL 
    AND google_photos != '' 
    AND google_photos != '[]'
  LIMIT ?
`).all(parseInt(process.env.BATCH_SIZE || '50'));

console.log(`Generating messages for ${venues.length} venues...`);

function callOpenAI(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateMessages(venue) {
  const musicGenres = venue.music_genres ? JSON.parse(venue.music_genres).slice(0, 3).join(', ') : '';
  const vibeTags = venue.vibe_tags ? JSON.parse(venue.vibe_tags).slice(0, 3).join(', ') : '';
  const crowdTags = venue.crowd_type_tags ? JSON.parse(venue.crowd_type_tags).slice(0, 2).join(', ') : '';
  
  const prompt = `Generate 5 short, casual "Continue the Night" messages for this venue. These appear when suggesting this venue as a NEXT STOP after another venue.

VENUE: ${venue.name}
TYPE: ${venue.category}
ENERGY: ${venue.energy_level || 'moderate'}
MUSIC: ${musicGenres || 'varied'}
VIBE: ${vibeTags || 'good vibes'}
CROWD: ${crowdTags || 'mixed'}
GOOD FOR: ${[
  venue.first_date_suitable ? 'dates' : '',
  venue.girls_night_suitable ? 'girls night' : '',
  venue.birthday_suitable ? 'celebrations' : ''
].filter(Boolean).join(', ') || 'any occasion'}

Rules:
- Max 8 words each
- Sound like a local friend, not marketing
- No emojis
- Mention specific things (music, vibe, crowd, timing)
- Vary the style (some about energy, some about crowd, some about timing)

Examples of good messages:
- "DJ starts at 11, worth the wait"
- "Chill crowd, easy to talk"
- "Gets packed after midnight"
- "Strong cocktails, dim lighting"
- "Good reset spot before round two"

Return ONLY a JSON array of 5 strings, nothing else:
["message1", "message2", "message3", "message4", "message5"]`;

  try {
    const response = await callOpenAI(prompt);
    // Extract JSON array from response
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      const messages = JSON.parse(match[0]);
      return messages;
    }
  } catch (e) {
    console.error(`Error for ${venue.name}:`, e.message);
  }
  return null;
}

async function main() {
  const updateStmt = db.prepare(`UPDATE venues SET nextstop_messages = ? WHERE id = ?`);
  let processed = 0;

  for (const venue of venues) {
    const messages = await generateMessages(venue);
    if (messages && messages.length > 0) {
      updateStmt.run(JSON.stringify(messages), venue.id);
      console.log(`${venue.name}: ${messages[0]}`);
      processed++;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Generated messages for ${processed} venues`);
  db.close();
}

main().catch(console.error);
