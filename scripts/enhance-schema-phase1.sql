-- Phase 1A: Add core intelligence columns to venues table

-- Hookah detection
ALTER TABLE venues ADD COLUMN has_hookah INTEGER DEFAULT 0;
ALTER TABLE venues ADD COLUMN hookah_confidence REAL DEFAULT 0;

-- Venue classification
ALTER TABLE venues ADD COLUMN dress_code TEXT;
ALTER TABLE venues ADD COLUMN primary_scene TEXT;
ALTER TABLE venues ADD COLUMN price_tier TEXT;

-- Intelligence metadata
ALTER TABLE venues ADD COLUMN best_for TEXT;
ALTER TABLE venues ADD COLUMN signature_drinks TEXT;
ALTER TABLE venues ADD COLUMN last_insights_refresh TEXT;

-- Create new intelligence tables
CREATE TABLE IF NOT EXISTS venue_night_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    day_of_week TEXT NOT NULL CHECK(day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
    mode TEXT NOT NULL CHECK(mode IN ('lounge','clubby','club')),
    energy_score REAL NOT NULL CHECK(energy_score >= 0 AND energy_score <= 1),
    crowd_score REAL NOT NULL CHECK(crowd_score >= 0 AND crowd_score <= 1),
    confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
    sample_size INTEGER DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    last_seen_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS venue_time_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    day_of_week TEXT NOT NULL CHECK(day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
    best_arrival TEXT,
    peak_start TEXT,
    peak_end TEXT,
    late_start TEXT,
    late_end TEXT,
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS venue_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    feature_type TEXT NOT NULL, -- 'hookah', 'rooftop', 'dj_booth', 'dance_floor', 'bottle_service'
    has_feature INTEGER NOT NULL DEFAULT 0,
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    evidence JSON, -- stores detection details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, feature_type)
);

CREATE TABLE IF NOT EXISTS venue_drink_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    drink_name TEXT NOT NULL,
    category TEXT, -- 'cocktail', 'beer', 'wine', 'shot', 'bottle'
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    evidence_count INTEGER DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    price_range TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venue_crowd_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL UNIQUE REFERENCES venues(id),
    dominant_age_band TEXT CHECK(dominant_age_band IN ('18-24','25-34','35-44','45+')),
    gender_balance TEXT CHECK(gender_balance IN ('male-heavy','balanced','female-heavy')),
    dress_level TEXT CHECK(dress_level IN ('casual','smart-casual','upscale','formal')),
    group_mode TEXT CHECK(group_mode IN ('solo-friendly','couples','groups-heavy','mixed')),
    solo_friendliness TEXT CHECK(solo_friendliness IN ('low','medium','high')),
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    sample_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add request types for booking clarity
ALTER TABLE tonights_floor_requests ADD COLUMN request_type TEXT DEFAULT 'reservation' 
    CHECK(request_type IN ('reservation','section_inquiry','bottle_service','event_guestlist'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_night_profile_venue ON venue_night_profile(venue_id);
CREATE INDEX IF NOT EXISTS idx_time_windows_venue ON venue_time_windows(venue_id);
CREATE INDEX IF NOT EXISTS idx_features_venue ON venue_features(venue_id);
CREATE INDEX IF NOT EXISTS idx_drinks_venue ON venue_drink_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_crowd_venue ON venue_crowd_profile(venue_id);
