/**
 * LUMINA V2 - Apify Text Extractor
 * ==================================
 * Extracts events from page text content
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class ApifyTextExtractor {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { processed: 0, inserted: 0, duplicates: 0, skipped: 0 };
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch {}
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const match = dateStr.toLowerCase().match(/(\w{3})\w*[,.\s]+(\d{1,2})(?:[,.\s]+(\d{4}))?/);
    if (match && months[match[1]] !== undefined) {
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      const date = new Date(year, months[match[1]], parseInt(match[2]));
      if (date < new Date() && !match[3]) date.setFullYear(year + 1);
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
    if (text.includes('kompa')) vibes.push('kompa');
    if (text.includes('rooftop')) vibes.push('rooftop');
    if (text.includes('open bar')) vibes.push('open-bar');
    if (text.includes('dj')) vibes.push('dj');
    if (text.includes('nye') || text.includes('new year')) vibes.push('nye');
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
      event.name, event.name.substring(0, 50), event.date, event.venue, event.city || 'New York', null,
      event.date ? `${event.date}T00:00:00` : null, event.date, event.description || null,
      JSON.stringify(event.vibes), JSON.stringify([]), null, '21+', event.url,
      event.image, event.image, event.source, event.sourceHandle,
      new Date().toISOString(), 0.7, event.slug, new Date().toISOString()
    );
  }

  extractEventFromUrl(url) {
    // Extract city from URL
    let city = 'New York';
    if (url.includes('/hoboken')) city = 'Hoboken';
    if (url.includes('/brooklyn')) city = 'Brooklyn';
    if (url.includes('/boston')) city = 'Boston';
    if (url.includes('/philadelphia')) city = 'Philadelphia';
    if (url.includes('/washington-dc')) city = 'Washington DC';
    if (url.includes('/baltimore')) city = 'Baltimore';
    
    return { city };
  }

  extractVenueFromText(text, title) {
    // Try to find venue name patterns
    const patterns = [
      /at\s+(?:The\s+)?([A-Z][A-Za-z\s&']+?)(?:\s+[-–]|\s+is|\s+in|\s+for|\s+this|\.|,)/,
      /(?:The\s+)?([A-Z][A-Za-z\s&']+?)\s+(?:is hosting|presents|invites)/i,
      /venue[:\s]+([A-Z][A-Za-z\s&']+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].length > 3 && match[1].length < 50) {
        return match[1].trim();
      }
    }
    
    // Extract from title
    const titleMatch = title?.match(/at\s+(?:The\s+)?([A-Z][A-Za-z\s&']+)/);
    if (titleMatch) return titleMatch[1].trim();
    
    return null;
  }

  processItem(item) {
    const url = item.url || '';
    const title = item.metadata?.title || '';
    const text = item.text || '';
    const description = item.metadata?.description || '';
    const ogImage = item.metadata?.openGraph?.find(og => og.property === 'og:image')?.content;
    
    // Skip non-event pages
    if (!url.includes('/newyearseve/') && !url.includes('/event/') && !url.includes('/events/')) {
      return null;
    }
    
    // Skip list pages
    if (url.endsWith('/events') || url.endsWith('/newyearseve')) {
      return null;
    }
    
    // Extract event name from title
    let eventName = title.split('|')[0].split('-')[0].trim();
    if (eventName.length < 5) eventName = title;
    
    // Clean up the name
    eventName = eventName.replace(/\s+/g, ' ').trim();
    
    // Get city from URL
    const { city } = this.extractEventFromUrl(url);
    
    // Skip non-NYC area for now
    if (!['New York', 'Hoboken', 'Brooklyn'].includes(city)) {
      return null;
    }
    
    // Extract venue
    const venue = this.extractVenueFromText(text, title) || 
                  this.extractVenueFromText(description, title);
    
    // For NYE events, set date to Dec 31, 2025
    let date = null;
    if (url.includes('newyearseve') || text.toLowerCase().includes('new year')) {
      date = '2025-12-31';
    }
    
    // Extract description (first meaningful paragraph)
    const descMatch = text.match(/About the Event[:\s]*([^]*?)(?:Amenities|Tickets|Buy|$)/i);
    const eventDesc = descMatch ? descMatch[1].trim().substring(0, 500) : description?.substring(0, 500);
    
    return {
      name: eventName,
      date,
      venue: venue || 'Venue TBA',
      city,
      description: eventDesc,
      url,
      image: ogImage,
      source: 'joonbug',
      sourceHandle: 'joonbug.com',
      vibes: this.extractVibes(`${eventName} ${text}`)
    };
  }

  async run(apiUrl) {
    console.log('🌐 Fetching Apify dataset...\n');
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log(`Found ${data.length} items\n`);
    
    // Filter to event pages
    const eventPages = data.filter(d => {
      const url = d.url || '';
      return (url.includes('/newyearseve/') || url.includes('/event/')) && 
             !url.endsWith('/newyearseve') && !url.endsWith('/events');
    });
    
    console.log(`Found ${eventPages.length} event pages\n`);
    
    for (const item of eventPages) {
      this.stats.processed++;
      
      const event = this.processItem(item);
      if (!event || !event.name || !event.date) {
        this.stats.skipped++;
        continue;
      }
      
      const slug = this.generateSlug(event.name, event.date, event.venue);
      
      if (this.isDuplicate(slug, event.name, event.venue, event.date)) {
        this.stats.duplicates++;
        continue;
      }
      
      try {
        this.insertEvent({ ...event, slug });
        this.stats.inserted++;
        console.log(`✓ ${event.name.substring(0, 45)}... @ ${event.venue?.substring(0, 20)}`);
      } catch (err) {
        console.error(`✗ Error: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('  EXTRACTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`  Processed: ${this.stats.processed}`);
    console.log(`  Inserted:  ${this.stats.inserted}`);
    console.log(`  Duplicates: ${this.stats.duplicates}`);
    console.log(`  Skipped:   ${this.stats.skipped}`);
    console.log('='.repeat(50) + '\n');
    
    // Show DB stats
    const stats = this.db.prepare("SELECT COUNT(*) as total, COUNT(CASE WHEN date >= date('now') THEN 1 END) as upcoming FROM events").get();
    console.log(`📊 Database: ${stats.total} total | ${stats.upcoming} upcoming\n`);
    
    this.db.close();
  }
}

const apiUrl = process.argv[2] || 'https://api.apify.com/v2/datasets/pMJJJVgEp5PHFHneL/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const extractor = new ApifyTextExtractor();
extractor.run(apiUrl).catch(console.error);

export default ApifyTextExtractor;
