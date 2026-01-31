/**
 * Mark After Club Eats
 * These chains are known late night spots
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

// Add column
try {
  db.exec('ALTER TABLE venues ADD COLUMN after_hours_spot INTEGER DEFAULT 0');
} catch (e) {}

function main() {
  console.log('🌙 Marking After Club Eats Chains\n');

  // Find restaurant/food truck chains with multiple locations
  const chains = db.prepare(`
    SELECT 
      LOWER(name) as chain_name,
      name,
      COUNT(*) as location_count
    FROM venues
    WHERE category IN ('restaurant', 'food_truck')
    GROUP BY LOWER(name)
    HAVING location_count > 1
    ORDER BY location_count DESC
  `).all();

  console.log(`Found ${chains.length} chains with multiple locations:\n`);

  let marked = 0;

  for (const chain of chains) {
    // Get BEST location (most reviews, highest rating)
    const bestLocation = db.prepare(`
      SELECT id, name, address, neighborhood, city, google_rating, google_reviews_count, latitude, longitude
      FROM venues
      WHERE LOWER(name) = ?
      ORDER BY 
        CASE WHEN google_reviews_count IS NOT NULL THEN google_reviews_count ELSE 0 END DESC,
        CASE WHEN google_rating IS NOT NULL THEN google_rating ELSE 0 END DESC,
        id DESC
      LIMIT 1
    `).get(chain.chain_name);

    if (bestLocation) {
      // Mark as after hours spot
      db.prepare(`
        UPDATE venues 
        SET after_hours_spot = 1,
            late_night_spot = 1
        WHERE id = ?
      `).run(bestLocation.id);

      console.log(`✅ ${bestLocation.name} (${chain.location_count} locations)`);
      console.log(`   📍 ${bestLocation.neighborhood || bestLocation.city} - ${bestLocation.address?.substring(0, 30) || 'N/A'}...`);
      if (bestLocation.google_rating) {
        console.log(`   ⭐ ${bestLocation.google_rating} (${bestLocation.google_reviews_count} reviews)`);
      }
      console.log(`   🆔 ID: ${bestLocation.id}\n`);
      marked++;
    }
  }

  console.log('='.repeat(60));
  console.log(`🌙 Marked ${marked} chain locations as "After Club Eats"`);
  console.log('='.repeat(60));
  
  const afterHours = db.prepare('SELECT COUNT(*) as c FROM venues WHERE after_hours_spot = 1').get();
  console.log(`\n📊 Total After Hours Spots: ${afterHours.c}\n`);

  // Show the top ones
  console.log('🔝 Top After Club Eats:\n');
  const top = db.prepare(`
    SELECT name, city, neighborhood, google_rating, google_reviews_count
    FROM venues
    WHERE after_hours_spot = 1
    ORDER BY google_reviews_count DESC
    LIMIT 10
  `).all();

  top.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name} - ${v.neighborhood || v.city}`);
    if (v.google_rating) console.log(`   ${v.google_rating}⭐ (${v.google_reviews_count} reviews)`);
  });
}

main();
