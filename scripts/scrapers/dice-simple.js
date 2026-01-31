import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const DICE_GENRES = [
  'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/amapiano',
  'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/dj/afrobeat',
  'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/house'
];

async function scrapeDice() {
  console.log('🎲 DICE SIMPLE SCRAPER - Starting...\n');
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let total = 0;

  for (const url of DICE_GENRES) {
    try {
      console.log(`📍 Scraping: ${url.split('/').pop()}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);
      
      const events = await page.evaluate(() => {
        return [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
          .filter(d => d && d['@type'] === 'Event')
          .slice(0, 10);
      });
      
      console.log(`   Found ${events.length} events`);
      
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO events (name, date, venue_name, city, source_type, created_at)
        VALUES (?, ?, ?, 'New York', 'dice', datetime('now'))
      `);
      
      let added = 0;
      for (const e of events) {
        const result = stmt.run(e.name, e.startDate?.split('T')[0], e.location?.name || 'TBA');
        if (result.changes > 0) added++;
      }
      
      console.log(`   ✅ Added ${added} new events\n`);
      total += added;
      
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }
  }
  
  await browser.close();
  console.log(`\n✅ TOTAL: ${total} new Dice events\n`);
}

scrapeDice();
