import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const MOBILE = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
};

const events = [];
const seen = new Set();

function pushEvent(e) {
  const key = `${e.slug || e.name}-${e.startsAt}`;
  if (seen.has(key)) return;
  seen.add(key);
  
  events.push({
    name: e.name,
    venue_name: e.venue?.name || e.location?.name || null,
    date: e.startsAt,
    city: e.city || 'New York',
    price: e.minPrice || null,
    ticket_url: e.slug ? `https://posh.vip/e/${e.slug}` : null,
    image_url: e.flyer?.url || e.flyerUrl || null
  });
}

function extractEvents(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  // Case 1: direct event wrapper
  if (obj.event?.name && obj.event?.startsAt) {
    pushEvent(obj.event);
  }
  
  // Case 2: direct event object
  if (obj.name && obj.startsAt && obj.slug) {
    pushEvent(obj);
  }
  
  // Case 3: array of items
  if (Array.isArray(obj.items)) {
    obj.items.forEach(item => extractEvents(item));
  }
  
  // Case 4: events array
  if (Array.isArray(obj.events)) {
    obj.events.forEach(item => extractEvents(item));
  }
  
  // Recurse into all keys
  if (Array.isArray(obj)) {
    obj.forEach(item => extractEvents(item));
  } else {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        extractEvents(obj[key]);
      }
    }
  }
}

async function scrapePosh() {
  console.log('💎 POSH MARKETPLACE SCRAPER\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  await page.setViewport(MOBILE.viewport);
  await page.setUserAgent(MOBILE.userAgent);
  
  // Intercept API responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('trpc') || url.includes('fetchMarketplace') || url.includes('fetchFeatured')) {
      try {
        const text = await response.text();
        if (text.includes('startsAt') || text.includes('"name"')) {
          const endpoint = url.split('?')[0].split('/').pop();
          console.log('🔍 API:', endpoint);
          try {
            const json = JSON.parse(text);
            const before = events.length;
            extractEvents(json);
            if (events.length > before) {
              console.log(`   ✅ +${events.length - before} events (total: ${events.length})`);
            }
          } catch {}
        }
      } catch {}
    }
  });
  
  console.log('📱 Loading POSH explore...');
  await page.goto('https://posh.vip/explore', { waitUntil: 'networkidle2', timeout: 60000 });
  await delay(4000);
  
  // Step 1: Initial scroll to trigger loads
  console.log('📜 Step 1: Initial scroll...');
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(1500);
  }
  
  // Step 2: Click a category chip to force marketplace API
  console.log('🏷️ Step 2: Clicking category to trigger marketplace feed...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, [role="button"], div[class*="chip"], span')]
      .find(b => b.innerText?.toLowerCase().includes('all') || 
                 b.innerText?.toLowerCase().includes('nightlife') ||
                 b.innerText?.toLowerCase().includes('music'));
    if (btn) {
      console.log('Clicking:', btn.innerText);
      btn.click();
    }
  });
  await delay(3000);
  
  // Step 3: Scroll more after category click
  console.log('📜 Step 3: Post-category scroll...');
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(1500);
  }
  
  // Step 4: Try clicking "This Week" filter
  console.log('📅 Step 4: Clicking time filter...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, [role="button"], div, span')]
      .find(b => b.innerText?.toLowerCase().includes('this week') ||
                 b.innerText?.toLowerCase().includes('trending'));
    if (btn) btn.click();
  });
  await delay(3000);
  
  // Step 5: More scrolling
  console.log('📜 Step 5: Final scroll pass...');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(1200);
  }
  
  await delay(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/opt/viberyte/lumina-web/data/events/debug-posh-final.png' });
  
  await browser.close();
  
  console.log(`\n📋 Total events captured: ${events.length}\n`);
  
  // Insert into database
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events 
    (name, venue_name, date, event_date, ticket_url, image_url, city, source_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'New York', 'posh', datetime('now'))
  `);
  
  let added = 0;
  for (const e of events) {
    try {
      let eventDate = null;
      if (e.date) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) eventDate = d.toISOString().split('T')[0];
      }
      
      const result = stmt.run(e.name, e.venue_name, eventDate, eventDate, e.ticket_url, e.image_url);
      if (result.changes > 0) {
        added++;
        console.log(`✅ ${e.name}`);
      }
    } catch {}
  }
  
  console.log(`\n💾 Added ${added} new POSH events`);
  
  const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now')").get();
  console.log(`📊 Total upcoming events: ${total.count}`);
  
  db.close();
}

scrapePosh().catch(console.error);
