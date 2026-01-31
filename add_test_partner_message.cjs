const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lumina.db'));

console.log('Adding test partner message...\n');

// Insert a test message from the partner in a Manhattan room
const result = db.prepare(`
  INSERT INTO chat_messages (room_slug, partner_id, content, message_type)
  VALUES (?, ?, ?, ?)
`).run(
  'manhattan-hip-hop-rnb',
  1,
  'Hey everyone! Check out our upcoming event this Friday at The Basement. Link in bio! 🎉',
  'official_text'
);

console.log(`✅ Test partner message created!`);
console.log(`   Message ID: ${result.lastInsertRowid}`);
console.log(`   Room: manhattan-hip-hop-rnb`);
console.log(`   Partner: Lumina Events (@luminanyc)`);
console.log(`\n📱 Now tap on "Lumina Events" in the chat to view the partner profile!`);

db.close();
