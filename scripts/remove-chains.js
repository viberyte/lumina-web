import Database from 'better-sqlite3';

const db = new Database('./data/lumina.db');

// List of chain restaurants to remove
const chains = [
  'CAVA',
  'sweetgreen',
  '&pizza',
  'Chipotle',
  'Colada Shop',
  'Ekiben',
  'Falafel Inc',
  'Roaming Rooster',
  'The Chicken Lab',
  'McDonald\'s',
  'Subway',
  'Starbucks',
  'Dunkin',
  'Panera',
  'Chick-fil-A',
  'Five Guys',
  'Shake Shack',
  'Potbelly',
  'Just Salad',
  'Dig Inn',
  'Pret A Manger',
  'Blaze Pizza',
  '90 Second Pizza',
  'Nando\'s',
  'Wawa',
  '7-Eleven'
];

console.log('🗑️  Removing chain restaurants...\n');

let totalDeleted = 0;

chains.forEach(chain => {
  const result = db.prepare(`
    DELETE FROM venues 
    WHERE LOWER(name) LIKE LOWER(?)
  `).run(`%${chain}%`);
  
  if (result.changes > 0) {
    console.log(`❌ Deleted ${result.changes} venues: ${chain}`);
    totalDeleted += result.changes;
  }
});

console.log(`\n✅ Total chains removed: ${totalDeleted}`);

const remaining = db.prepare('SELECT COUNT(*) as count FROM venues').get();
console.log(`📊 Remaining venues: ${remaining.count}`);

db.close();
