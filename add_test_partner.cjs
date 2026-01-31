const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lumina.db'));

console.log('Creating test partner...\n');

// Insert test partner
const result = db.prepare(`
  INSERT INTO partners (instagram_handle, business_name, status, follower_count)
  VALUES (?, ?, ?, ?)
`).run('luminanyc', 'Lumina Events', 'approved', 0);

const partnerId = result.lastInsertRowid;

console.log(`✅ Created partner ID: ${partnerId}`);

// Grant permissions to some rooms
const rooms = db.prepare(`
  SELECT slug FROM chat_rooms 
  WHERE city = 'Manhattan' AND category = 'nightlife'
  LIMIT 3
`).all();

console.log(`\nGranting permissions to ${rooms.length} rooms...`);

rooms.forEach(room => {
  db.prepare(`
    INSERT INTO chat_permissions (partner_id, room_slug, can_post_events)
    VALUES (?, ?, 1)
  `).run(partnerId, room.slug);
  console.log(`  ✅ ${room.slug}`);
});

console.log(`\n✅ Test partner created successfully!`);
console.log(`   Partner ID: ${partnerId}`);
console.log(`   Instagram: @luminanyc`);
console.log(`   Business: Lumina Events`);

db.close();
