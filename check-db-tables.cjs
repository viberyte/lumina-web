const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('📋 TABLES IN DATABASE:\n');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

tables.forEach(t => console.log(`  - ${t.name}`));

console.log(`\nTotal tables: ${tables.length}`);

db.close();
