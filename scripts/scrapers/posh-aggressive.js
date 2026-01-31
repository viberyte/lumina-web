import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePoshAggressive() {
  console.log('💎 POSH AGGRESSIVE SCRAPER\n');
  console.log('⚠️  This will take 5-10 minutes to scroll and load everything...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const capturedEvents = new Set();
  
  // Intercept network responses
  page.on('response', async response => {
    const url = response.url();
    
    if (url.includes('fetchMarketplaceEvents') || url.includes('fetchFeaturedEvents')) {
      try {
        const data = await response.json();
        const events = data?.result?.data?.events;
        
        if (events && Array.isArray(events)) {
          for (const event of events) {
            if (event._id && event.name) {
              capturedEvents.add(JSON.stringify({
                id: event._id,
                name: event.name,
                venue: event.venue?.name || 'TBA',
                date: event.startUtc,
                image: event.flyer,
                url: event.url
              }));
            }
          }
          console.log(`   📡 Captured ${events.length} events (Total: ${capturedEvents.size})`);
        }
      } catch (e) {}
    }
  });

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  console.log('🌐 Loading POSH explore page...');
  await page.goto('https://posh.vip/explore?location=%7B%22type%22%3A%22custom%22%2C%22location%22%3A%22New+York%2C+NY%2C+USA%22%2C%22long%22%3A-74.0059728%2C%22lat%22%3A40.7127753%7D', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('⏳ Initial load complete, waiting...');
  await wait(5000);

  console.log('📜 Starting aggressive scrolling (50 iterations)...\n');
  
  for (let i = 1; i <= 50; i++) {
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await wait(2000);
    
    // Also scroll up a bit to trigger load
    if (i % 5 === 0) {
      await page.evaluate(() => {
        window.scrollBy(0, -500);
      });
      await wait(1000);
    }
    
    if (i % 10 === 0) {
      console.log(`   Scroll ${i}/50 - Total events captured: ${capturedEvents.size}`);
    }
  }

  console.log('\n🎯 Final scroll to bottom...');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await wait(5000);

  await browser.close();
  
  console.log(`\n📊 Total unique events captured: ${capturedEvents.size}\n`);
  
  // Parse captured events
  const events = [];
  for (const eventStr of capturedEvents) {
    const event = JSON.parse(eventStr);
    
    let eventDate = null;
    if (event.date) {
      try {
        const d = new Date(event.date);
        if (!isNaN(d.getTime())) {
          eventDate = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    
    events.push({
      name: event.name,
      venue_name: event.venue,
      date: eventDate,
      image_url: event.image,
      ticket_url: `https://posh.vip/e/${event.url}`,
      source: 'posh',
      posh_id: event.id
    });
  }
  
  return events;
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
        if (saved <= 15) {
          console.log(`   ✅ ${event.name}`);
        } else if (saved === 16) {
          console.log(`   ... (saving ${events.length - 15} more)`);
        }
      }
    } catch (err) {}
  }
  
  db.close();
  
  console.log(`\n📊 Saved ${saved} new events`);
  return saved;
}

async function main() {
  console.log('🚀 Starting aggressive POSH scraper...\n');
  
  const events = await scrapePoshAggressive();
  
  if (events.length > 0) {
    await saveToDatabase(events);
  }
  
  console.log('\n✅ COMPLETE!');
}

main();
