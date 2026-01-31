/**
 * POSH + DELANCEY SCRAPER
 * Targeted extraction for each site's structure
 */

import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// POSH SCRAPER (Browser-based, not API)
// ==========================================
async function scrapePosh(browser, db) {
  console.log('\n💎 === POSH SCRAPER ===\n');
  
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📍 Loading POSH explore page...');
    await page.goto('https://posh.vip/explore?when=This+Month&sort=Newest&where=New+York', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(5000);
    
    // Scroll to load more events
    console.log('📜 Scrolling to load events...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await delay(1000);
    }
    
    // Take screenshot
    await page.screenshot({ path: '/opt/viberyte/lumina-web/data/events/debug-posh.png', fullPage: true });
    console.log('📸 Screenshot saved');
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // POSH uses cards with event info
      const cards = document.querySelectorAll('[class*="EventCard"], [class*="event-card"], a[href*="/e/"], [class*="Card"]');
      
      console.log('Found cards:', cards.length);
      
      cards.forEach(card => {
        const text = card.textContent?.trim() || '';
        if (text.length < 10) return;
        
        // Get event name
        const nameEl = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"], [class*="Title"]');
        let name = nameEl?.textContent?.trim();
        
        // Fallback: get from link text
        if (!name && card.tagName === 'A') {
          name = card.textContent?.trim().split('\n')[0];
        }
        
        // Get date
        const dateEl = card.querySelector('[class*="date"], [class*="Date"], time');
        const dateText = dateEl?.textContent?.trim();
        
        // Parse date from text
        const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}/i) ||
                         text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}/i);
        const date = dateMatch ? dateMatch[0] : dateText;
        
        // Get venue
        const venueEl = card.querySelector('[class*="venue"], [class*="Venue"], [class*="location"]');
        const venue = venueEl?.textContent?.trim() || 'POSH Venue';
        
        // Get link
        const linkEl = card.querySelector('a[href*="/e/"]') || (card.tagName === 'A' ? card : null);
        const ticketUrl = linkEl?.href;
        
        // Get image
        const imgEl = card.querySelector('img');
        const imageUrl = imgEl?.src;
        
        if (name && name.length > 3 && name.length < 200) {
          results.push({ name, venue_name: venue, date, image_url: imageUrl, ticket_url: ticketUrl });
        }
      });
      
      // Dedupe
      const seen = new Set();
      return results.filter(e => {
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    
    console.log(`✅ Found ${events.length} POSH events`);
    if (events.length > 0) {
      events.slice(0, 5).forEach(e => console.log(`   - ${e.name}`));
    }
    
    // Save to DB
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO events (name, date, venue_name, city, image_url, ticket_url, source_type, created_at)
      VALUES (?, ?, ?, 'New York', ?, ?, 'posh', datetime('now'))
    `);
    
    let added = 0;
    for (const e of events) {
      try {
        const result = stmt.run(e.name, e.date, e.venue_name, e.image_url, e.ticket_url);
        if (result.changes > 0) added++;
      } catch {}
    }
    
    console.log(`💾 Added ${added} new POSH events`);
    return added;
    
  } catch (err) {
    console.error('❌ POSH Error:', err.message);
    return 0;
  } finally {
    await page.close();
  }
}

// ==========================================
// DELANCEY SCRAPER (Wix site)
// ==========================================
async function scrapeDelancey(browser, db) {
  console.log('\n🎸 === THE DELANCEY SCRAPER ===\n');
  
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📍 Loading The Delancey events page...');
    await page.goto('https://www.thedelancey.com/events', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(5000);
    
    // Scroll to load
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(500);
    }
    
    // Take screenshot
    await page.screenshot({ path: '/opt/viberyte/lumina-web/data/events/debug-delancey.png', fullPage: true });
    console.log('📸 Screenshot saved');
    
    // Wix sites use specific structures
    const events = await page.evaluate(() => {
      const results = [];
      
      // Try multiple Wix selectors
      const selectors = [
        '[data-hook="event-list-item"]',
        '.eventlist-event',
        '[class*="eventlist"]',
        '.wixui-events',
        '[data-testid*="event"]',
        'article',
        '.event-item',
        '[class*="Event"]'
      ];
      
      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          console.log(`Found ${cards.length} with selector: ${sel}`);
          break;
        }
      }
      
      // Also try finding by content patterns
      if (cards.length === 0) {
        // Look for any elements containing date patterns
        document.querySelectorAll('div, article, section').forEach(el => {
          const text = el.textContent || '';
          if (text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i) && 
              text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
              text.length < 500) {
            cards = [...cards, el];
          }
        });
      }
      
      cards.forEach(card => {
        const text = card.textContent?.trim() || '';
        if (text.length < 10 || text.length > 1000) return;
        
        // Get event name
        const nameEl = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
        let name = nameEl?.textContent?.trim();
        
        if (!name) {
          // Try first line of text
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
          name = lines[0];
        }
        
        // Get date
        const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{1,2}/i) ||
                         text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2},?\s*\d{4}/i) ||
                         text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}/i);
        const date = dateMatch ? dateMatch[0] : null;
        
        // Get link
        const linkEl = card.querySelector('a[href]');
        const ticketUrl = linkEl?.href;
        
        // Get image
        const imgEl = card.querySelector('img');
        const imageUrl = imgEl?.src;
        
        if (name && name.length > 3 && name.length < 200) {
          results.push({
            name,
            venue_name: 'The Delancey',
            date,
            image_url: imageUrl,
            ticket_url: ticketUrl
          });
        }
      });
      
      // Dedupe
      const seen = new Set();
      return results.filter(e => {
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    
    console.log(`✅ Found ${events.length} Delancey events`);
    if (events.length > 0) {
      events.slice(0, 5).forEach(e => console.log(`   - ${e.name} (${e.date || 'No date'})`));
    }
    
    // Save to DB
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO events (name, date, venue_name, city, image_url, ticket_url, source_type, created_at)
      VALUES (?, ?, 'The Delancey', 'New York', ?, ?, 'venue-calendar', datetime('now'))
    `);
    
    let added = 0;
    for (const e of events) {
      try {
        const result = stmt.run(e.name, e.date, e.image_url, e.ticket_url);
        if (result.changes > 0) added++;
      } catch {}
    }
    
    console.log(`💾 Added ${added} new Delancey events`);
    return added;
    
  } catch (err) {
    console.error('❌ Delancey Error:', err.message);
    return 0;
  } finally {
    await page.close();
  }
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  console.log('🚀 POSH + DELANCEY SCRAPER - Starting...');
  console.log('⏰ ' + new Date().toISOString() + '\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });
  
  const db = new Database(DB_PATH);
  
  try {
    const poshAdded = await scrapePosh(browser, db);
    const delanceyAdded = await scrapeDelancey(browser, db);
    
    console.log('\n\n✅ === SCRAPING COMPLETE ===');
    console.log(`   POSH: ${poshAdded} new events`);
    console.log(`   Delancey: ${delanceyAdded} new events`);
    console.log(`   TOTAL: ${poshAdded + delanceyAdded}`);
    
    const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now') OR date >= date('now')").get();
    console.log(`\n📊 Total upcoming events in database: ${total.count}`);
    
  } finally {
    await browser.close();
    db.close();
  }
}

main().catch(console.error);
