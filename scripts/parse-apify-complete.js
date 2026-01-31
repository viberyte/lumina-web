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
    const prompt = `Extract ALL data from this venue website and ADD new tags.

Venue: ${venueName}

Website Text:
${scrapedText.substring(0, 8000)}

Return ONLY valid JSON:
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
    "details": "50% off drinks"
  },
  "additional_tags": {
    "has_happy_hour": true,
    "has_live_music": false,
    "has_dj": true,
    "has_rooftop": false,
    "has_outdoor_seating": true,
    "has_private_events": false,
    "weekend_brunch": true,
    "late_night": true,
    "bottle_service": false
  },
  "bio": "Enhanced venue description",
  "specials": [{"day": "Tuesday", "special": "Taco Tuesday"}],
  "dress_code": "Smart casual",
  "signature_dishes": ["Dish 1", "Dish 2"]
}

Rules:
- menu: Items with prices only
- events: DJ nights, live music, special events
- happy_hour: Times and deals
- additional_tags: Set true/false based on website
- bio: Rewrite engagingly
- If not found, use null or empty array`;

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
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`   ERROR: ${error.message}`);
    return null;
  }
}

function addTags(existingTags, newTags) {
  const existing = existingTags ? existingTags.split(',').map(t => t.trim()) : [];
  const combined = [...new Set([...existing, ...newTags])];
  return combined.join(', ');
}

async function main() {
  console.log('APIFY COMPLETE EXTRACTOR + TAGGER\n');
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '').trim();
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`Found ${records.length.toLocaleString()} pages\n`);
  
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  const venues = db.prepare(`SELECT id, name, website, vibe_tags, time_tags FROM venues WHERE viberyte_certified = 1 AND website IS NOT NULL AND website != '' ORDER BY id`).all();
  console.log(`Processing ${venues.length} venues\n`);
  
  let stats = {
    processed: 0,
    menusFound: 0,
    totalMenuItems: 0,
    eventsFound: 0,
    totalEvents: 0,
    happyHours: 0,
    biosUpdated: 0,
    tagsAdded: 0
  };
  
  for (const venue of venues) {
    stats.processed++;
    console.log(`\n[${stats.processed}/${venues.length}] ${venue.name}`);
    
    // Validate URL
    let domain;
    try {
      domain = new URL(venue.website).hostname.replace('www.', '');
    } catch (err) {
      console.log('   Invalid URL, skipping');
      continue;
    }
    
    const venuePages = records.filter(r => r.url && r.url.includes(domain));
    
    if (venuePages.length === 0) {
      console.log('   No pages');
      continue;
    }
    
    console.log(`   ${venuePages.length} pages`);
    const combinedText = venuePages.map(p => p.text).join('\n\n');
    
    console.log('   Extracting...');
    const data = await extractAllDataWithGPT(venue.name, combinedText);
    
    if (!data) {
      await sleep(500);
      continue;
    }
    
    // MENU
    if (data.menu && data.menu.length > 0) {
      console.log(`   Menu: ${data.menu.length} items`);
      stats.menusFound++;
      stats.totalMenuItems += data.menu.length;
      
      const insertItem = db.prepare(`INSERT INTO menu_items (venue_id, category, item_name, description, price, is_signature, source) VALUES (?, ?, ?, ?, ?, ?, 'apify')`);
      const insertMenu = db.prepare(`INSERT OR REPLACE INTO venue_menus (venue_id, has_menu, menu_url, menu_source, total_items, last_scraped, scrape_status) VALUES (?, 1, ?, 'apify', ?, datetime('now'), 'success')`);
      
      const menuTx = db.transaction(() => {
        for (const item of data.menu) {
          insertItem.run(venue.id, item.category || 'Other', item.item, item.description || null, item.price, item.is_signature ? 1 : 0);
        }
        insertMenu.run(venue.id, venue.website, data.menu.length);
      });
      menuTx();
    }
    
    // EVENTS
    if (data.events && data.events.length > 0) {
      console.log(`   Events: ${data.events.length}`);
      stats.eventsFound++;
      stats.totalEvents += data.events.length;
      
      const insertEvent = db.prepare(`INSERT INTO venue_events (venue_id, title, event_date, event_time, description, recurring) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const event of data.events) {
        insertEvent.run(venue.id, event.title, event.date || null, event.time || null, event.description || null, event.recurring || null);
      }
    }
    
    // HAPPY HOUR
    if (data.happy_hour && data.happy_hour.available) {
      console.log(`   Happy Hour: ${data.happy_hour.times}`);
      stats.happyHours++;
    }
    
    // ADD NEW TAGS
    if (data.additional_tags) {
      const newTags = [];
      if (data.additional_tags.has_happy_hour) newTags.push('happy_hour');
      if (data.additional_tags.has_live_music) newTags.push('live_music');
      if (data.additional_tags.has_dj) newTags.push('dj');
      if (data.additional_tags.has_rooftop) newTags.push('rooftop');
      if (data.additional_tags.has_outdoor_seating) newTags.push('outdoor');
      if (data.additional_tags.weekend_brunch) newTags.push('brunch');
      if (data.additional_tags.late_night) newTags.push('late_night');
      if (data.additional_tags.bottle_service) newTags.push('bottle_service');
      
      if (newTags.length > 0) {
        const updatedVibeTags = addTags(venue.vibe_tags, newTags);
        
        const timeTagsToAdd = [];
        if (data.additional_tags.has_happy_hour) timeTagsToAdd.push('happy_hour');
        if (data.additional_tags.weekend_brunch) timeTagsToAdd.push('brunch');
        if (data.additional_tags.late_night) timeTagsToAdd.push('late_night');
        const updatedTimeTags = addTags(venue.time_tags, timeTagsToAdd);
        
        db.prepare(`UPDATE venues SET vibe_tags = ?, time_tags = ? WHERE id = ?`).run(updatedVibeTags, updatedTimeTags, venue.id);
        console.log(`   Tags: ${newTags.join(', ')}`);
        stats.tagsAdded++;
      }
    }
    
    // BIO
    if (data.bio) {
      db.prepare(`UPDATE venues SET description = ? WHERE id = ?`).run(data.bio, venue.id);
      stats.biosUpdated++;
      console.log('   Bio updated');
    }
    
    await sleep(2000);
    
    if (stats.processed % 10 === 0) {
      console.log(`\nPROGRESS: ${stats.processed}/${venues.length} | Menus: ${stats.menusFound} (${stats.totalMenuItems} items) | Events: ${stats.totalEvents} | Tags: ${stats.tagsAdded}`);
    }
  }
  
  db.close();
  
  console.log(`\n\nCOMPLETE!`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Menus: ${stats.menusFound} (${stats.totalMenuItems} items)`);
  console.log(`Events: ${stats.eventsFound} venues (${stats.totalEvents} events)`);
  console.log(`Happy Hours: ${stats.happyHours}`);
  console.log(`Bios: ${stats.biosUpdated}`);
  console.log(`Tags Added: ${stats.tagsAdded} venues`);
  console.log(`Success: ${Math.round(stats.menusFound / stats.processed * 100)}%`);
}

main().catch(console.error);
