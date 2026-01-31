import axios from 'axios';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchPoshEvents() {
  console.log('💎 POSH Final Scraper\n');
  
  const allEvents = [];
  const baseUrl = 'https://posh.vip/api/web/v2/trpc/events.fetchMarketplaceEvents';
  
  const params = {
    sort: 'Trending',
    when: 'All',
    search: '',
    location: {
      type: 'custom',
      location: 'New York, NY, USA',
      lat: 40.7127753,
      long: -74.0059728
    },
    secondaryFilters: [],
    where: 'New York, NY, USA',
    coordinates: [-74.0059728, 40.7127753],
    limit: 50,
    clientTimezone: 'America/New_York'
  };
  
  let cursor = null;
  
  for (let page = 1; page <= 10; page++) {
    try {
      const input = cursor ? { ...params, cursor } : params;
      const url = `${baseUrl}?input=${encodeURIComponent(JSON.stringify(input))}`;
      
      const response = await axios.get(url);
      
      // Navigate the structure: result.data.events
      const eventsData = response.data?.result?.data?.events;
      
      if (!eventsData || !Array.isArray(eventsData)) {
        console.log(`Page ${page}: No events found`);
        break;
      }
      
      console.log(`Page ${page}: ${eventsData.length} events`);
      
      for (const event of eventsData) {
        try {
          // Parse date
          let eventDate = null;
          if (event.startUtc) {
            const d = new Date(event.startUtc);
            if (!isNaN(d.getTime())) {
              eventDate = d.toISOString().split('T')[0];
            }
          }
          
          allEvents.push({
            name: event.name,
            venue_name: event.venue?.name || 'TBA',
            date: eventDate,
            image_url: event.flyer,
            ticket_url: `https://posh.vip/e/${event.url}`,
            source: 'posh',
            posh_id: event._id
          });
        } catch (err) {
          console.error('Error parsing event:', err.message);
        }
      }
      
      // Check for more pages
      const nextCursor = response.data?.result?.data?.nextCursor;
      if (!nextCursor || eventsData.length === 0) break;
      
      cursor = nextCursor;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.error(`Page ${page} error:`, err.message);
      break;
    }
  }
  
  console.log(`\n📊 Total: ${allEvents.length} events\n`);
  return allEvents;
}

async function saveToDatabase(events) {
  console.log('💾 Saving to database...');
  
  const dbPath = path.join(__dirname, '..', '..', 'data', 'lumina.db');
  const db = new Database(dbPath);
  
  let saved = 0;
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      name, venue_name, date, image_url, ticket_url, source_type, city, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  for (const event of events) {
    try {
      const result = stmt.run(
        event.name,
        event.venue_name,
        event.date,
        event.image_url,
        event.ticket_url,
        'posh',
        'New York'
      );
      
      if (result.changes > 0) {
        saved++;
        if (saved <= 10) {
          console.log(`   ✅ ${event.name} @ ${event.venue_name}`);
        }
      }
    } catch (err) {}
  }
  
  db.close();
  
  console.log(`\n📊 Saved ${saved} new events`);
}

async function main() {
  const events = await fetchPoshEvents();
  
  if (events.length > 0) {
    await saveToDatabase(events);
  }
  
  console.log('\n✅ COMPLETE!');
}

main();
