const Database = require('better-sqlite3');
const db = new Database('./data/lumina.db');

// Test query
const venues = db.prepare('SELECT COUNT(*) as count FROM venues').get();
console.log('Total venues:', venues.count);

// Show sample venue
const sample = db.prepare('SELECT * FROM venues LIMIT 1').get();
console.log('Sample venue:', sample);

db.close();
