import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// ✅ ADD NEW SCRAPERS HERE - AUTOMATICALLY RUNS THEM ALL
const scrapers = [
  { name: 'Dice.fm', script: 'scripts/scrapers/dice-scraper.js' },
  { name: 'POSH', script: 'scripts/scrapers/posh-scraper.js' },
  { name: 'TAO Group', script: 'scripts/scrapers/tao-scraper.js' }
  // ADD MORE SCRAPERS HERE AS YOU BUILD THEM
  // { name: 'NewSource', script: 'scripts/scrapers/newsource-scraper.js' }
];

async function runScrapers() {
  console.log('\n🚀 VIBERYTE EVENT SCRAPER - ' + new Date().toISOString());
  console.log('═'.repeat(70));
  
  const results = {
    success: [],
    failed: [],
    totalEvents: 0
  };
  
  for (const scraper of scrapers) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎬 Running ${scraper.name} Scraper`);
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(`node ${scraper.script}`);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(stdout);
      if (stderr) console.error('⚠️  Warnings:', stderr);
      
      // Count events from output file
      const dateStr = new Date().toISOString().split('T')[0];
      const outputFile = `data/events/${scraper.name.toLowerCase().replace(/[^a-z]/g, '')}-${dateStr}.json`;
      
      if (fs.existsSync(outputFile)) {
        const events = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        const count = Array.isArray(events) ? events.length : 0;
        results.totalEvents += count;
        results.success.push({ name: scraper.name, count, duration });
        console.log(`✅ ${scraper.name}: ${count} events in ${duration}s`);
      } else {
        results.success.push({ name: scraper.name, count: 0, duration });
      }
      
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      results.failed.push({ name: scraper.name, error: error.message });
      console.error(`❌ ${scraper.name} FAILED after ${duration}s: ${error.message}`);
    }
  }
  
  // FINAL SUMMARY
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 SCRAPING SUMMARY');
  console.log('═'.repeat(70));
  
  if (results.success.length > 0) {
    console.log('\n✅ Successful:');
    results.success.forEach(r => {
      console.log(`   ${r.name}: ${r.count} events (${r.duration}s)`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed:');
    results.failed.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }
  
  console.log(`\n🎯 TOTAL EVENTS: ${results.totalEvents}`);
  console.log('═'.repeat(70));
  
  // Save summary
  const summaryFile = `data/events/scrape-summary-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Summary saved: ${summaryFile}\n`);
}

runScrapers();
