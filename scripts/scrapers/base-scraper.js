/**
 * LUMINA V2 - Base Scraper Class (ES Module)
 * ==========================================
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class BaseScraper {
  constructor(sourceName, sourceType) {
    this.sourceName = sourceName;
    this.sourceType = sourceType;
    this.db = new Database(DB_PATH);
    this.runId = null;
    this.stats = { found: 0, new: 0, updated: 0, duplicates: 0 };
  }

  startRun() {
    const stmt = this.db.prepare(`INSERT INTO scraper_runs (source_name, status) VALUES (?, 'running')`);
    const result = stmt.run(this.sourceName);
    this.runId = result.lastInsertRowid;
    console.log(`[${this.sourceName}] Started run #${this.runId}`);
    return this.runId;
  }

  completeRun(status = 'success', errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE scraper_runs SET completed_at = datetime('now'), events_found = ?, events_new = ?, 
      events_updated = ?, events_duplicates = ?, status = ?, error_message = ? WHERE id = ?
    `);
    stmt.run(this.stats.found, this.stats.new, this.stats.updated, this.stats.duplicates, status, errorMessage, this.runId);
    console.log(`[${this.sourceName}] Completed: ${this.stats.new} new, ${this.stats.updated} updated, ${this.stats.duplicates} dupes`);
  }

  normalizeEvent(rawEvent) {
    return {
      name: this.cleanText(rawEvent.title || rawEvent.name),
      short_title: this.generateShortTitle(rawEvent.title || rawEvent.name),
      date: this.normalizeDate(rawEvent.date || rawEvent.start_date),
      venue_name: this.cleanText(rawEvent.venue_name || rawEvent.venue),
      venue_id: rawEvent.venue_id || null,
      city: rawEvent.city || 'New York',
      neighborhood: rawEvent.neighborhood || null,
      time: rawEvent.time || rawEvent.start_time || null,
      start_datetime: this.buildDateTime(rawEvent.date, rawEvent.time),
      end_datetime: rawEvent.end_datetime || null,
      event_date: this.normalizeDate(rawEvent.date),
      description: this.cleanText(rawEvent.description),
      why_go: null,
      music_genre: rawEvent.genre || rawEvent.music_genre || null,
      vibe_tags: JSON.stringify(rawEvent.vibe_tags || []),
      mood_tags: JSON.stringify(rawEvent.mood_tags || []),
      tags: rawEvent.tags || null,
      price: rawEvent.price || null,
      price_range: this.normalizePriceRange(rawEvent.price),
      age_restriction: rawEvent.age_restriction || '21+',
      ticket_url: rawEvent.ticket_url || rawEvent.url || null,
      image_url: rawEvent.image_url || rawEvent.image || null,
      cover_image_url: rawEvent.cover_image_url || rawEvent.image_url || null,
      source_type: this.sourceType,
      source_handle: rawEvent.source_handle || this.sourceName,
      scraped_at: new Date().toISOString(),
      confidence_score: 0.5,
      slug: this.generateSlug(rawEvent.title || rawEvent.name, rawEvent.date, rawEvent.venue_name)
    };
  }

  cleanText(text) {
    if (!text) return null;
    return text.replace(/\s+/g, ' ').replace(/[\n\r\t]/g, ' ').trim();
  }

  generateShortTitle(title) {
    if (!title) return null;
    const clean = this.cleanText(title);
    return clean.length <= 50 ? clean : clean.substring(0, 47) + '...';
  }

  normalizeDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    } catch { return dateStr; }
  }

  buildDateTime(date, time) {
    if (!date) return null;
    const normalizedDate = this.normalizeDate(date);
    if (!time) return `${normalizedDate}T00:00:00`;
    const timeNorm = this.normalizeTime(time);
    return `${normalizedDate}T${timeNorm}`;
  }

  normalizeTime(timeStr) {
    if (!timeStr) return '00:00:00';
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return '00:00:00';
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3]?.toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  normalizePriceRange(price) {
    if (!price) return null;
    const priceStr = price.toString().toLowerCase();
    if (priceStr.includes('free') || priceStr === '0') return 'free';
    const match = priceStr.match(/\$?(\d+)/);
    if (!match) return null;
    const amount = parseInt(match[1]);
    if (amount === 0) return 'free';
    if (amount <= 20) return '$';
    if (amount <= 50) return '$$';
    return '$$$';
  }

  generateSlug(title, date, venue) {
    return [title || 'event', venue || '', date || '']
      .join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100);
  }

  findExistingEvent(event) {
    if (event.slug) {
      const bySlug = this.db.prepare('SELECT id FROM events WHERE slug = ?').get(event.slug);
      if (bySlug) return bySlug.id;
    }
    if (event.venue_name && event.date) {
      const similar = this.db.prepare('SELECT id, name FROM events WHERE venue_name = ? AND date = ?').all(event.venue_name, event.date);
      for (const existing of similar) {
        if (this.titlesMatch(existing.name, event.name)) return existing.id;
      }
    }
    return null;
  }

  titlesMatch(title1, title2) {
    if (!title1 || !title2) return false;
    const clean1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean1 === clean2) return true;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    const distance = this.levenshtein(clean1, clean2);
    const maxLen = Math.max(clean1.length, clean2.length);
    return distance / maxLen < 0.2;
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i-1) === a.charAt(j-1) ? matrix[i-1][j-1] : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
      }
    }
    return matrix[b.length][a.length];
  }

  saveEvent(event) {
    this.stats.found++;
    const existingId = this.findExistingEvent(event);
    if (existingId) {
      this.stats.duplicates++;
      this.addEventSource(existingId, event);
      return existingId;
    }
    const stmt = this.db.prepare(`
      INSERT INTO events (name, short_title, date, venue_name, venue_id, city, neighborhood, time, start_datetime, 
      end_datetime, event_date, description, music_genre, vibe_tags, mood_tags, tags, price, price_range, 
      age_restriction, ticket_url, image_url, cover_image_url, source_type, source_handle, scraped_at, confidence_score, slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(event.name, event.short_title, event.date, event.venue_name, event.venue_id, event.city, 
      event.neighborhood, event.time, event.start_datetime, event.end_datetime, event.event_date, event.description, 
      event.music_genre, event.vibe_tags, event.mood_tags, event.tags, event.price, event.price_range, event.age_restriction, 
      event.ticket_url, event.image_url, event.cover_image_url, event.source_type, event.source_handle, event.scraped_at, 
      event.confidence_score, event.slug);
    this.stats.new++;
    this.addEventSource(result.lastInsertRowid, event);
    return result.lastInsertRowid;
  }

  addEventSource(eventId, event) {
    const stmt = this.db.prepare(`INSERT INTO event_sources (event_id, source_url, source_type, source_handle, raw_title, raw_description, raw_image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(eventId, event.ticket_url || '', event.source_type, event.source_handle, event.name, event.description, event.image_url);
  }

  async scrape() { throw new Error('scrape() must be implemented by subclass'); }

  async run() {
    console.log(`\n${'='.repeat(50)}\n[${this.sourceName}] Starting scraper...\n${'='.repeat(50)}`);
    this.startRun();
    try {
      const events = await this.scrape();
      for (const rawEvent of events) {
        const normalized = this.normalizeEvent(rawEvent);
        this.saveEvent(normalized);
      }
      this.completeRun('success');
      return this.stats;
    } catch (error) {
      console.error(`[${this.sourceName}] Error:`, error.message);
      this.completeRun('failed', error.message);
      throw error;
    }
  }

  close() { this.db.close(); }
}

export default BaseScraper;
