/**
 * IMPORT INSTAGRAM HANDLES FROM APIFY
 * 
 * This script:
 * 1. Loads Instagram data from Apify JSON
 * 2. Parses searchTerm to extract venue name and location
 * 3. Matches to existing venues in database
 * 4. Updates venues with Instagram handles
 */

import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('📸 IMPORTING INSTAGRAM HANDLES\n');

// Load Instagram data
const igData = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/instagram_handles.json', 'utf8'));
console.log(`Loaded ${igData.length} Instagram profiles\n`);

// Parse searchTerm to extract venue name
function parseSearchTerm(searchTerm) {
  // Format: "NY \"Tipsy Scoop\"" or "Secaucus" or "Brooklyn \"Venue Name\""
  const quoted = searchTerm.match(/"([^"]+)"/);
  if (quoted) {
    return quoted[1].trim();
  }
  // If no quotes, might just be city - skip these
  return null;
}

// Prepare update statement
const updateStmt = db.prepare(`
  UPDATE venues 
  SET instagram_handle = ?,
      instagram_url = ?
  WHERE id = ?
`);

// Prepare search statement - match by name (case insensitive)
const searchStmt = db.prepare(`
  SELECT id, name, city, state 
  FROM venues 
  WHERE LOWER(name) = LOWER(?)
  AND should_exclude = 0
  LIMIT 1
`);

let matched = 0;
let notFound = 0;
let skipped = 0;

console.log('Matching Instagram handles to venues...\n');

igData.forEach((ig, idx) => {
  const venueName = parseSearchTerm(ig.searchTerm);
  
  if (!venueName) {
    skipped++;
    return;
  }
  
  // Find venue in database
  const venue = searchStmt.get(venueName);
  
  if (venue) {
    // Update with Instagram handle
    updateStmt.run(
      ig.username,
      ig.url,
      venue.id
    );
    matched++;
    
    if (matched % 50 === 0) {
      console.log(`✅ Matched ${matched} venues...`);
    }
  } else {
    notFound++;
    if (notFound <= 10) {
      console.log(`  ⚠️  Not found: "${venueName}"`);
    }
  }
});

console.log('\n━━━ IMPORT COMPLETE ━━━');
console.log(`✅ Matched: ${matched} venues`);
console.log(`⚠️  Not found: ${notFound} venues`);
console.log(`⏭️  Skipped: ${skipped} (no venue name in search term)\n`);

// Show final stats
const stats = db.prepare(`
  SELECT COUNT(*) as total,
         COUNT(CASE WHEN instagram_handle IS NOT NULL THEN 1 END) as with_ig
  FROM venues
  WHERE should_exclude = 0
`).get();

console.log(`📊 DATABASE TOTALS:`);
console.log(`   Total Venues: ${stats.total}`);
console.log(`   With Instagram: ${stats.with_ig} (${Math.round(stats.with_ig/stats.total*100)}%)\n`);

db.close();
