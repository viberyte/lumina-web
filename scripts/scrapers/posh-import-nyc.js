import Database from 'better-sqlite3';
import fs from 'fs';

console.log('💎 POSH IMPORT - NYC ONLY\n');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const data = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/events/posh-featured.json', 'utf8'));

const events = data.result?.data || [];
console.log('Found', events.length, 'total events\n');

const stmt = db.prepare(`
  INSERT OR IGNORE INTO events 
  (name, venue_name, date, event_date, description, ticket_url, city, source_type, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 'New York', 'posh', datetime('now'))
`);

// Non-NYC cities to skip
const skipCities = ['boston', 'miami', 'los angeles', 'chicago', 'atlanta', 'washington', 'philadelphia', 'charlotte', 'san francisco', 'dallas', 'houston', 'denver', 'seattle', 'phoenix', 'las vegas'];

let added = 0;
let skipped = 0;

for (const e of events) {
  try {
    const city = (e.city || '').toLowerCase();
    
    // Skip non-NYC cities
    const shouldSkip = skipCities.some(c => city.includes(c));
    if (shouldSkip) {
      skipped++;
      continue;
    }
    
    let eventDate = null;
    if (e.startsAt) {
      eventDate = new Date(e.startsAt).toISOString().split('T')[0];
    } else if (e.tickets?.[0]?.validity?.validBefore) {
      eventDate = new Date(e.tickets[0].validity.validBefore).toISOString().split('T')[0];
    }
    
    const ticketUrl = e.url ? 'https://posh.vip/e/' + e.url : null;
    const venueName = e.venue?.name || e.venueName || null;
    
    const result = stmt.run(
      e.name,
      venueName,
      eventDate,
      eventDate,
      e.shortDescription || null,
      ticketUrl
    );
    
    if (result.changes > 0) {
      added++;
      console.log('✅', e.name);
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

console.log('\n⏭️  Skipped', skipped, 'non-NYC events');
console.log('💾 Added', added, 'new NYC POSH events');

const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now')").get();
console.log('📊 Total upcoming events:', total.count);

db.close();
