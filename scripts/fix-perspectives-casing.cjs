const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Normalize all vibe lenses to UPPERCASE
const vibeWorlds = ['outside', 'latin_nights', 'pulse', 'main_stage', 'low_light'];

vibeWorlds.forEach(world => {
  const upper = world.toUpperCase();
  const result = db.prepare(`
    UPDATE venues 
    SET primary_lens = ? 
    WHERE LOWER(primary_lens) = ?
  `).run(upper, world);
  console.log(`${world} → ${upper}: ${result.changes} updated`);
});

// Check results
const counts = db.prepare(`
  SELECT primary_lens, COUNT(*) as count 
  FROM venues 
  WHERE primary_lens IS NOT NULL AND primary_lens != ''
  GROUP BY primary_lens 
  ORDER BY count DESC
`).all();

console.log('\nUpdated counts:');
counts.forEach(r => console.log(`  ${r.primary_lens}: ${r.count}`));

// Check blanks
const blanks = db.prepare(`SELECT COUNT(*) as count FROM venues WHERE primary_lens IS NULL OR primary_lens = ''`).get();
console.log(`\nBlanks: ${blanks.count}`);

db.close();
