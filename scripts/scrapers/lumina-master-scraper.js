/**
 * LUMINA MASTER SCRAPER
 * =====================
 * Scrapes: DICE, POSH, Delancey, Dream Hospitality
 */

import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const DICE_URLS = [
  { genre: 'afrobeat', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/afrobeat' },
  { genre: 'afro_house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/afro_house' },
  { genre: 'hiphop', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/hiphop' },
  { genre: 'house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/house' },
  { genre: 'latin', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/latin' },
  { genre: 'reggaeton', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/reggaeton' },
  { genre: 'rnb', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/rnb' },
  { genre: 'edm', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/edm' },
  { genre: 'tech_house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/tech-house' },
];

const VENUE_URLS = [
  { name: 'The Delancey', url: 'https://www.thedelancey.com/events' },
  { name: 'Dream Hospitality', url: 'https://tickets.dreamhospitalitygroup.com/' },
];

class LuminaMasterScraper {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { dice: 0, posh: 0, venues: 0, total: 0 };
  }

  // DICE SCRAPER
  async scrapeDice(browser) {
    console.log('\n🎲 === DICE.FM SCRAPER ===\n');
    
    for (const { genre, url } of DICE_URLS) {
      const page = await browser.newPage();
      try {
        console.log(`🎵 Scraping ${genre}...`);
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(3000);
        
        // Scroll to load more
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await delay(500);
        }
        
        const events = await page.evaluate((genreTag) => {
          const results = [];
          
          // Extract from event links
          document.querySelectorAll('a[href*="/event/"]').forEach(link => {
            const card = link.closest('div');
            if (!card) return;
            
            const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="Title"]');
            const dateEl = card.querySelector('time, [class*="date"]');
            const venueEl = card.querySelector('[class*="venue"], [class*="location"]');
            const imgEl = card.querySelector('img');
            
            const title = titleEl?.textContent?.trim();
            if (title && title.length > 3 && !results.find(r => r.name === title)) {
              results.push({
                name: title,
                venue_name: venueEl?.textContent?.trim() || 'TBA',
                date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim(),
                image_url: imgEl?.src,
                ticket_url: link.href,
                genre: genreTag
              });
            }
          });
          
          return results.slice(0, 20);
        }, genre);
        
        console.log(`   Found ${events.length} events`);
        
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO events (name, date, venue_name, city, music_genres, image_url, ticket_url, source_type, created_at)
          VALUES (?, ?, ?, 'New York', ?, ?, ?, 'dice', datetime('now'))
        `);
        
        let added = 0;
        for (const e of events) {
          try {
            const result = stmt.run(e.name, e.date, e.venue_name, JSON.stringify([e.genre]), e.image_url, e.ticket_url);
            if (result.changes > 0) added++;
          } catch {}
        }
        
        console.log(`   ✅ Added ${added} new events`);
        this.stats.dice += added;
        
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  // POSH SCRAPER (via API)
  async scrapePosh() {
    console.log('\n💎 === POSH SCRAPER ===\n');
    
    const params = {
      sort: 'Newest',
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
    
    try {
      const url = `https://posh.vip/api/web/v2/trpc/events.fetchMarketplaceEvents?input=${encodeURIComponent(JSON.stringify(params))}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const events = data?.result?.data?.events || [];
      console.log(`   Found ${events.length} POSH events`);
      
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO events (name, date, venue_name, city, image_url, ticket_url, source_type, created_at)
        VALUES (?, ?, ?, 'New York', ?, ?, 'posh', datetime('now'))
      `);
      
      let added = 0;
      for (const event of events) {
        try {
          const result = stmt.run(
            event.name || event.title,
            event.startUtc || event.date,
            event.venue?.name || event.venueName || 'TBA',
            event.flyer?.url || event.imageUrl,
            `https://posh.vip/e/${event.slug || event.id}`
          );
          if (result.changes > 0) added++;
        } catch {}
      }
      
      console.log(`   ✅ Added ${added} new events`);
      this.stats.posh = added;
      
    } catch (err) {
      console.error(`   ❌ POSH Error: ${err.message}`);
    }
  }

  // VENUE WEBSITE SCRAPER
  async scrapeVenues(browser) {
    console.log('\n🏛️ === VENUE CALENDARS ===\n');
    
    for (const { name, url } of VENUE_URLS) {
      const page = await browser.newPage();
      try {
        console.log(`📅 Scraping ${name}...`);
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);
        
        const events = await page.evaluate((venueName) => {
          const results = [];
          
          const containers = document.querySelectorAll(
            '[class*="event"], [class*="Event"], article, .item, .card'
          );
          
          containers.forEach(el => {
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            const dateEl = el.querySelector('[class*="date"], time, .date');
            const linkEl = el.querySelector('a[href]');
            const imgEl = el.querySelector('img');
            
            if (titleEl && titleEl.textContent.trim().length > 3) {
              results.push({
                name: titleEl.textContent.trim(),
                venue_name: venueName,
                date: dateEl?.textContent?.trim(),
                image_url: imgEl?.src,
                ticket_url: linkEl?.href
              });
            }
          });
          
          return results.slice(0, 50);
        }, name);
        
        console.log(`   Found ${events.length} events`);
        
        const stmt = this.db.prepare(`
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
        
        console.log(`   ✅ Added ${added} new events`);
        this.stats.venues += added;
        
      } catch (err) {
        console.error(`   ❌ Error at ${name}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  async run() {
    console.log('🚀 LUMINA MASTER SCRAPER - Starting...\n');
    console.log('⏰ ' + new Date().toISOString());
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      await this.scrapeDice(browser);
      await this.scrapePosh();
      await this.scrapeVenues(browser);
      
      this.stats.total = this.stats.dice + this.stats.posh + this.stats.venues;
      
      console.log('\n\n✅ === SCRAPING COMPLETE ===');
      console.log(`   DICE: ${this.stats.dice}`);
      console.log(`   POSH: ${this.stats.posh}`);
      console.log(`   Venues: ${this.stats.venues}`);
      console.log(`   TOTAL: ${this.stats.total}`);
      
      const total = this.db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now') OR date >= date('now')").get();
      console.log(`\n📊 Total upcoming events in database: ${total.count}`);
      
    } finally {
      await browser.close();
      this.db.close();
    }
  }
}

const scraper = new LuminaMasterScraper();
scraper.run().catch(console.error);
