import Database from 'better-sqlite3';

const db = new Database('./data/lumina.db');

console.log('💰 Normalizing price tiers...\n');

// Normalize to standard $ format
const updates = [
  // Budget tier
  { from: ['$', '1.0', 'affordable', 'Affordable', 'budget', 'cheap'], to: '$' },
  // Moderate tier
  { from: ['$$', '2.0', 'moderate', 'Moderate', 'mid-range', 'Mid-Range', 'Mid-range', 'medium', 'mid'], to: '$$' },
  // Upscale tier
  { from: ['$$$', '3.0', 'high', 'High', 'upscale'], to: '$$$' },
  // Luxury tier
  { from: ['$$$$', '4.0', 'luxury'], to: '$$$$' }
];

let totalUpdated = 0;

updates.forEach(({ from, to }) => {
  from.forEach(value => {
    const result = db.prepare(`UPDATE venues SET price_tier = ? WHERE price_tier = ?`).run(to, value);
    if (result.changes > 0) {
      console.log(`✅ Normalized ${result.changes} venues: ${value} → ${to}`);
      totalUpdated += result.changes;
    }
  });
});

console.log(`\n✅ Total normalized: ${totalUpdated}`);

// Show new breakdown
const breakdown = db.prepare(`
  SELECT 
    price_tier,
    COUNT(*) as count
  FROM venues
  GROUP BY price_tier
  ORDER BY 
    CASE price_tier
      WHEN '$' THEN 1
      WHEN '$$' THEN 2
      WHEN '$$$' THEN 3
      WHEN '$$$$' THEN 4
      ELSE 5
    END
`).all();

console.log('\n💰 Normalized price tier breakdown:');
breakdown.forEach(row => {
  console.log(`  ${row.price_tier || 'Unknown'}: ${row.count} venues`);
});

db.close();
