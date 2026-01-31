/**
 * LUMINA V2 - Apify Event Processor
 * ==================================
 * Processes Apify scraper output and imports events into database
 * Handles multiple data formats from different Apify actors
 * 
 * Usage:
 *   node apify-event-processor.js --api <apify-api-url>
 *   node apify-event-processor.js /path/to/apify-output.json
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class ApifyEventProcessor {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { processed: 0, inserted: 0, duplicates: 0, errors: 0, skipped: 0 };
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch {}
    return null;
  }

  parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3]?.toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  extractVibes(text) {
    if (!text) return [];
    text = text.toLowerCase();
    const vibes = [];
    if (text.includes('afrobeat')) vibes.push('afrobeats');
    if (text.includes('amapiano')) vibes.push('amapiano');
    if (text.includes('hip hop') || text.includes('hip-hop') || text.includes('hiphop')) vibes.push('hip-hop');
    if (text.includes('r&b') || text.includes('rnb')) vibes.push('r&b');
    if (text.includes('reggae')) vibes.push('reggae');
    if (text.includes('dancehall')) vibes.push('dancehall');
    if (text.includes('latin') || text.includes('reggaeton') || text.includes('salsa')) vibes.push('latin');
    if (text.includes('house') && !text.includes('warehouse')) vibes.push('house');
    if (text.includes('techno')) vibes.push('techno');
    if (text.includes('rooftop')) vibes.push('rooftop');
    if (text.includes('brunch')) vibes.push('brunch');
    if (text.includes('lounge')) vibes.push('lounge');
    if (text.includes('club')) vibes.push('club');
    if (text.includes('upscale') || text.includes('vip')) vibes.push('upscale');
    if (text.includes('dj')) vibes.push('dj');
    if (text.includes('live music') || text.includes('live band')) vibes.push('live-music');
    return [...new Set(vibes)];
  }

  generateSlug(title, date, venue) {
    return [title || 'event', venue || '', date || '']
      .join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100);
  }

  isDuplicate(event) {
    if (event.slug) {
      const existing = this.db.prepare('SELECT id FROM events WHERE slug = ?').get(event.slug);
      if (existing) return true;
    }
    if (event.venue_name && event.date) {
      const similar = this.db.prepare('SELECT id, name FROM events WHERE venue_name = ? AND date = ?').all(event.venue_name, event.date);
      const cleanTitle = (event.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const existing of similar) {
        const existingClean = (existing.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanTitle === existingClean || cleanTitle.includes(existingClean) || existingClean.includes(cleanTitle)) return true;
      }
    }
    return false;
  }

  getSourceType(url) {
    if (!url) return 'apify';
    if (url.includes('dice.fm')) return 'dice';
    if (url.includes('ra.co')) return 'ra';
    if (url.includes('posh.vip')) return 'posh';
    if (url.includes('shotgun')) return 'shotgun';
    if (url.includes('joonbug')) return 'joonbug';
    if (url.includes('universe')) return 'universe';
    if (url.includes('eventbrite')) return 'eventbrite';
    if (url.includes('delancey')) return 'delancey';
    if (url.includes('thedl')) return 'thedl';
    return 'website';
  }

  // Extract events from JSON-LD data in metadata
  extractFromJsonLd(jsonLd, sourceUrl) {
    const events = [];
    if (!jsonLd) return events;
    
    const ldArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    
    for (const ld of ldArray) {
      // Direct Event type
      if (ld['@type'] === 'Event' || ld['@type'] === 'MusicEvent') {
        events.push(this.normalizeJsonLdEvent(ld, sourceUrl));
      }
      
      // EventVenue with events array
      if (ld['@type'] === 'EventVenue' && ld.events) {
        for (const evt of ld.events) {
          events.push(this.normalizeJsonLdEvent(evt, sourceUrl, ld.name));
        }
      }
      
      // ItemList with events
      if (ld['@type'] === 'ItemList' && ld.itemListElement) {
        for (const item of ld.itemListElement) {
          if (item.item?.['@type'] === 'Event') {
            events.push(this.normalizeJsonLdEvent(item.item, sourceUrl));
          }
        }
      }
    }
    
    return events;
  }

  normalizeJsonLdEvent(ld, sourceUrl, defaultVenue = null) {
    const title = ld.name || '';
    const venue = ld.location?.name || defaultVenue || '';
    const dateStr = ld.startDate || '';
    const date = this.parseDate(dateStr);
    const allText = `${title} ${ld.description || ''}`;
    const vibes = this.extractVibes(allText);
    
    return {
      name: title.trim(),
      short_title: title.length > 50 ? title.substring(0, 47) + '...' : title,
      date: date,
      venue_name: venue.trim(),
      venue_address: ld.location?.address?.streetAddress || null,
      city: 'New York',
      neighborhood: null,
      time: this.parseTime(dateStr),
      start_datetime: date ? `${date}T${this.parseTime(dateStr) || '00:00:00'}` : null,
      event_date: date,
      description: ld.description || null,
      music_genre: null,
      vibe_tags: JSON.stringify(vibes),
      mood_tags: JSON.stringify([]),
      price: ld.offers?.price || null,
      price_range: null,
      age_restriction: '21+',
      ticket_url: ld.url || ld.offers?.url || sourceUrl,
      image_url: ld.image || null,
      cover_image_url: ld.image || null,
      source_type: this.getSourceType(sourceUrl),
      source_handle: sourceUrl ? new URL(sourceUrl).hostname : 'apify',
      scraped_at: new Date().toISOString(),
      confidence_score: 0.7,
      slug: this.generateSlug(title, date, venue),
      why_go: vibes.length > 0 ? `Vibes: ${vibes.join(', ')}` : 'NYC nightlife',
      enriched_at: new Date().toISOString()
    };
  }

  insertEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO events (name, short_title, date, venue_name, city, neighborhood, time, start_datetime, 
      event_date, description, music_genre, vibe_tags, mood_tags, price, price_range, age_restriction,
      ticket_url, image_url, cover_image_url, source_type, source_handle, scraped_at, confidence_score, 
      slug, why_go, enriched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      event.name, event.short_title, event.date, event.venue_name, event.city, event.neighborhood,
      event.time, event.start_datetime, event.event_date, event.description, event.music_genre,
      event.vibe_tags, event.mood_tags, event.price, event.price_range, event.age_restriction,
      event.ticket_url, event.image_url, event.cover_image_url, event.source_type, event.source_handle,
      event.scraped_at, event.confidence_score, event.slug, event.why_go, event.enriched_at
    );
  }

  processApifyResult(item) {
    const sourceUrl = item.url || item.crawl?.loadedUrl || '';
    const events = [];
    
    // Method 1: Extract from JSON-LD in metadata
    if (item.metadata?.jsonLd) {
      events.push(...this.extractFromJsonLd(item.metadata.jsonLd, sourceUrl));
    }
    
    // Method 2: Direct events array (from custom page function)
    if (item.events && Array.isArray(item.events)) {
      for (const raw of item.events) {
        if (raw.eventTitle || raw.title || raw.name) {
          const title = raw.eventTitle || raw.title || raw.name || '';
          const venue = raw.venueName || raw.venue || '';
          const dateStr = raw.dateTime || raw.date || '';
          const date = this.parseDate(dateStr);
          const allText = `${title} ${raw.description || ''} ${raw.genre || ''}`;
          const vibes = this.extractVibes(allText);
          
          events.push({
            name: title.trim(),
            short_title: title.length > 50 ? title.substring(0, 47) + '...' : title,
            date: date,
            venue_name: venue.trim(),
            city: 'New York',
            neighborhood: null,
            time: this.parseTime(dateStr),
            start_datetime: date ? `${date}T${this.parseTime(dateStr) || '00:00:00'}` : null,
            event_date: date,
            description: raw.description || null,
            music_genre: raw.genre || null,
            vibe_tags: JSON.stringify(vibes),
            mood_tags: JSON.stringify([]),
            price: raw.price || null,
            price_range: null,
            age_restriction: '21+',
            ticket_url: raw.eventUrl || raw.url || sourceUrl,
            image_url: raw.imageUrl || raw.image || null,
            cover_image_url: raw.imageUrl || raw.image || null,
            source_type: this.getSourceType(sourceUrl),
            source_handle: sourceUrl ? new URL(sourceUrl).hostname : 'apify',
            scraped_at: new Date().toISOString(),
            confidence_score: 0.6,
            slug: this.generateSlug(title, date, venue),
            why_go: vibes.length > 0 ? `Vibes: ${vibes.join(', ')}` : null,
            enriched_at: new Date().toISOString()
          });
        }
      }
    }
    
    // Process each extracted event
    for (const event of events) {
      this.stats.processed++;
      
      if (!event.name || !event.date) {
        this.stats.skipped++;
        continue;
      }
      
      // Skip past events
      if (event.date < new Date().toISOString().split('T')[0]) {
        this.stats.skipped++;
        continue;
      }
      
      if (this.isDuplicate(event)) {
        this.stats.duplicates++;
        console.log(`  ↺ Dup: ${event.name?.substring(0, 35)}...`);
        continue;
      }
      
      try {
        this.insertEvent(event);
        this.stats.inserted++;
        console.log(`  ✓ NEW: ${event.name?.substring(0, 35)}... @ ${event.venue_name?.substring(0, 20)}`);
      } catch (error) {
        this.stats.errors++;
        console.error(`  ✗ Err: ${error.message}`);
      }
    }
    
    return events.length;
  }

  async fetchFromApi(apiUrl) {
    console.log(`\n🌐 Fetching from Apify API...`);
    console.log(`   ${apiUrl.substring(0, 80)}...`);
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log(`   Found ${data.length} items\n`);
    
    for (const item of data) {
      const url = item.url || item.crawl?.loadedUrl || 'unknown';
      console.log(`📄 ${url.substring(0, 60)}...`);
      this.processApifyResult(item);
    }
  }

  processFile(filePath) {
    console.log(`\n📁 Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      this.processApifyResult(item);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('  APIFY IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`  Processed: ${this.stats.processed}`);
    console.log(`  Inserted:  ${this.stats.inserted}`);
    console.log(`  Duplicates: ${this.stats.duplicates}`);
    console.log(`  Skipped:   ${this.stats.skipped}`);
    console.log(`  Errors:    ${this.stats.errors}`);
    console.log('='.repeat(50) + '\n');
  }

  getStats() {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN date >= date('now') THEN 1 END) as upcoming,
      COUNT(CASE WHEN source_type NOT IN ('', 'tao', 'joonbug') OR source_type IS NULL THEN 1 END) as new_sources
      FROM events
    `).get();
    console.log(`📊 Database: ${stats.total} total | ${stats.upcoming} upcoming\n`);
    return stats;
  }

  close() { this.db.close(); }
}

// CLI
const args = process.argv.slice(2);
const processor = new ApifyEventProcessor();

try {
  if (args.includes('--help') || args.length === 0) {
    console.log(`
LUMINA V2 - Apify Event Processor

Usage:
  node apify-event-processor.js --api <apify-dataset-url>
  node apify-event-processor.js <file.json>
  node apify-event-processor.js --stats
    `);
    process.exit(0);
  }

  if (args.includes('--stats')) {
    processor.getStats();
  } else if (args.includes('--api')) {
    const apiIndex = args.indexOf('--api');
    const apiUrl = args[apiIndex + 1];
    await processor.fetchFromApi(apiUrl);
    processor.printSummary();
    processor.getStats();
  } else {
    for (const arg of args) {
      if (fs.existsSync(arg)) processor.processFile(arg);
    }
    processor.printSummary();
    processor.getStats();
  }
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  processor.close();
}

export default ApifyEventProcessor;
