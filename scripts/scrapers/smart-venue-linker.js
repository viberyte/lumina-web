import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🏢 SMART VENUE LINKER\n');

// Step 1: Normalize venue names for matching
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/\s*(nyc|ny|new york|brooklyn|rooftop|lounge|bar|club)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Step 2: Build venue lookup with normalized names
const venues = db.prepare(`SELECT id, name FROM venues`).all();
const venueLookup = new Map();

for (const v of venues) {
  const normalized = normalizeName(v.name);
  if (normalized) {
    venueLookup.set(normalized, v.id);
  }
  // Also store exact lowercase
  venueLookup.set(v.name.toLowerCase().trim(), v.id);
}

console.log(`📚 Built lookup with ${venueLookup.size} venue variants\n`);

// Step 3: Link events using fuzzy matching
const eventsToLink = db.prepare(`
  SELECT id, venue_name FROM events 
  WHERE event_date >= date('now') 
    AND venue_id IS NULL 
    AND venue_name IS NOT NULL
`).all();

const updateEvent = db.prepare(`UPDATE events SET venue_id = ? WHERE id = ?`);

let linked = 0;
for (const e of eventsToLink) {
  const normalized = normalizeName(e.venue_name);
  const exact = e.venue_name.toLowerCase().trim();
  
  const venueId = venueLookup.get(exact) || venueLookup.get(normalized);
  
  if (venueId) {
    updateEvent.run(venueId, e.id);
    linked++;
  }
}

console.log(`🔗 Linked ${linked} events via fuzzy matching\n`);

// Step 4: Find truly missing venues (only create if 3+ events)
const missingVenues = db.prepare(`
  SELECT DISTINCT 
    TRIM(e.venue_name) as venue_name, 
    e.city,
    COUNT(*) as event_count
  FROM events e
  WHERE e.event_date >= date('now') 
    AND e.venue_id IS NULL
    AND e.venue_name IS NOT NULL 
    AND TRIM(e.venue_name) != ''
    AND e.venue_name NOT LIKE '%TBA%'
    AND e.venue_name NOT LIKE '%Secret%'
    AND e.venue_name NOT LIKE '%Private%'
    AND e.venue_name NOT LIKE '%:00%'
    AND e.venue_name NOT LIKE '%PM%'
    AND e.venue_name NOT LIKE '%AM%'
    AND LENGTH(TRIM(e.venue_name)) > 3
  GROUP BY TRIM(e.venue_name)
  HAVING COUNT(*) >= 3
  ORDER BY event_count DESC
`).all();

console.log(`📍 Found ${missingVenues.length} missing venues with 3+ events\n`);

// Step 5: Create venues with confidence scoring (no category assigned)
const insertVenue = db.prepare(`
  INSERT INTO venues (
    name, city, state, category, subcategory,
    description, lumina_priority, created_at
  ) VALUES (?, ?, 'NY', NULL, NULL, 
    'Auto-discovered from event listings - pending enrichment', 
    'low', datetime('now'))
`);

let created = 0;
for (const v of missingVenues) {
  // Skip if already in lookup
  if (venueLookup.has(normalizeName(v.venue_name))) continue;
  
  const confidence = v.event_count >= 10 ? 80 : v.event_count >= 5 ? 65 : 50;
  
  try {
    const result = insertVenue.run(v.venue_name, v.city || 'New York');
    venueLookup.set(normalizeName(v.venue_name), result.lastInsertRowid);
    created++;
    console.log(`✅ Created: ${v.venue_name} (${v.event_count} events, confidence: ${confidence})`);
  } catch (err) {
    // Skip duplicates
  }
}

console.log(`\n💾 Created ${created} new venue stubs`);

// Step 6: Link remaining events to newly created venues
const relink = db.prepare(`
  UPDATE events 
  SET venue_id = (
    SELECT v.id FROM venues v 
    WHERE LOWER(TRIM(v.name)) = LOWER(TRIM(events.venue_name))
    LIMIT 1
  )
  WHERE venue_id IS NULL 
    AND venue_name IS NOT NULL
    AND event_date >= date('now')
`);

const relinkResult = relink.run();
console.log(`🔗 Relinked ${relinkResult.changes} more events`);

// Final stats
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN venue_id IS NOT NULL THEN 1 ELSE 0 END) as linked,
    SUM(CASE WHEN venue_id IS NULL THEN 1 ELSE 0 END) as unlinked
  FROM events WHERE event_date >= date('now')
`).get();

console.log(`\n📊 FINAL STATS:`);
console.log(`   Total upcoming events: ${stats.total}`);
console.log(`   Linked to venues: ${stats.linked}`);
console.log(`   Unlinked (TBA/private): ${stats.unlinked}`);

db.close();
