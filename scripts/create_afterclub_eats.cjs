/**
 * Create "After Club Eats" category
 * Picks ONE location per chain for late night recommendations
 * Marks them as after_hours_spot
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

// Add after_hours_spot column
try {
  db.exec('ALTER TABLE venues ADD COLUMN after_hours_spot INTEGER DEFAULT 0');
} catch (e) {}

function main() {
  console.log('🌙 Creating After Club Eats Category\n');

  // Find chain restaurants open late (2AM+)
  const chains = db.prepare(`
    SELECT 
      LOWER(name) as chain_name,
      name,
      COUNT(*) as location_count
    FROM venues
    WHERE late_night_spot = 1
    AND category IN ('restaurant', 'food_truck')
    GROUP BY LOWER(name)
    HAVING location_count > 1
    ORDER BY location_count DESC
  `).all();

  console.log(`Found ${chains.length} late night chains:\n`);

  let marked = 0;

  for (const chain of chains) {
    // Pick the BEST location for this chain
    const bestLocation = db.prepare(`
      SELECT id, name, address, neighborhood, google_rating, google_reviews_count
      FROM venues
      WHERE LOWER(name) = ?
      AND late_night_spot = 1
      ORDER BY 
        google_reviews_count DESC,
        google_rating DESC
      LIMIT 1
    `).get(chain.chain_name);

    if (bestLocation) {
      // Mark as after hours spot
      db.prepare(`
        UPDATE venues 
        SET after_hours_spot = 1,
            category = 'restaurant'
        WHERE id = ?
      `).run(bestLocation.id);

      console.log(`✅ ${bestLocation.name}`);
      console.log(`   Location: ${bestLocation.neighborhood || bestLocation.address}`);
      console.log(`   Rating: ${bestLocation.google_rating || 'N/A'} ⭐`);
      console.log(`   📍 ID: ${bestLocation.id}\n`);
      marked++;
    }
  }

  console.log('='.repeat(50));
  console.log(`🌙 Marked ${marked} venues as "After Club Eats"`);
  console.log('='.repeat(50));
  
  // Show summary
  const afterHours = db.prepare(`
    SELECT COUNT(*) as count 
    FROM venues 
    WHERE after_hours_spot = 1
  `).get();

  console.log(`\n📊 Total After Hours Spots: ${afterHours.count}\n`);
}

main();
