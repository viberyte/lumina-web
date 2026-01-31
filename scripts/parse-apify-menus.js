import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const csvPath = '/opt/viberyte/lumina-web/dataset_website-content-crawler_2025-11-11_05-30-52-397.csv';

const openai = new OpenAI({
  apiKey: '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'
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractAllDataWithGPT(venueName, scrapedText) {
  try {
    const prompt = `Extract ALL relevant data from this restaurant/venue website.

Venue: ${venueName}

Website Text:
${scrapedText.substring(0, 8000)}

Return ONLY valid JSON (no markdown, no backticks):
{
  "menu": [
    {"item": "Dish Name", "price": 25.00, "category": "Appetizers", "description": "brief", "is_signature": false}
  ],
  "events": [
    {"title": "Event Name", "date": "2025-11-15", "time": "9:00 PM", "description": "DJ night", "recurring": "weekly"}
  ],
  "happy_hour": {
    "available": true,
    "times": "5-7pm weekdays",
    "details": "50% off drinks and apps"
  },
  "bio": "Enhanced 2-3 sentence description of the venue's atmosphere, specialty, and vibe",
  "photos": ["https://example.com/photo1.jpg"],
  "specials": [{"day": "Tuesday", "special": "Taco Tuesday"}],
  "dress_code": "Smart casual",
  "reservations": "Required on weekends",
  "signature_dishes": ["Dish 1", "Dish 2"]
}

Rules:
- menu: Only items with clear prices
- events: Upcoming events, DJ nights, live music
- happy_hour: Times and details if mentioned
- bio: Rewrite in engaging way
- photos: Extract image URLs
- specials: Weekly deals
- If section not found, use null or empty array`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 3000
    });

    const responseText = completion.choices[0].message.content?.trim() || '{}';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]);
    return data;
  } catch (error) {
    console.error(`   ERROR: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('APIFY COMPLETE DATA EXTRACTOR\n');
  console.log('Reading CSV file...');
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '').trim();
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`Found ${records.length.toLocaleString()} scraped pages\n`);
  
  const db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS venue_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      event_date TEXT,
      event_time TEXT,
      description TEXT,
      recurring TEXT,
      source TEXT DEFAULT 'apify',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    )
  `);
  
  const venues = db.prepare(`SELECT id, name, website FROM venues WHERE viberyte_certified = 1 AND website IS NOT NULL ORDER BY id`).all();
  console.log(`Processing ${venues.length} venues\n`);
  
  let stats = {
    processed: 0,
    menusFound: 0,
    totalMenuItems: 0,
    eventsFound: 0,
    totalEvents: 0,
    happyHours: 0,
    biosUpdated: 0
  };
  
  for (const venue of venues) {
    stats.processed++;
    console.log(`\n[${stats.processed}/${venues.length}] ${venue.name}`);
    
    const domain = new URL(venue.website).hostname.replace('www.', '');
    const venuePages = records.filter(r => r.url.includes(domain));
    
    if (venuePages.length === 0) {
      console.log('   No pages found');
      continue;
    }
    
    console.log(`   Found ${venuePages.length} pages`);
    const combinedText = venuePages.map(p => p.text).join('\n\n');
    
    console.log('   Extracting data...');
    const data = await extractAllDataWithGPT(venue.name, combinedText);
    
    if (!data) {
      console.log('   Extraction failed');
      await sleep(500);
      continue;
    }
    
    if (data.menu && data.menu.length > 0) {
      console.log(`   Menu: ${data.menu.length} items`);
      stats.menusFound++;
      stats.totalMenuItems += data.menu.length;
      
      const insertItem = db.prepare(`INSERT INTO menu_items (venue_id, category, item_name, description, price, is_signature, source) VALUES (?, ?, ?, ?, ?, ?, 'apify')`);
      const insertMenu = db.prepare(`INSERT OR REPLACE INTO venue_menus (venue_id, has_menu, menu_url, menu_source, total_items, last_scraped, scrape_status) VALUES (?, 1, ?, 'apify', ?, datetime('now'), 'success')`);
      
      const menuTransaction = db.transaction(() => {
        for (const item of data.menu) {
          insertItem.run(venue.id, item.category || 'Other', item.item, item.description || null, item.price, item.is_signature ? 1 : 0);
        }
        insertMenu.run(venue.id, venue.website, data.menu.length);
      });
      
      menuTransaction();
    }
    
    if (data.events && data.events.length > 0) {
      console.log(`   Events: ${data.events.length}`);
      stats.eventsFound++;
      stats.totalEvents += data.events.length;
      
      const insertEvent = db.prepare(`INSERT INTO venue_events (venue_id, title, event_date, event_time, description, recurring) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const event of data.events) {
        insertEvent.run(venue.id, event.title, event.date || null, event.time || null, event.description || null, event.recurring || null);
      }
    }
    
    if (data.happy_hour && data.happy_hour.available) {
      console.log(`   Happy Hour: ${data.happy_hour.times}`);
      stats.happyHours++;
    }
    
    if (data.bio) {
      db.prepare(`UPDATE venues SET description = ? WHERE id = ?`).run(data.bio, venue.id);
      stats.biosUpdated++;
      console.log('   Bio updated');
    }
    
    console.log('   Complete');
    await sleep(2000);
    
    if (stats.processed % 10 === 0) {
      console.log(`\nPROGRESS: ${stats.processed}/${venues.length} | Menus: ${stats.menusFound} (${stats.totalMenuItems} items) | Events: ${stats.eventsFound} (${stats.totalEvents} events)`);
    }
  }
  
  db.close();
  
  console.log(`\n\nEXTRACTION COMPLETE!`);
  console.log(`Processed: ${stats.processed} venues`);
  console.log(`Menus: ${stats.menusFound} (${stats.totalMenuItems} items)`);
  console.log(`Events: ${stats.eventsFound} venues (${stats.totalEvents} events)`);
  console.log(`Happy Hours: ${stats.happyHours}`);
  console.log(`Bios Enhanced: ${stats.biosUpdated}`);
  console.log(`Success rate: ${Math.round(stats.menusFound / stats.processed * 100)}%`);
}

main().catch(console.error);
