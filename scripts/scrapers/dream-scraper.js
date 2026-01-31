/**
 * DREAM HOSPITALITY SCRAPER
 * Targeted for their specific event-card structure
 */

import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapeDreamHospitality() {
  console.log('🏨 DREAM HOSPITALITY SCRAPER - Starting...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  const db = new Database(DB_PATH);
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📍 Loading page...');
    await page.goto('https://tickets.dreamhospitalitygroup.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(5000);
    
    // Scroll to load all events
    console.log('📜 Scrolling to load events...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(500);
    }
    
    // Wait for event cards
    await page.waitForSelector('[class*="event-card"], [class*="event-listing"]', { timeout: 15000 });
    
    console.log('🔍 Extracting events...');
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // Find all event cards/items
      const cards = document.querySelectorAll('[class*="event-card"], [class*="event-listing__container"] > div');
      
      cards.forEach(card => {
        // Skip if it's a header or filter
        if (card.classList.contains('event-listing__header')) return;
        if (card.textContent.includes('Upcoming Events') && card.textContent.length < 50) return;
        
        // Get the actual event info
        const text = card.textContent.trim();
        
        // Look for event name - usually in bold/header
        const nameEl = card.querySelector('h1, h2, h3, h4, h5, strong, [class*="title"], [class*="name"]');
        const name = nameEl?.textContent?.trim();
        
        // Look for date
        const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{4}/i);
        const date = dateMatch ? dateMatch[0] : null;
        
        // Look for time
        const timeMatch = text.match(/\d{1,2}:\d{2}\s*(AM|PM)/gi);
        const time = timeMatch ? timeMatch[0] : null;
        
        // Look for venue
        const venueMatch = text.match(/(PhD|Tao|Marquee|Lavo|Avenue|Beauty & Essex|Catch|Somewhere Nowhere|Fleur Room)/i);
        const venue = venueMatch ? venueMatch[0] : 'Dream Hospitality Venue';
        
        // Look for ticket link
        const linkEl = card.querySelector('a[href*="ticket"], a[href*="event"], button');
        const ticketUrl = linkEl?.href || null;
        
        // Look for image
        const imgEl = card.querySelector('img');
        const imageUrl = imgEl?.src || null;
        
        if (name && name.length > 3 && name.length < 200 && !name.includes('Upcoming Events')) {
          results.push({
            name: name,
            venue_name: venue,
            date: date,
            time: time,
            image_url: imageUrl,
            ticket_url: ticketUrl
          });
        }
      });
      
      // Dedupe by name
      const seen = new Set();
      return results.filter(e => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      });
    });
    
    console.log(`\n✅ Found ${events.length} unique events:\n`);
    events.forEach(e => console.log(`   - ${e.name} (${e.venue_name}) - ${e.date || 'No date'}`));
    
    // Save to database
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO events (name, date, time, venue_name, city, image_url, ticket_url, source_type, created_at)
      VALUES (?, ?, ?, ?, 'New York', ?, ?, 'dream-hospitality', datetime('now'))
    `);
    
    let added = 0;
    for (const e of events) {
      try {
        const result = stmt.run(e.name, e.date, e.time, e.venue_name, e.image_url, e.ticket_url);
        if (result.changes > 0) added++;
      } catch (err) {
        // Skip duplicates
      }
    }
    
    console.log(`\n💾 Added ${added} new events to database`);
    
    const total = db.prepare("SELECT COUNT(*) as count FROM events").get();
    console.log(`📊 Total events in database: ${total.count}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
    db.close();
  }
}

scrapeDreamHospitality().catch(console.error);
