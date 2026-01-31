import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const DICE_URLS = [
  { genre: 'Amapiano', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/amapiano' },
  { genre: 'Afrobeat', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/dj/afrobeat' },
  { genre: 'Dancehall', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/dancehall' },
  { genre: 'House', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/house' },
  { genre: 'Hip-Hop', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/hiphop' },
  { genre: 'Latin', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/latin' },
  { genre: 'R&B', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/rnb' }
];

const VENUE_CALENDARS = [
  { name: 'Nebula NYC', url: 'https://nebulanewyork.com/events/' },
  { name: 'Somewhere Nowhere', url: 'https://www.somewherenowherenyc.com/events' },
  { name: 'The Delancey', url: 'https://www.thedelancey.com/events' },
  { name: 'DL NYC', url: 'https://www.thedl-nyc.com/upcomingevents' },
  { name: 'Dream Hospitality', url: 'https://tickets.dreamhospitalitygroup.com' }
];

class AllEventsScraper {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { dice: 0, venues: 0, total: 0, errors: 0 };
  }

  async scrapeVenueCalendars(browser) {
    console.log('\n🏛️ === VENUE CALENDARS SCRAPER ===\n');
    
    for (const venue of VENUE_CALENDARS) {
      const page = await browser.newPage();
      try {
        console.log(`📅 Scraping ${venue.name}...`);
        
        // Set longer timeout and user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.goto(venue.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
        await delay(3000);
        
        const events = await page.evaluate((venueName) => {
          const results = [];
          const eventElements = document.querySelectorAll('[class*="event"], [class*="calendar"], article, .item, .card');
          
          eventElements.forEach(el => {
            const nameEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
            const dateEl = el.querySelector('[class*="date"], time, .date');
            const linkEl = el.querySelector('a[href]');
            
            if (nameEl && nameEl.textContent.trim().length > 3) {
              results.push({
                name: nameEl.textContent.trim(),
                date: dateEl ? dateEl.textContent.trim() : null,
                venue_name: venueName,
                event_url: linkEl ? linkEl.href : null,
                city: 'New York'
              });
            }
          });
          
          return results.slice(0, 50); // Limit to 50 events per venue
        }, venue.name);
        
        console.log(`   ✅ Found ${events.length} events for ${venue.name}`);
        
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO events (name, date, venue_name, city, event_url, source_type, created_at)
          VALUES (?, ?, ?, ?, ?, 'venue-calendar', datetime('now'))
        `);
        
        let added = 0;
        for (const event of events) {
          try {
            const result = stmt.run(event.name, event.date, event.venue_name, event.city, event.event_url);
            if (result.changes > 0) added++;
          } catch (err) {
            // Skip duplicates
          }
        }
        
        this.stats.venues += added;
        console.log(`   💾 Added ${added} new events`);
        
      } catch (err) {
        console.error(`   ❌ Error scraping ${venue.name}: ${err.message}`);
        this.stats.errors++;
      } finally {
        await page.close();
      }
    }
  }

  async scrapeDiceEvents(browser) {
    console.log('\n🎲 === DICE.FM SCRAPER ===\n');
    
    for (const { genre, url } of DICE_URLS) {
      const page = await browser.newPage();
      try {
        console.log(`🎵 Scraping ${genre}...`);
        
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
        await delay(2000);
        
        const events = await page.evaluate((genreName) => {
          const results = [];
          const eventCards = document.querySelectorAll('[data-testid="event-card"], .event-card, article, [class*="event"]');
          
          eventCards.forEach(card => {
            const nameEl = card.querySelector('h2, h3, .event-name, [class*="title"]');
            const venueEl = card.querySelector('[data-testid="event-venue"], .venue-name, [class*="venue"]');
            const dateEl = card.querySelector('[data-testid="event-date"], time, .date, [class*="date"]');
            
            if (nameEl && nameEl.textContent.trim().length > 3) {
              results.push({
                name: nameEl.textContent.trim(),
                venue_name: venueEl ? venueEl.textContent.trim() : 'TBA',
                date: dateEl ? dateEl.textContent.trim() : null,
                music_genres: JSON.stringify([genreName]),
                city: 'New York'
              });
            }
          });
          
          return results.slice(0, 100);
        }, genre);
        
        console.log(`   ✅ Found ${events.length} ${genre} events`);
        
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO events (name, date, venue_name, city, music_genres, source_type, created_at)
          VALUES (?, ?, ?, ?, ?, 'dice', datetime('now'))
        `);
        
        let added = 0;
        for (const event of events) {
          try {
            const result = stmt.run(event.name, event.date, event.venue_name, event.city, event.music_genres);
            if (result.changes > 0) added++;
          } catch (err) {
            // Skip duplicates
          }
        }
        
        this.stats.dice += added;
        console.log(`   💾 Added ${added} new events`);
        
      } catch (err) {
        console.error(`   ❌ Error scraping ${genre}: ${err.message}`);
        this.stats.errors++;
      } finally {
        await page.close();
      }
    }
  }

  async run() {
    console.log('🚀 LUMINA ALL-EVENTS SCRAPER - Starting...\n');
    console.log('⏰ ' + new Date().toLocaleString());
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    try {
      console.log('🗑️ Cleaning events older than today...');
      const deleted = this.db.prepare("DELETE FROM events WHERE date < date('now')").run();
      console.log(`   Removed ${deleted.changes} old events\n`);
      
      await this.scrapeVenueCalendars(browser);
      await this.scrapeDiceEvents(browser);
      
      this.stats.total = this.stats.dice + this.stats.venues;
      
      console.log('\n\n✅ === SCRAPING COMPLETE ===');
      console.log(`   Venue Calendars: ${this.stats.venues}`);
      console.log(`   Dice Events: ${this.stats.dice}`);
      console.log(`   TOTAL ADDED: ${this.stats.total}`);
      console.log(`   Errors: ${this.stats.errors}`);
      
      const totalEvents = this.db.prepare("SELECT COUNT(*) as count FROM events WHERE date >= date('now')").get();
      console.log(`\n📊 Total upcoming events in database: ${totalEvents.count}`);
      
    } catch (err) {
      console.error('\n❌ Fatal error:', err);
    } finally {
      await browser.close();
      this.db.close();
    }
  }
}

const scraper = new AllEventsScraper();
scraper.run().catch(console.error);
