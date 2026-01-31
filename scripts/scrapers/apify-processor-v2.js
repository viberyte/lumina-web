/**
 * LUMINA V2 - Apify Processor V2
 * ===============================
 * Handles the new Apify dataset format with 616 items
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class ApifyProcessorV2 {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { processed: 0, inserted: 0, duplicates: 0, skipped: 0, errors: 0 };
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
    if (text.includes('kompa')) vibes.push('kompa');
    if (text.includes('rooftop')) vibes.push('rooftop');
    if (text.includes('brunch')) vibes.push('brunch');
    if (text.includes('dj')) vibes.push('dj');
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
      INSERT INTO events (name, short_title, date, venue_name, city, neighborhood, time, start_datetime, event_date,
        description, vibe_tags, mood_tags, price_range, age_restriction, ticket_url, image_url,
        cover_image_url, source_type, source_handle, scraped_at, confidence_score, slug, enriched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.name, event.name.substring(0, 50), event.date, event.venue, 'New York', event.neighborhood || null,
      null, event.date ? `${event.date}T00:00:00` : null, event.date, event.description || null,
      JSON.stringify(event.vibes), JSON.stringify([]), null, '21+', event.url,
      event.image, event.image, event.source, event.sourceHandle,
      new Date().toISOString(), 0.7, event.slug, new Date().toISOString()
    );
  }

  getSourceType(url) {
    if (!url) return 'apify';
    if (url.includes('dice.fm')) return 'dice';
    if (url.includes('ra.co')) return 'ra';
    if (url.includes('posh.vip')) return 'posh';
    if (url.includes('shotgun')) return 'shotgun';
    if (url.includes('joonbug')) return 'joonbug';
    if (url.includes('eventbrite')) return 'eventbrite';
    if (url.includes('delancey')) return 'delancey';
    if (url.includes('thedl')) return 'thedl';
    if (url.includes('nebula')) return 'nebula';
    if (url.includes('somewherenowhere')) return 'somewherenowhere';
    return 'website';
  }

  extractEventsFromItem(item) {
    const events = [];
    const sourceUrl = item.url || item.crawl?.loadedUrl || '';
    const sourceType = this.getSourceType(sourceUrl);
    
    // Method 1: Extract from JSON-LD
    if (item.metadata?.jsonLd) {
      const jsonLdArray = Array.isArray(item.metadata.jsonLd) ? item.metadata.jsonLd : [item.metadata.jsonLd];
      
      for (const ld of jsonLdArray) {
        // EventVenue with events array
        if (ld['@type'] === 'EventVenue' && ld.events) {
          const venueName = ld.name || '';
          const venueAddress = ld.address?.streetAddress || '';
          
          for (const evt of ld.events) {
            if (evt['@type'] === 'Event' && evt.name) {
              events.push({
                name: evt.name,
                date: this.parseDate(evt.startDate),
                venue: venueName,
                neighborhood: venueAddress,
                description: evt.description,
                url: evt.offers?.url || evt.url || sourceUrl,
                image: evt.image || ld.image,
                source: sourceType,
                sourceHandle: new URL(sourceUrl).hostname
              });
            }
          }
        }
        
        // Direct Event type
        if (ld['@type'] === 'Event' && ld.name) {
          events.push({
            name: ld.name,
            date: this.parseDate(ld.startDate),
            venue: ld.location?.name || '',
            description: ld.description,
            url: ld.url || sourceUrl,
            image: ld.image,
            source: sourceType,
            sourceHandle: new URL(sourceUrl).hostname
          });
        }
        
        // ItemList with events
        if (ld['@type'] === 'ItemList' && ld.itemListElement) {
          for (const listItem of ld.itemListElement) {
            const evt = listItem.item || listItem;
            if (evt['@type'] === 'Event' && evt.name) {
              events.push({
                name: evt.name,
                date: this.parseDate(evt.startDate),
                venue: evt.location?.name || '',
                description: evt.description,
                url: evt.url || sourceUrl,
                image: evt.image,
                source: sourceType,
                sourceHandle: new URL(sourceUrl).hostname
              });
            }
          }
        }
      }
    }
    
    // Method 2: Parse from text content for event-like patterns
    if (events.length === 0 && item.text) {
      // Look for event names in text
      const lines = item.text.split('\n').filter(l => l.trim().length > 5 && l.trim().length < 100);
      // This is a fallback - might need manual review
    }
    
    return events;
  }

  async processApifyUrl(apiUrl) {
    console.log('🌐 Fetching Apify dataset...');
    console.log(`   ${apiUrl.substring(0, 60)}...`);
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log(`   Found ${data.length} items\n`);
    
    let totalEvents = 0;
    
    for (const item of data) {
      const url = item.url || '';
      const events = this.extractEventsFromItem(item);
      
      if (events.length > 0) {
        console.log(`📄 ${url.substring(0, 50)}... → ${events.length} events`);
        totalEvents += events.length;
        
        for (const evt of events) {
          this.stats.processed++;
          
          if (!evt.name || !evt.date) {
            this.stats.skipped++;
            continue;
          }
          
          // Skip past events
          const today = new Date().toISOString().split('T')[0];
          if (evt.date < today) {
            this.stats.skipped++;
            continue;
          }
          
          const vibes = this.extractVibes(`${evt.name} ${evt.description || ''} ${evt.venue || ''}`);
          const slug = this.generateSlug(evt.name, evt.date, evt.venue);
          
          if (this.isDuplicate(slug, evt.name, evt.venue, evt.date)) {
            this.stats.duplicates++;
            continue;
          }
          
          try {
            this.insertEvent({ ...evt, vibes, slug });
            this.stats.inserted++;
            console.log(`   ✓ ${evt.name.substring(0, 40)}...`);
          } catch (err) {
            this.stats.errors++;
          }
        }
      }
    }
    
    console.log(`\n📊 Total events extracted: ${totalEvents}`);
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

  getDbStats() {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN date >= date('now') THEN 1 END) as upcoming
      FROM events
    `).get();
    console.log(`📊 Database: ${stats.total} total | ${stats.upcoming} upcoming\n`);
  }

  close() { this.db.close(); }
}

// Run
const apiUrl = process.argv[2] || 'https://api.apify.com/v2/datasets/pMJJJVgEp5PHFHneL/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

const processor = new ApifyProcessorV2();
processor.processApifyUrl(apiUrl)
  .then(() => {
    processor.printSummary();
    processor.getDbStats();
  })
  .catch(console.error)
  .finally(() => processor.close());

export default ApifyProcessorV2;
