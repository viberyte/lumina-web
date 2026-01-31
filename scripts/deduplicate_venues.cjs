/**
 * Deduplicate Venues
 * Keeps best version (most complete data), deletes duplicates
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

function scoreVenue(venue) {
  let score = 0;
  
  // More complete data = higher score
  if (venue.google_place_id && venue.google_place_id !== 'NOT_FOUND') score += 10;
  if (venue.address) score += 5;
  if (venue.phone) score += 3;
  if (venue.website) score += 3;
  if (venue.google_rating) score += 4;
  if (venue.primary_vibes) score += 8;
  if (venue.menu_highlights) score += 5;
  if (venue.gallery_photos) score += 6;
  if (venue.happy_hour_info) score += 4;
  if (venue.description) score += 2;
  
  return score;
}

function main() {
  console.log('🧹 Deduplicating Venues\n');

  // Find duplicate groups
  const duplicateGroups = db.prepare(`
    SELECT 
      LOWER(name) as lower_name,
      LOWER(city) as lower_city,
      COUNT(*) as count
    FROM venues
    GROUP BY LOWER(name), LOWER(city)
    HAVING count > 1
  `).all();

  console.log(`Found ${duplicateGroups.length} duplicate groups\n`);

  let totalDeleted = 0;

  for (const group of duplicateGroups) {
    // Get all venues in this duplicate group
    const venues = db.prepare(`
      SELECT * FROM venues 
      WHERE LOWER(name) = ? AND LOWER(city) = ?
    `).all(group.lower_name, group.lower_city);

    // Score each venue
    const scored = venues.map(v => ({
      ...v,
      score: scoreVenue(v)
    })).sort((a, b) => b.score - a.score);

    const keeper = scored[0];
    const toDelete = scored.slice(1);

    console.log(`📍 ${keeper.name} (${keeper.city})`);
    console.log(`   ✅ Keeping ID ${keeper.id} (score: ${keeper.score})`);
    
    for (const dup of toDelete) {
      console.log(`   ❌ Deleting ID ${dup.id} (score: ${dup.score})`);
      db.prepare('DELETE FROM venues WHERE id = ?').run(dup.id);
      totalDeleted++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 DEDUPLICATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Deleted: ${totalDeleted} duplicate venues`);
  console.log(`   Remaining: ${db.prepare('SELECT COUNT(*) as c FROM venues').get().c} venues\n`);
}

main();
