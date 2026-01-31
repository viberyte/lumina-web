import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/opt/viberyte/lumina-web/data/events';
const DATE_TAG = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
const OUT_PATH = path.join(DATA_DIR, `events-${DATE_TAG}.json`);
fs.mkdirSync(DATA_DIR, { recursive: true });

const scrapers = [
  { name: 'DICE', cmd: 'node /opt/viberyte/event-scraper/dice_scraper.js' },
  { name: 'POSH', cmd: 'node /opt/viberyte/scripts/posh-scraper.js' },
  { name: 'TAO', cmd: 'node /opt/viberyte/lumina-telegram-bot/scripts/tao-events-scraper.js' },
  { name: 'INSTAGRAM', cmd: 'node /opt/viberyte/lumina-telegram-bot/scripts/instagram-promoter-scraper.js' }
];

const allEvents = [];

for (const s of scrapers) {
  console.log(`[weekly-event-scraper] Running ${s.name}...`);
  try {
    const output = execSync(s.cmd, { encoding: 'utf8', stdio: 'pipe' });
    const parsed = JSON.parse(output);
    allEvents.push(...parsed);
    console.log(`[weekly-event-scraper] ${s.name} ✅ got ${parsed.length} events`);
  } catch (err) {
    console.error(`[weekly-event-scraper] ${s.name} ❌ failed: ${err.message}`);
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(allEvents, null, 2));
console.log(`[weekly-event-scraper] Done. Saved ${allEvents.length} events → ${OUT_PATH}`);
