const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'lumina.db'));

// Same normalize logic as fingerprint.ts
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().trim()
    .replace(/\b(official|the|a|an|at|presents?|featuring|feat\.?|ft\.?|w\/|with)\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(city) {
  if (!city) return '';
  const c = city.toLowerCase().trim();
  if (['manhattan','brooklyn','queens','bronx','staten island','nyc','new york city','new york'].includes(c)) return 'newyork';
  if (['jersey city','north jersey','south jersey','hoboken','newark'].includes(c)) return 'newjersey';
  if (['washington dc','washington d.c.','dc','d.c.'].includes(c)) return 'dc';
  if (['philadelphia','philly'].includes(c)) return 'philadelphia';
  return c.replace(/[^a-z0-9]/g, '');
}

function normalizeDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

function generateFingerprint(title, venue, date, city) {
  const parts = [normalize(title), normalize(venue), normalizeDate(date), normalizeCity(city)].filter(Boolean);
  const raw = parts.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  const prefix = (normalize(title) || 'unknown').substring(0, 20).replace(/\s/g, '-');
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

// ── Backfill scraped events ──
console.log('Backfilling scraped events...');
const events = db.prepare('SELECT id, name, venue_name, date, city FROM events WHERE event_fingerprint IS NULL').all();
const updateEvent = db.prepare('UPDATE events SET event_fingerprint = ? WHERE id = ?');

let count = 0;
const eventTx = db.transaction(() => {
  for (const e of events) {
    const fp = generateFingerprint(e.name, e.venue_name, e.date, e.city);
    updateEvent.run(fp, e.id);
    count++;
  }
});
eventTx();
console.log(`  ✅ ${count} scraped events fingerprinted`);

// ── Backfill partner events ──
console.log('Backfilling partner events...');
const partnerEvents = db.prepare(`
  SELECT pe.id, pe.title, pe.event_date, pe.city, pv.name as venue_name, pv.city as venue_city
  FROM partner_events pe
  LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
  WHERE pe.event_fingerprint IS NULL
`).all();
const updatePartner = db.prepare('UPDATE partner_events SET event_fingerprint = ?, city = COALESCE(city, ?), venue_name_cache = COALESCE(venue_name_cache, ?) WHERE id = ?');

let pCount = 0;
const partnerTx = db.transaction(() => {
  for (const pe of partnerEvents) {
    const city = pe.city || pe.venue_city || '';
    const venueName = pe.venue_name || '';
    const fp = generateFingerprint(pe.title, venueName, pe.event_date, city);
    updatePartner.run(fp, city, venueName, pe.id);
    pCount++;
  }
});
partnerTx();
console.log(`  ✅ ${pCount} partner events fingerprinted`);

// ── Mark shadows (scraped events that have partner duplicates) ──
console.log('Checking for shadows...');
const shadows = db.prepare(`
  UPDATE events SET is_shadow = 1 
  WHERE event_fingerprint IN (
    SELECT event_fingerprint FROM partner_events 
    WHERE status = 'published' AND event_fingerprint IS NOT NULL
  )
  AND event_fingerprint IS NOT NULL
`).run();
console.log(`  ✅ ${shadows.changes} scraped events marked as shadows`);

// ── Stats ──
const stats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM events WHERE event_fingerprint IS NOT NULL) as events_fp,
    (SELECT COUNT(*) FROM partner_events WHERE event_fingerprint IS NOT NULL) as partner_fp,
    (SELECT COUNT(*) FROM events WHERE is_shadow = 1) as shadows
`).get();
console.log('\n📊 Final stats:');
console.log(`  Scraped events with fingerprint: ${stats.events_fp}`);
console.log(`  Partner events with fingerprint: ${stats.partner_fp}`);
console.log(`  Shadow events (hidden): ${stats.shadows}`);

db.close();
console.log('\n✅ Backfill complete!');
