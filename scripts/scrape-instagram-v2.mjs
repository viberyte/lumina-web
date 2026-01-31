import Database from 'better-sqlite3';

const db = new Database('./data/lumina.db');

const venues = db.prepare(`
  SELECT id, name, city, instagram_handle
  FROM venues 
  WHERE (category LIKE '%dining%' OR category LIKE '%nightlife%' OR category LIKE '%entertainment%') 
  AND city IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx')
  LIMIT 20
`).all();

console.log(`📝 Generating Instagram search list for ${venues.length} venues\n`);
console.log('Copy these and manually search on Instagram:\n');

for (const v of venues) {
  if (!v.instagram_handle) {
    const searchQuery = v.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '');
    console.log(`${v.name} → Search: @${searchQuery} or "${v.name} ${v.city}"`);
  }
}
