import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import OpenAI from 'openai';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const INSTAGRAM_POSTS_PATH = '/opt/viberyte/lumina-web/data/apify/instagram-posts.csv';
const INSTAGRAM_HANDLES = '/opt/viberyte/lumina-web/data/new-handles.txt';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const db = new sqlite3.Database(DB_PATH);

console.log('🚀 LUMINA V2 - MASTER VENUE PROCESSOR');
console.log('=====================================\n');

// Test connection
db.get('SELECT COUNT(*) as count FROM venues', (err, row) => {
  if (err) {
    console.error('❌ Database error:', err);
    process.exit(1);
  }
  console.log(`✅ Connected to database`);
  console.log(`📊 Current venues: ${row.count}\n`);
});

async function generateVenueTags(venue) {
  console.log(`  🏷️  Tagging: ${venue.name}...`);

  const prompt = `You are an expert nightlife curator. Analyze this venue and generate comprehensive tags.

VENUE: ${venue.name}
CATEGORY: ${venue.category || 'unknown'}
CUISINE: ${venue.cuisine_primary || 'unknown'}
LOCATION: ${venue.neighborhood}, ${venue.city}
PRICE: ${venue.price_tier || 'unknown'}
BIO: ${venue.bio || 'none'}

Generate EXTENSIVE tags (20-50+ total) covering:
- Primary vibes (upscale, trendy, romantic, casual, etc.)
- Secondary vibes (instagram-worthy, quiet, loud, etc.)
- Cuisine style (upscale-italian, casual-mexican, etc.)
- Music genres (afrobeats, jazz, hip-hop, etc.)
- Atmosphere (dimly-lit, spacious, cozy, etc.)
- Energy level (calm/moderate/lively/high)
- Contextual suitability (first date, girls night, pregame, etc.)

OUTPUT ONLY VALID JSON, NO MARKDOWN:
{
  "primary_vibes": ["romantic", "upscale", "trendy"],
  "secondary_vibes": ["instagram-worthy", "quiet"],
  "cuisine_style": "upscale-italian",
  "cuisine_details": ["pasta-focused", "wine-heavy"],
  "music_genres": ["jazz", "live-music"],
  "atmosphere": ["dimly-lit", "intimate", "cozy"],
  "energy_level": "moderate",
  "energy_progression": ["can_wind_down"],
  "contextual_suitability": {
    "first_date_suitable": true,
    "anniversary_suitable": true,
    "girls_night_suitable": false,
    "guys_night_suitable": false,
    "pregame_spot": false,
    "brunch_spot": false,
    "late_night_spot": false,
    "solo_friendly": true,
    "large_group_suitable": false
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const tags = JSON.parse(content);
    console.log(`    ✅ Generated tags`);
    return tags;
    
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return null;
  }
}

async function processInstagramMedia() {
  console.log('\n📸 Processing Instagram media...\n');

  const csvContent = fs.readFileSync(INSTAGRAM_POSTS_PATH, 'utf-8');
  const posts = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${posts.length} Instagram posts\n`);

  const venueMedia = {};
  
  posts.forEach(post => {
    const username = post.ownerUsername;
    if (!username) return;
    
    if (!venueMedia[username]) {
      venueMedia[username] = [];
    }
    
    if (post.displayUrl) {
      venueMedia[username].push({ type: 'image', url: post.displayUrl });
    }
    
    if (post.videoUrl) {
      venueMedia[username].push({ type: 'video', url: post.videoUrl });
    }
    
    // Carousel media
    for (let i = 0; i < 20; i++) {
      const childUrl = post[`childPosts/${i}/displayUrl`];
      const childVideo = post[`childPosts/${i}/videoUrl`];
      
      if (childUrl) venueMedia[username].push({ type: 'image', url: childUrl });
      if (childVideo) venueMedia[username].push({ type: 'video', url: childVideo });
    }
  });

  console.log(`Grouped media for ${Object.keys(venueMedia).length} venues\n`);
  
  for (const [username, media] of Object.entries(venueMedia)) {
    const uniqueMedia = Array.from(new Set(media.map(m => JSON.stringify(m)))).map(m => JSON.parse(m));
    const mediaJson = JSON.stringify(uniqueMedia.slice(0, 15));
    
    await new Promise((resolve) => {
      db.run(
        `UPDATE venues SET professional_photos = ? WHERE instagram_handle = ?`,
        [mediaJson, username],
        () => {
          console.log(`  ✅ @${username} (${uniqueMedia.length} items)`);
          resolve();
        }
      );
    });
  }
}

async function addNewVenues() {
  console.log('\n🆕 Adding new venues...\n');

  const handles = fs.readFileSync(INSTAGRAM_HANDLES, 'utf-8')
    .split('\n')
    .filter(h => h.trim());

  let added = 0;
  
  for (const handle of handles) {
    const exists = await new Promise((resolve) => {
      db.get(`SELECT id FROM venues WHERE instagram_handle = ?`, [handle], (err, row) => resolve(!!row));
    });

    if (exists) continue;

    await new Promise((resolve) => {
      db.run(
        `INSERT INTO venues (name, instagram_handle, category, city, state, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [handle, handle, 'dining', 'New York', 'NY'],
        () => {
          console.log(`  ✅ @${handle}`);
          added++;
          resolve();
        }
      );
    });
  }

  console.log(`\n✅ Added ${added} new venues\n`);
}

async function tagifyAllVenues() {
  console.log('\n🏷️  Comprehensive tagification...\n');

  const venues = await new Promise((resolve) => {
    db.all(`SELECT * FROM venues`, (err, rows) => resolve(rows || []));
  });

  console.log(`Tagifying ${venues.length} venues (testing with 10 first)\n`);

  let processed = 0;
  
  for (const venue of venues) {
    console.log(`\n[${++processed}/${venues.length}] ${venue.name}`);
    
    const tags = await generateVenueTags(venue);
    if (!tags) continue;
    
    await new Promise((resolve) => {
      db.run(
        `UPDATE venues SET 
          primary_vibes = ?,
          secondary_vibes = ?,
          cuisine_style = ?,
          music_genres = ?,
          atmosphere_tags = ?,
          energy_level = ?,
          first_date_suitable = ?,
          girls_night_suitable = ?,
          pregame_spot = ?,
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          JSON.stringify(tags.primary_vibes || []),
          JSON.stringify(tags.secondary_vibes || []),
          tags.cuisine_style || null,
          JSON.stringify(tags.music_genres || []),
          JSON.stringify(tags.atmosphere || []),
          tags.energy_level || null,
          tags.contextual_suitability?.first_date_suitable ? 1 : 0,
          tags.contextual_suitability?.girls_night_suitable ? 1 : 0,
          tags.contextual_suitability?.pregame_spot ? 1 : 0,
          venue.id
        ],
        () => {
          console.log(`  ✅ Tagged!`);
          resolve();
        }
      );
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n🎉 Complete!\n`);
}

async function main() {
  try {
    await addNewVenues();
    await processInstagramMedia();
    await tagifyAllVenues();
    
    console.log('\n✅ ALL DONE!\n');
    db.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
