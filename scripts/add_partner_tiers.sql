-- Add tier system to partners table
ALTER TABLE partners ADD COLUMN tier TEXT DEFAULT 'claimed';
ALTER TABLE partners ADD COLUMN permissions TEXT DEFAULT '{}';
ALTER TABLE partners ADD COLUMN instagram_connected INTEGER DEFAULT 0;
ALTER TABLE partners ADD COLUMN instagram_username TEXT;
ALTER TABLE partners ADD COLUMN instagram_user_id TEXT;
ALTER TABLE partners ADD COLUMN last_instagram_sync DATETIME;
ALTER TABLE partners ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
ALTER TABLE partners ADD COLUMN subscription_ends_at DATETIME;

-- Add next_stop preferences table
CREATE TABLE IF NOT EXISTS next_stop_preferences (
  venue_id INTEGER PRIMARY KEY,
  target_genres TEXT DEFAULT '["bar","lounge","nightclub"]',
  target_radius_miles REAL DEFAULT 1.0,
  priority_score INTEGER DEFAULT 50,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- Add venue specials table
CREATE TABLE IF NOT EXISTS venue_specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  days_active TEXT DEFAULT '[]',
  time_range TEXT,
  discount_text TEXT,
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- Add instagram posts tracking
CREATE TABLE IF NOT EXISTS instagram_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  venue_id INTEGER,
  instagram_id TEXT UNIQUE NOT NULL,
  media_url TEXT,
  caption TEXT,
  posted_at DATETIME,
  event_created INTEGER DEFAULT 0,
  event_id INTEGER,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (event_id) REFERENCES partner_events(id)
);

-- Add next_stop analytics
CREATE TABLE IF NOT EXISTS next_stop_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  from_venue_id INTEGER,
  to_venue_id INTEGER NOT NULL,
  converted INTEGER DEFAULT 0,
  distance_miles REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (to_venue_id) REFERENCES venues(id)
);

-- Create indexes AFTER tables exist
CREATE INDEX IF NOT EXISTS idx_instagram_posts_partner ON instagram_posts(partner_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_venue ON instagram_posts(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_specials_venue ON venue_specials(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_specials_featured ON venue_specials(featured);
CREATE INDEX IF NOT EXISTS idx_next_stop_conversions_venue ON next_stop_conversions(to_venue_id);
CREATE INDEX IF NOT EXISTS idx_next_stop_conversions_user ON next_stop_conversions(user_id);
