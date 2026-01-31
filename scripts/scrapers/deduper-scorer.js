/**
 * LUMINA V2 - De-duplicator & Scorer (ES Module)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class DeduperScorer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { duplicatesFound: 0, merged: 0, scored: 0 };
  }

  findDuplicates() {
    console.log('\nDe-duplicator - Finding duplicate events\n');
    const potentialDupes = this.db.prepare(`
      SELECT e1.id as id1, e1.name as name1, e1.confidence_score as score1, 
             e2.id as id2, e2.name as name2, e2.confidence_score as score2, 
             e1.venue_name, e1.date
      FROM events e1 JOIN events e2 
      ON e1.venue_name = e2.venue_name AND e1.date = e2.date AND e1.id < e2.id
      WHERE e1.canonical_id IS NULL AND e2.canonical_id IS NULL
    `).all();

    console.log(`Found ${potentialDupes.length} potential duplicate pairs`);
    for (const pair of potentialDupes) {
      if (this.titlesMatch(pair.name1, pair.name2)) {
        this.stats.duplicatesFound++;
        const canonicalId = pair.score1 >= pair.score2 ? pair.id1 : pair.id2;
        const duplicateId = pair.score1 >= pair.score2 ? pair.id2 : pair.id1;
        this.mergeEvents(canonicalId, duplicateId);
      }
    }
    console.log(`Merged ${this.stats.merged} duplicate events`);
    return this.stats;
  }

  titlesMatch(title1, title2) {
    if (!title1 || !title2) return false;
    const clean1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
  }

  mergeEvents(canonicalId, duplicateId) {
    this.db.prepare(`UPDATE event_sources SET event_id = ? WHERE event_id = ?`).run(canonicalId, duplicateId);
    this.db.prepare(`UPDATE events SET canonical_id = ? WHERE id = ?`).run(canonicalId, duplicateId);
    this.db.prepare(`UPDATE events SET confidence_score = MIN(1.0, confidence_score + 0.1) WHERE id = ?`).run(canonicalId);
    this.stats.merged++;
  }

  scoreAllEvents() {
    console.log('\nScorer - Calculating confidence scores\n');
    const events = this.db.prepare(`
      SELECT e.*, (SELECT COUNT(*) FROM event_sources WHERE event_id = e.id) as source_count 
      FROM events e WHERE e.canonical_id IS NULL
    `).all();
    
    const updateStmt = this.db.prepare(`UPDATE events SET confidence_score = ? WHERE id = ?`);

    for (const event of events) {
      let score = 0.3;
      if (event.image_url || event.cover_image_url) score += 0.15;
      if (event.description && event.description.length > 50) score += 0.1;
      if (event.ticket_url) score += 0.1;
      try { if (event.vibe_tags && JSON.parse(event.vibe_tags).length > 0) score += 0.1; } catch {}
      score += Math.min(0.15, (event.source_count - 1) * 0.05);
      if (event.venue_id) score += 0.1;
      if (event.time) score += 0.05;
      updateStmt.run(Math.min(1.0, score), event.id);
      this.stats.scored++;
    }
    console.log(`Scored ${this.stats.scored} events`);
    return this.stats;
  }

  getScoreStats() {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as total, AVG(confidence_score) as avg_score,
      COUNT(CASE WHEN confidence_score >= 0.7 THEN 1 END) as high_quality,
      COUNT(CASE WHEN confidence_score < 0.5 THEN 1 END) as low_quality
      FROM events WHERE date >= date('now')
    `).get();
    console.log(`\nStats: ${stats.total} upcoming | Avg: ${((stats.avg_score || 0) * 100).toFixed(1)}% | High: ${stats.high_quality} | Low: ${stats.low_quality}\n`);
    return stats;
  }

  run() {
    this.findDuplicates();
    this.scoreAllEvents();
    this.getScoreStats();
    return this.stats;
  }

  close() { this.db.close(); }
}

export default DeduperScorer;
