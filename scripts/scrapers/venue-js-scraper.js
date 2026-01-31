/**
 * VENUE JS SCRAPER - For React/JS rendered sites
 * Waits for dynamic content to load
 */

import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const VENUES = [
  { 
    name: 'The Delancey', 
    url: 'https://www.thedelancey.com/events',
    waitSelector: '.eventlist, [class*="event"], .event-item',
    scrollCount: 3
  },
  { 
    name: 'Dream Hospitality', 
    url: 'https://tickets.dreamhospitalitygroup.com/',
    waitSelector: '[class*="event"], .card, article, [class*="Event"]',
    scrollCount: 5
  },
];

async function scrapeVenue(browser, venue) {
  console.log(`\n📅 Scraping ${venue.name}...`);
  console.log(`   URL: ${venue.url}`);
  
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`   Loading page...`);
    await page.goto(venue.url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait for JS to render
    console.log(`   Waiting for JS content...`);
    await delay(5000);
    
    // Scroll to trigger lazy loading
    for (let i = 0; i < venue.scrollCount; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(1000);
    }
    
    // Try to wait for event selector
    try {
      await page.waitForSelector(venue.waitSelector, { timeout: 10000 });
      console.log(`   ✅ Found event container`);
    } catch {
      console.log(`   ⚠️ No event selector found, trying generic extraction`);
    }
    
    // Take screenshot for debugging
    const screenshotPath = `/opt/viberyte/lumina-web/data/events/debug-${venue.name.replace(/\s/g, '-')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot: ${screenshotPath}`);
    
    // Extract page content
    const pageContent = await page.content();
    console.log(`   Page size: ${pageContent.length} chars`);
    
    // Extract events with multiple strategies
    const events = await page.evaluate((venueName) => {
      const results = [];
      
      // Strategy 1: Look for event-like containers
      const selectors = [
        '[class*="event"]',
        '[class*="Event"]', 
        'article',
        '.card',
        '[class*="listing"]',
        '[class*="item"]',
        'a[href*="event"]',
        '[data-event]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with: ${selector}`);
          
          elements.forEach(el => {
            // Skip tiny elements
            if (el.textContent.trim().length < 10) return;
            
            const titleEl = el.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"], [class*="name"]');
            const dateEl = el.querySelector('time, [class*="date"], [datetime], .date');
            const linkEl = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
            const imgEl = el.querySelector('img');
            
            const title = titleEl?.textContent?.trim() || el.textContent?.trim().substring(0, 100);
            
            if (title && title.length > 5 && title.length < 200) {
              // Avoid duplicates
              if (!results.find(r => r.name === title)) {
                results.push({
                  name: title,
                  venue_name: venueName,
                  date: dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime'),
                  image_url: imgEl?.src,
                  ticket_url: linkEl?.href
                });
              }
            }
          });
          
          if (results.length > 0) break;
        }
      }
      
      // Strategy 2: Look for any links that might be events
      if (results.length === 0) {
        document.querySelectorAll('a[href*="event"], a[href*="ticket"]').forEach(link => {
          const text = link.textContent?.trim();
          if (text && text.length > 5 && text.length < 150) {
            results.push({
              name: text,
              venue_name: venueName,
              date: null,
              ticket_url: link.href
            });
          }
        });
      }
      
      return results.slice(0, 50);
    }, venue.name);
    
    console.log(`   Found ${events.length} events`);
    
    // Log first few events for debugging
    if (events.length > 0) {
      console.log(`   Sample events:`);
      events.slice(0, 3).forEach(e => console.log(`     - ${e.name}`));
    }
    
    return events;
    
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 VENUE JS SCRAPER - Starting...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });
  
  const db = new Database(DB_PATH);
  let totalAdded = 0;
  
  try {
    for (const venue of VENUES) {
      const events = await scrapeVenue(browser, venue);
      
      if (events.length > 0) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO events (name, date, venue_name, city, image_url, ticket_url, source_type, created_at)
          VALUES (?, ?, ?, 'New York', ?, ?, 'venue-calendar', datetime('now'))
        `);
        
        let added = 0;
        for (const e of events) {
          try {
            const result = stmt.run(e.name, e.date, e.venue_name, e.image_url, e.ticket_url);
            if (result.changes > 0) added++;
          } catch {}
        }
        
        console.log(`   💾 Added ${added} new events to database`);
        totalAdded += added;
      }
    }
    
    console.log(`\n\n✅ COMPLETE - Added ${totalAdded} total events`);
    
    const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now') OR date >= date('now')").get();
    console.log(`📊 Total upcoming events: ${total.count}`);
    
  } finally {
    await browser.close();
    db.close();
  }
}

main().catch(console.error);
