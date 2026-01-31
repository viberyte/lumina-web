/**
 * LUMINA V2 - Stealth Scraper
 * ============================
 * Uses puppeteer-extra with stealth plugin to bypass bot detection
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class StealthScraper {
  constructor() {
    this.db = new Database(DB_PATH);
    this.browser = null;
    this.stats = { processed: 0, inserted: 0, duplicates: 0, errors: 0 };
  }

  async init() {
    console.log('🚀 Launching stealth Chrome...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });
    console.log('✓ Browser ready\n');
  }

  async close() {
    if (this.browser) await this.browser.close();
    this.db.close();
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch {}
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const match = dateStr.toLowerCase().match(/(\w{3})\w*[,.\s]+(\d{1,2})/);
    if (match && months[match[1]] !== undefined) {
      const year = new Date().getFullYear();
      const date = new Date(year, months[match[1]], parseInt(match[2]));
      if (date < new Date()) date.setFullYear(year + 1);
      return date.toISOString().split('T')[0];
    }
    return null;
  }

  extractVibes(text) {
    if (!text) return [];
    text = text.toLowerCase();
    const vibes = [];
    if (text.includes('afrobeat')) vibes.push('afrobeats');
    if (text.includes('amapiano')) vibes.push('amapiano');
    if (text.includes('hip hop') || text.includes('hip-hop')) vibes.push('hip-hop');
    if (text.includes('r&b') || text.includes('rnb')) vibes.push('r&b');
    if (text.includes('reggae')) vibes.push('reggae');
    if (text.includes('dancehall')) vibes.push('dancehall');
    if (text.includes('latin') || text.includes('reggaeton')) vibes.push('latin');
    if (text.includes('house')) vibes.push('house');
    if (text.includes('techno')) vibes.push('techno');
    if (text.includes('rooftop')) vibes.push('rooftop');
    if (text.includes('brunch')) vibes.push('brunch');
    return [...new Set(vibes)];
  }

  generateSlug(title, date, venue) {
    return [title || '', venue || '', date || ''].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100);
  }

  isDuplicate(slug, name, venue, date) {
    if (slug) {
      const exists = this.db.prepare('SELECT id FROM events WHERE slug = ?').get(slug);
      if (exists) return true;
    }
    if (venue && date) {
      const similar = this.db.prepare('SELECT name FROM events WHERE venue_name = ? AND date = ?').all(venue, date);
      const clean = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const s of similar) {
        const c = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean === c || clean.includes(c) || c.includes(clean)) return true;
      }
    }
    return false;
  }

  insertEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO events (name, short_title, date, venue_name, city, time, start_datetime, event_date,
        description, vibe_tags, mood_tags, price_range, age_restriction, ticket_url, image_url,
        cover_image_url, source_type, source_handle, scraped_at, confidence_score, slug, enriched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.name, event.name.substring(0, 50), event.date, event.venue, 'New York', null,
      event.date ? `${event.date}T00:00:00` : null, event.date, event.description || null,
      JSON.stringify(event.vibes), JSON.stringify([]), null, '21+', event.url,
      event.image, event.image, event.source, event.sourceHandle,
      new Date().toISOString(), 0.65, event.slug, new Date().toISOString()
    );
  }

  // DICE Scraper
  async scrapeDICE(page, url) {
    console.log(`\n📡 DICE: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // DICE uses data attributes and specific patterns
      document.querySelectorAll('a[href*="/event/"]').forEach(link => {
        const card = link.closest('div[class*="css"]') || link.parentElement?.parentElement;
        if (!card) return;
        
        // Get all text content
        const allText = card.textContent || '';
        
        // Find title - usually the most prominent text
        const titleEl = card.querySelector('h1, h2, h3, [class*="title"], [class*="name"]') || 
                       card.querySelector('div > div > div');
        
        // Find date
        const dateEl = card.querySelector('time') || card.querySelector('[class*="date"]');
        let dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent;
        
        // Extract from text if not found
        if (!dateText) {
          const dateMatch = allText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}/i);
          if (dateMatch) dateText = dateMatch[0];
        }
        
        // Find venue
        const venueEl = card.querySelector('[class*="venue"], [class*="location"]');
        
        // Find image
        const imgEl = card.querySelector('img');
        
        const title = titleEl?.textContent?.trim();
        if (title && title.length > 3 && title.length < 200) {
          results.push({
            title,
            date: dateText,
            venue: venueEl?.textContent?.trim(),
            image: imgEl?.src,
            url: link.href
          });
        }
      });
      
      return results;
    });
    
    console.log(`   Found ${events.length} events`);
    return events;
  }

  // Shotgun Scraper
  async scrapeShotgun(page, url, genre) {
    console.log(`\n📡 Shotgun ${genre}: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // Try Next.js data first
      const nextData = document.querySelector('#__NEXT_DATA__');
      if (nextData) {
        try {
          const data = JSON.parse(nextData.textContent);
          const eventList = data?.props?.pageProps?.events || 
                           data?.props?.pageProps?.initialEvents || [];
          eventList.forEach(e => {
            results.push({
              title: e.name || e.title,
              date: e.startDate || e.date,
              venue: e.venue?.name || e.venueName,
              image: e.coverUrl || e.imageUrl || e.image,
              url: e.url || `https://shotgun.live/events/${e.slug || e.id}`
            });
          });
        } catch {}
      }
      
      // Fallback to DOM
      if (results.length === 0) {
        document.querySelectorAll('a[href*="/events/"]').forEach(link => {
          const card = link.closest('[class*="card"], [class*="Card"], article') || link.parentElement;
          const title = card?.querySelector('h2, h3, [class*="title"]')?.textContent?.trim();
          const date = card?.querySelector('[class*="date"], time')?.textContent?.trim();
          const venue = card?.querySelector('[class*="venue"]')?.textContent?.trim();
          const img = card?.querySelector('img')?.src;
          
          if (title && title.length > 3) {
            results.push({ title, date, venue, image: img, url: link.href });
          }
        });
      }
      
      return results;
    });
    
    console.log(`   Found ${events.length} events`);
    return events.map(e => ({ ...e, genre }));
  }

  // RA Scraper
  async scrapeRA(page, url) {
    console.log(`\n📡 RA: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 6000));
    
    // Scroll to load
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 800));
    }
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // RA uses specific patterns
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        if (link.href.includes('/events/us/')) return; // Skip category links
        
        const card = link.closest('li, article, div[class*="event"]') || link.parentElement?.parentElement;
        if (!card) return;
        
        const title = card.querySelector('span, h3, [class*="title"]')?.textContent?.trim();
        const dateEl = card.querySelector('time, [class*="date"]');
        const venue = card.querySelector('[class*="venue"]')?.textContent?.trim();
        const img = card.querySelector('img')?.src;
        
        if (title && title.length > 3 && !results.find(r => r.title === title)) {
          results.push({
            title,
            date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim(),
            venue,
            image: img,
            url: link.href
          });
        }
      });
      
      return results;
    });
    
    console.log(`   Found ${events.length} events`);
    return events;
  }

  // Joonbug Scraper
  async scrapeJoonbug(page, url, city) {
    console.log(`\n📡 Joonbug ${city}: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // Look for event cards
      document.querySelectorAll('.event-card, [class*="event-card"], [class*="EventCard"], article').forEach(card => {
        const link = card.querySelector('a');
        const title = card.querySelector('h2, h3, .title, [class*="title"]')?.textContent?.trim();
        const date = card.querySelector('.date, time, [class*="date"]')?.textContent?.trim();
        const venue = card.querySelector('.venue, [class*="venue"]')?.textContent?.trim();
        const img = card.querySelector('img')?.src;
        
        if (title && title.length > 3) {
          results.push({ title, date, venue, image: img, url: link?.href });
        }
      });
      
      // Also check JSON-LD
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'Event') {
            results.push({
              title: data.name,
              date: data.startDate,
              venue: data.location?.name,
              image: data.image,
              url: data.url
            });
          }
        } catch {}
      });
      
      return results;
    });
    
    console.log(`   Found ${events.length} events`);
    return events.map(e => ({ ...e, city }));
  }

  // Posh Scraper
  async scrapePosh(page, url) {
    console.log(`\n📡 Posh: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const events = await page.evaluate(() => {
      const results = [];
      
      // Try Next.js data
      const nextData = document.querySelector('#__NEXT_DATA__');
      if (nextData) {
        try {
          const data = JSON.parse(nextData.textContent);
          const eventList = data?.props?.pageProps?.events || 
                           data?.props?.pageProps?.group?.events || [];
          eventList.forEach(e => {
            results.push({
              title: e.name || e.title,
              date: e.startTime || e.date,
              venue: e.venue?.name,
              image: e.flyer || e.coverPhoto,
              url: `https://posh.vip/e/${e.slug || e.id}`
            });
          });
        } catch {}
      }
      
      // Fallback
      if (results.length === 0) {
        document.querySelectorAll('a[href*="/e/"]').forEach(link => {
          const card = link.closest('[class*="card"]') || link.parentElement;
          const title = card?.querySelector('h2, h3, [class*="title"]')?.textContent?.trim();
          const date = card?.querySelector('[class*="date"]')?.textContent?.trim();
          const img = card?.querySelector('img')?.src;
          
          if (title) results.push({ title, date, image: img, url: link.href });
        });
      }
      
      return results;
    });
    
    console.log(`   Found ${events.length} events`);
    return events;
  }

  processEvents(events, sourceType, sourceHandle) {
    let inserted = 0;
    
    for (const raw of events) {
      this.stats.processed++;
      
      const date = this.parseDate(raw.date);
      const venue = raw.venue || sourceHandle;
      const vibes = this.extractVibes(`${raw.title} ${raw.genre || ''}`);
      const slug = this.generateSlug(raw.title, date, venue);
      
      if (!date || date < new Date().toISOString().split('T')[0]) continue;
      
      if (this.isDuplicate(slug, raw.title, venue, date)) {
        this.stats.duplicates++;
        continue;
      }
      
      try {
        this.insertEvent({
          name: raw.title,
          date,
          venue,
          vibes,
          url: raw.url,
          image: raw.image,
          description: raw.description,
          source: sourceType,
          sourceHandle,
          slug
        });
        this.stats.inserted++;
        inserted++;
        console.log(`   ✓ ${raw.title?.substring(0, 45)}...`);
      } catch (err) {
        this.stats.errors++;
      }
    }
    
    return inserted;
  }

  async run() {
    console.log('='.repeat(60));
    console.log('  LUMINA V2 - STEALTH SCRAPER');
    console.log('  ' + new Date().toISOString());
    console.log('='.repeat(60));
    
    await this.init();
    const page = await this.browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    
    try {
      // DICE
      let events = await this.scrapeDICE(page, 'https://dice.fm/events/new-york');
      this.processEvents(events, 'dice', 'dice.fm');
      
      events = await this.scrapeDICE(page, 'https://dice.fm/venue/the-delancey-dvd6');
      this.processEvents(events, 'dice', 'dice.fm');
      
      // Shotgun
      events = await this.scrapeShotgun(page, 'https://shotgun.live/en/cities/new-york/house', 'house');
      this.processEvents(events, 'shotgun', 'shotgun.live');
      
      events = await this.scrapeShotgun(page, 'https://shotgun.live/en/cities/new-york/hip-hop', 'hip-hop');
      this.processEvents(events, 'shotgun', 'shotgun.live');
      
      events = await this.scrapeShotgun(page, 'https://shotgun.live/en/cities/new-york/techno', 'techno');
      this.processEvents(events, 'shotgun', 'shotgun.live');
      
      // RA
      events = await this.scrapeRA(page, 'https://ra.co/events/us/newyorkcity');
      this.processEvents(events, 'ra', 'ra.co');
      
      // Joonbug
      events = await this.scrapeJoonbug(page, 'https://joonbug.com/newyork/events', 'NYC');
      this.processEvents(events, 'joonbug', 'joonbug.com');
      
      events = await this.scrapeJoonbug(page, 'https://joonbug.com/hoboken/events', 'Hoboken');
      this.processEvents(events, 'joonbug', 'joonbug.com');
      
      // Posh
      events = await this.scrapePosh(page, 'https://posh.vip/g/jsm-hospitality-group');
      this.processEvents(events, 'posh', 'posh.vip');
      
    } catch (error) {
      console.error('Scraper error:', error.message);
    }
    
    await this.close();
    
    console.log('\n' + '='.repeat(60));
    console.log('  STEALTH SCRAPER COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Processed: ${this.stats.processed}`);
    console.log(`  Inserted:  ${this.stats.inserted}`);
    console.log(`  Duplicates: ${this.stats.duplicates}`);
    console.log(`  Errors:    ${this.stats.errors}`);
    console.log('='.repeat(60) + '\n');
  }
}

const scraper = new StealthScraper();
scraper.run().catch(console.error);

export default StealthScraper;
