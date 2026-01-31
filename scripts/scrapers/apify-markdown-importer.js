/**
 * LUMINA V2 - Apify Markdown Importer
 * ====================================
 * Extracts events from Apify markdown content
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class ApifyMarkdownImporter {
  constructor(apiUrl) {
    this.db = new Database(DB_PATH);
    this.apiUrl = apiUrl;
    this.stats = { processed: 0, inserted: 0, duplicates: 0, errors: 0 };
  }

  async fetchData() {
    console.log('🌐 Fetching Apify dataset...\n');
    const response = await fetch(this.apiUrl);
    const data = await response.json();
    console.log(`✓ Found ${data.length} pages\n`);
    return data;
  }

  extractEventsFromMarkdown(markdown, sourceUrl) {
    const events = [];
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for event patterns like "**December 5:** [Event Name](url)"
      const eventMatch = line.match(/\*\*([^*]+):\*\*\s*\[([^\]]+)\]\(([^)]+)\)/);
      
      if (eventMatch) {
        const [_, dateStr, title, ticketUrl] = eventMatch;
        
        events.push({
          date: dateStr.trim(),
          title: title.trim(),
          ticketUrl: ticketUrl.trim(),
          sourceUrl: sourceUrl
        });
      }
      
      // Also look for date patterns followed by event info
      const datePattern = /((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?([A-Z][a-z]+\s+\d{1,2}(?:\s*-\s*[A-Z][a-z]+\s+\d{1,2})?)/;
      const dateMatch = line.match(datePattern);
      
      if (dateMatch && line.length > 20 && !line.startsWith('#')) {
        const dateStr = dateMatch[0];
        let title = line.replace(dateStr, '').trim();
        
        // Remove time info
        title = title.replace(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?/g, '').trim();
        
        // Extract URL if present
        const urlMatch = title.match(/\[([^\]]+)\]\(([^)]+)\)/);
        let ticketUrl = sourceUrl;
        
        if (urlMatch) {
          title = urlMatch[1];
          ticketUrl = urlMatch[2];
        }
        
        if (title.length > 5 && title.length < 200) {
          events.push({
            date: dateStr,
            title: title,
            ticketUrl: ticketUrl,
            sourceUrl: sourceUrl
          });
        }
      }
    }
    
    return events;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Clean up the date string
    dateStr = dateStr.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,\s]*/i, '').trim();
    
    const months = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    // Handle "December 5" or "Dec 5"
    const match = dateStr.toLowerCase().match(/(\w+)\s+(\d{1,2})/);
    if (match) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      
      if (months[monthName] !== undefined) {
        const year = new Date().getFullYear();
        const date = new Date(year, months[monthName], day);
        
        // If date is in past, assume next year
        if (date < new Date()) {
          date.setFullYear(year + 1);
        }
        
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  }

  detectVenue(text, url) {
    // Try to extract venue from URL or text
    if (url.includes('keemeatsb.com')) return 'Various Venues';
    if (url.includes('universe.com')) return 'V5 New York';
    if (url.includes('shotgun.live')) return 'Various Venues';
    if (url.includes('ra.co')) return 'Various Venues';
    
    // Look for venue in text
    const venueMatch = text.match(/(?:at|@)\s+([A-Z][A-Za-z\s&'-]+?)(?:\s*\n|$)/);
    if (venueMatch) {
      return venueMatch[1].trim();
    }
    
    return 'Venue TBA';
  }

  extractVibes(text) {
    if (!text) return [];
    text = text.toLowerCase();
    const vibes = [];
    
    if (text.includes('afrobeat') || text.includes('afro beat')) vibes.push('afrobeats');
    if (text.includes('amapiano')) vibes.push('amapiano');
    if (text.includes('hip hop') || text.includes('hip-hop') || text.includes('hiphop')) vibes.push('hip-hop');
    if (text.includes('r&b') || text.includes('rnb') || text.includes('r and b')) vibes.push('r&b');
    if (text.includes('reggae')) vibes.push('reggae');
    if (text.includes('dancehall')) vibes.push('dancehall');
    if (text.includes('latin') || text.includes('reggaeton')) vibes.push('latin');
    if (text.includes('house music') || text.includes('house')) vibes.push('house');
    if (text.includes('techno')) vibes.push('techno');
    if (text.includes('rooftop')) vibes.push('rooftop');
    if (text.includes('brunch')) vibes.push('brunch');
    if (text.includes('karaoke')) vibes.push('karaoke');
    if (text.includes('nye') || text.includes('new year')) vibes.push('nye');
    
    return [...new Set(vibes)];
  }

  generateSlug(title, date, venue) {
    return [title || '', venue || '', date || '']
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  isDuplicate(event) {
    if (event.slug) {
      const exists = this.db.prepare('SELECT id FROM events WHERE slug = ?').get(event.slug);
      if (exists) return true;
    }
    
    // Check for similar events on same date
    const similar = this.db.prepare(
      'SELECT name FROM events WHERE date = ?'
    ).all(event.date);
    
    const clean = (event.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const s of similar) {
      const c = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === c || (clean.length > 10 && c.length > 10 && (clean.includes(c) || c.includes(clean)))) {
        return true;
      }
    }
    
    return false;
  }

  insertEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        name, short_title, date, venue_name, city, start_datetime, event_date,
        description, vibe_tags, mood_tags, age_restriction,
        ticket_url, source_type, source_handle,
        scraped_at, confidence_score, slug, enriched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.name,
      event.name.substring(0, 50),
      event.date,
      event.venue,
      event.city,
      event.date ? `${event.date}T00:00:00` : null,
      event.date,
      event.description,
      JSON.stringify(event.vibes),
      JSON.stringify([]),
      '21+',
      event.ticketUrl,
      'apify',
      event.sourceHandle,
      new Date().toISOString(),
      0.7,
      event.slug,
      new Date().toISOString()
    );
  }

  async run() {
    console.log('🌟 LUMINA V2 - Apify Markdown Importer');
    console.log('='.repeat(70) + '\n');
    
    const data = await this.fetchData();
    
    for (const item of data) {
      if (!item.markdown) continue;
      
      const rawEvents = this.extractEventsFromMarkdown(item.markdown, item.url);
      
      console.log(`📄 ${item.url}`);
      console.log(`   Found ${rawEvents.length} events\n`);
      
      for (const raw of rawEvents) {
        this.stats.processed++;
        
        try {
          const date = this.parseDate(raw.date);
          if (!date) {
            this.stats.errors++;
            continue;
          }
          
          const venue = this.detectVenue(raw.title, raw.sourceUrl);
          const vibes = this.extractVibes(raw.title);
          const slug = this.generateSlug(raw.title, date, venue);
          
          const event = {
            name: raw.title,
            date: date,
            venue: venue,
            city: 'New York',
            description: null,
            vibes: vibes,
            ticketUrl: raw.ticketUrl,
            sourceHandle: new URL(raw.sourceUrl).hostname,
            slug: slug
          };
          
          if (!this.isDuplicate(event)) {
            this.insertEvent(event);
            this.stats.inserted++;
            console.log(`  ✓ ${event.name.substring(0, 60)}`);
          } else {
            this.stats.duplicates++;
          }
        } catch (err) {
          this.stats.errors++;
          console.error(`  ✗ Error: ${err.message}`);
        }
      }
    }
    
    this.db.close();
    
    // Print summary
    const totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const upcomingEvents = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE date >= date("now")').get().count;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 IMPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`✓ Processed: ${this.stats.processed} events`);
    console.log(`✓ Inserted: ${this.stats.inserted} new events`);
    console.log(`⊘ Duplicates: ${this.stats.duplicates}`);
    console.log(`✗ Errors: ${this.stats.errors}`);
    console.log('='.repeat(70));
    console.log(`📊 Database: ${totalEvents} total | ${upcomingEvents} upcoming\n`);
  }
}

// Run importer
const apiUrl = process.argv[2];
if (!apiUrl) {
  console.error('Usage: node apify-markdown-importer.js <APIFY_API_URL>');
  process.exit(1);
}

const importer = new ApifyMarkdownImporter(apiUrl);
importer.run().catch(console.error);
