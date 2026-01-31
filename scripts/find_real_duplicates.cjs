/**
 * Find REAL duplicates (same name + same address)
 * NOT chain locations
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lumina.db');
const db = new Database(DB_PATH);

function main() {
  console.log('🔍 Finding Real Duplicates (same address)\n');

  // Find venues with same name AND same address
  const duplicates = db.prepare(`
    SELECT 
      name,
      address,
      city,
      COUNT(*) as count,
      GROUP_CONCAT(id) as ids
    FROM venues
    WHERE address IS NOT NULL
    GROUP BY LOWER(name), LOWER(address), LOWER(city)
    HAVING count > 1
    ORDER BY count DESC
  `).all();

  if (duplicates.length === 0) {
    console.log('✅ No real duplicates found! All venues are unique.\n');
    return;
  }

  console.log(`Found ${duplicates.length} REAL duplicate groups:\n`);

  for (const dup of duplicates) {
    console.log(`📍 ${dup.name}`);
    console.log(`   Address: ${dup.address}`);
    console.log(`   Count: ${dup.count} copies`);
    console.log(`   IDs: ${dup.ids}`);
    console.log('');
  }

  console.log(`\n💡 These ${duplicates.length} groups are TRUE duplicates (same address).`);
  console.log('   Safe to delete the extras.\n');
}

main();
