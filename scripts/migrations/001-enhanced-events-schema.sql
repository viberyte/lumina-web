-- ============================================
-- LUMINA V2 - Enhanced Events Schema
-- ============================================

-- 1. Add new columns to events table (preserves existing data)
ALTER TABLE events ADD COLUMN short_title TEXT;
ALTER TABLE events ADD COLUMN start_datetime DATETIME;
ALTER TABLE events ADD COLUMN end_datetime DATETIME;
ALTER TABLE events ADD COLUMN vibe_tags TEXT;
ALTER TABLE events ADD COLUMN mood_tags TEXT;
ALTER TABLE events ADD COLUMN age_restriction TEXT;
ALTER TABLE events ADD COLUMN price_range TEXT;
ALTER TABLE events ADD COLUMN confidence_score REAL DEFAULT 0.5;
ALTER TABLE events ADD COLUMN is_verified BOOLEAN DEFAULT 0;
ALTER TABLE events ADD COLUMN cover_image_url TEXT;
ALTER TABLE events ADD COLUMN source_type TEXT;
ALTER TABLE events ADD COLUMN source_handle TEXT;
ALTER TABLE events ADD COLUMN scraped_at DATETIME;
ALTER TABLE events ADD COLUMN enriched_at DATETIME;
ALTER TABLE events ADD COLUMN why_go TEXT;
ALTER TABLE events ADD COLUMN canonical_id INTEGER;
ALTER TABLE events ADD COLUMN slug TEXT;
ALTER TABLE events ADD COLUMN series_id INTEGER;

-- 2. Create event_sources table
CREATE TABLE IF NOT EXISTS event_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_handle TEXT,
  raw_title TEXT,
  raw_description TEXT,
  raw_image_url TEXT,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  quality_score REAL DEFAULT 0.5,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 3. Create event_series table
CREATE TABLE IF NOT EXISTS event_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  venue_id INTEGER,
  venue_name TEXT,
  recurrence_pattern TEXT,
  day_of_week TEXT,
  vibe_tags TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create scraper_runs table
CREATE TABLE IF NOT EXISTS scraper_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  events_found INTEGER DEFAULT 0,
  events_new INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_duplicates INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  error_message TEXT
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_confidence ON events(confidence_score);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_event_sources_event ON event_sources(event_id);
