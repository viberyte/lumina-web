import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const MOBILE = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile Safari/605.1.15'
};

const events = [];
const seen = new Set();

// Recursive extraction from nested POSH JSON
function extractEvents(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  // Check for event object
  if (obj.name && (obj.startsAt || obj.startUtc || obj.date)) {
    const key = obj.name + (obj.startsAt || obj.startUtc || '');
    if (!seen.has(key)) {
      seen.add(key);
      events.push({
        name: obj.name,
        venue_name: obj.venue?.name || obj.venueName || null,
        date: obj.startsAt || obj.startUtc || obj.date,
        price: obj.minPrice || obj.price || null,
        ticket_url: obj.slug ? `https://posh.vip/e/${obj.slug}` : null,
        image_url: obj.flyer?.url || obj.flyerUrl || obj.image || null
      });
    }
  }
  
  // Also check for "event" wrapper
  if (obj.event && obj.event.name) {
    extractEvents(obj.event);
  }
  
  // Recurse into arrays and objects
  if (Array.isArray(obj)) {
    obj.forEach(item => extractEvents(item));
  } else {
    for (const key in obj) {
      extractEvents(obj[key]);
    }
  }
}

async function scrapePosh() {
  console.log('💎 POSH API INTERCEPT SCRAPER\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  await page.setViewport(MOBILE.viewport);
  await page.setUserAgent(MOBILE.userAgent);
  
  // Intercept all responses
  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('trpc') || url.includes('events') || url.includes('explore') || url.includes('api')) {
      try {
        const text = await response.text();
        // Look for event-like data
        if (text.includes('startsAt') || text.includes('startUtc') || text.includes('"name"')) {
          console.log('🔍 API hit:', url.substring(0, 70));
          try {
            const json = JSON.parse(text);
            const beforeCount = events.length;
            extractEvents(json);
            if (events.length > beforeCount) {
              console.log(`   ✅ Found ${events.length - beforeCount} events (total: ${events.length})`);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  });
  
  console.log('📱 Loading POSH explore (mobile)...');
  await page.goto('https://posh.vip/explore', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Scroll to load more events
  console.log('📜 Scrolling to load more...');
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
  
  console.log(`\n📋 Total events captured: ${events.length}\n`);
  
  if (events.length === 0) {
    console.log('❌ No events found. Check debug screenshot.');
    return;
  }
  
  // Insert into database
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events 
    (name, venue_name, date, event_date, ticket_url, image_url, city, source_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'New York', 'posh', datetime('now'))
  `);
  
  let added = 0;
  for (const e of events) {
    try {
      // Parse date
      let eventDate = null;
      if (e.date) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          eventDate = d.toISOString().split('T')[0];
        }
      }
      
      const result = stmt.run(
        e.name,
        e.venue_name,
        eventDate,
        eventDate,
        e.ticket_url,
        e.image_url
      );
      
      if (result.changes > 0) {
        added++;
        console.log(`✅ ${e.name} @ ${e.venue_name || 'TBA'}`);
      }
    } catch (err) {}
  }
  
  console.log(`\n💾 Added ${added} new POSH events`);
  
  const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now')").get();
  console.log(`📊 Total upcoming events: ${total.count}`);
  
  db.close();
}

scrapePosh().catch(console.error);
