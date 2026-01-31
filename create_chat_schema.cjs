const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lumina.db'));

console.log('Creating chat rooms schema...\n');

// Create chat_rooms table
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    city TEXT,
    borough TEXT,
    room_type TEXT DEFAULT 'vibe',
    category TEXT,
    emoji TEXT,
    description TEXT,
    parent_room_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_room_id) REFERENCES chat_rooms(id)
  );
`);

console.log('✅ Created chat_rooms table');

// Create chat_messages table
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_slug TEXT NOT NULL,
    user_id INTEGER,
    partner_id INTEGER,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'community_text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_slug) REFERENCES chat_rooms(slug)
  );
`);

console.log('✅ Created chat_messages table');

// Create chat_permissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    room_slug TEXT NOT NULL,
    can_post_events BOOLEAN DEFAULT 1,
    can_edit_events BOOLEAN DEFAULT 0,
    can_feature_boost BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_slug) REFERENCES chat_rooms(slug)
  );
`);

console.log('✅ Created chat_permissions table');

// Create partners table
db.exec(`
  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instagram_handle TEXT UNIQUE NOT NULL,
    business_name TEXT,
    status TEXT DEFAULT 'pending',
    follower_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Created partners table');

// Create follows table
db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    partner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, partner_id)
  );
`);

console.log('✅ Created follows table');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_room ON chat_messages(room_slug);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at);
  CREATE INDEX IF NOT EXISTS idx_rooms_city ON chat_rooms(city);
  CREATE INDEX IF NOT EXISTS idx_rooms_slug ON chat_rooms(slug);
  CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id);
  CREATE INDEX IF NOT EXISTS idx_follows_partner ON follows(partner_id);
`);

console.log('✅ Created indexes');

db.close();
console.log('\n✅ Chat schema created successfully!');
