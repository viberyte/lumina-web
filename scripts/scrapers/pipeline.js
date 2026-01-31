/**
 * LUMINA V2 - Master Scraper Pipeline (ES Module)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import RAScraper from './sources/ra-scraper.js';
import ShotgunScraper from './sources/shotgun-scraper.js';
import JoonbugScraper from './sources/joonbug-scraper.js';
import DelanceyScraper from './sources/delancey-scraper.js';
import PoshScraper from './sources/posh-scraper.js';
import UniverseScraper from './sources/universe-scraper.js';
import VenueWebsitesScraper from './sources/venue-websites-scraper.js';
import DICEScraper from './sources/dice-scraper.js';
import AIEnricher from './ai-enricher.js';
import DeduperScorer from './deduper-scorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/lumina.db');

class ScraperPipeline {
  constructor() {
    this.db = new Database(DB_PATH);
    this.scrapers = {
      'ra': RAScraper,
      'shotgun': ShotgunScraper,
      'joonbug': JoonbugScraper,
      'delancey': DelanceyScraper,
      'posh': PoshScraper,
      'universe': UniverseScraper,
      'venue-websites': VenueWebsitesScraper,
      'dice': DICEScraper
    };
    this.stats = { totalFound: 0, totalNew: 0, totalDuplicates: 0, errors: [] };
  }

  async runAllScrapers() {
    console.log('\n' + '='.repeat(60));
    console.log('  LUMINA V2 - SCRAPER PIPELINE');
    console.log('  ' + new Date().toISOString());
    console.log('='.repeat(60) + '\n');

    for (const [name, ScraperClass] of Object.entries(this.scrapers)) {
      try {
        console.log(`\n▶ Running ${name} scraper...`);
        const scraper = new ScraperClass();
        const stats = await scraper.run();
        scraper.close();
        this.stats.totalFound += stats.found;
        this.stats.totalNew += stats.new;
        this.stats.totalDuplicates += stats.duplicates;
        console.log(`✓ ${name}: ${stats.new} new, ${stats.duplicates} dupes`);
      } catch (error) {
        console.error(`✗ ${name} failed:`, error.message);
        this.stats.errors.push({ source: name, error: error.message });
      }
    }
    return this.stats;
  }

  async runSingleScraper(sourceName) {
    const ScraperClass = this.scrapers[sourceName];
    if (!ScraperClass) {
      console.error(`Unknown scraper: ${sourceName}`);
      console.log('Available:', Object.keys(this.scrapers).join(', '));
      return null;
    }
    console.log(`\n▶ Running ${sourceName} scraper...`);
    const scraper = new ScraperClass();
    const stats = await scraper.run();
    scraper.close();
    return stats;
  }

  async runEnrichment(useAI = false, limit = 500) {
    console.log('\n' + '='.repeat(60) + '\n  ENRICHMENT PHASE\n' + '='.repeat(60));
    const enricher = new AIEnricher(process.env.OPENAI_API_KEY);
    const stats = await enricher.enrichAll(useAI, limit);
    enricher.close();
    return stats;
  }

  async runDedupeAndScore() {
    console.log('\n' + '='.repeat(60) + '\n  DE-DUPE & SCORING PHASE\n' + '='.repeat(60));
    const deduper = new DeduperScorer();
    const stats = deduper.run();
    deduper.close();
    return stats;
  }

  async runFullPipeline() {
    const startTime = Date.now();
    await this.runAllScrapers();
    await this.runEnrichment(false, 1000);
    await this.runDedupeAndScore();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.printSummary(duration);
    return this.stats;
  }

  printSummary(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('  PIPELINE COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Duration: ${duration}s`);
    console.log(`  Events found: ${this.stats.totalFound}`);
    console.log(`  New events: ${this.stats.totalNew}`);
    console.log(`  Duplicates: ${this.stats.totalDuplicates}`);
    if (this.stats.errors.length > 0) {
      console.log(`  Errors: ${this.stats.errors.length}`);
      this.stats.errors.forEach(e => console.log(`    - ${e.source}: ${e.error}`));
    }
    console.log('='.repeat(60) + '\n');
  }

  getEventStats() {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as total,
      COUNT(CASE WHEN date >= date('now') THEN 1 END) as upcoming,
      COUNT(CASE WHEN confidence_score >= 0.7 THEN 1 END) as high_quality,
      COUNT(CASE WHEN vibe_tags IS NOT NULL AND vibe_tags != '[]' THEN 1 END) as enriched
      FROM events
    `).get();
    console.log('\n📊 EVENT DATABASE STATS:');
    console.log(`   Total: ${stats.total} | Upcoming: ${stats.upcoming} | High quality: ${stats.high_quality} | Enriched: ${stats.enriched}\n`);
    return stats;
  }

  close() { this.db.close(); }
}

// CLI
const args = process.argv.slice(2);
const pipeline = new ScraperPipeline();

try {
  if (args.includes('--help')) {
    console.log(`
LUMINA V2 Scraper Pipeline

Usage:
  node pipeline.js              Run full pipeline
  node pipeline.js --stats      Show database stats
  node pipeline.js --source=ra  Run single scraper
  node pipeline.js --enrich     Run enrichment only
  node pipeline.js --dedupe     Run de-dupe only

Available scrapers: ${Object.keys(pipeline.scrapers).join(', ')}
    `);
  } else if (args.includes('--stats')) {
    pipeline.getEventStats();
  } else if (args.find(a => a.startsWith('--source='))) {
    const source = args.find(a => a.startsWith('--source=')).split('=')[1];
    await pipeline.runSingleScraper(source);
    pipeline.getEventStats();
  } else if (args.includes('--enrich')) {
    await pipeline.runEnrichment(args.includes('--ai'));
  } else if (args.includes('--dedupe')) {
    await pipeline.runDedupeAndScore();
  } else {
    await pipeline.runFullPipeline();
    pipeline.getEventStats();
  }
} catch (error) {
  console.error('Pipeline error:', error);
  process.exit(1);
} finally {
  pipeline.close();
}

export default ScraperPipeline;
