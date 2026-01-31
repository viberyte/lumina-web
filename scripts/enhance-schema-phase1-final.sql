-- Phase 1A: Create new intelligence tables only

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
    feature_type TEXT NOT NULL,
    has_feature INTEGER NOT NULL DEFAULT 0,
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    evidence TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, feature_type)
);

CREATE TABLE IF NOT EXISTS venue_drink_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    drink_name TEXT NOT NULL,
    category TEXT,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_night_profile_venue ON venue_night_profile(venue_id);
CREATE INDEX IF NOT EXISTS idx_night_profile_dow ON venue_night_profile(day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_windows_venue ON venue_time_windows(venue_id);
CREATE INDEX IF NOT EXISTS idx_features_venue ON venue_features(venue_id);
CREATE INDEX IF NOT EXISTS idx_features_type ON venue_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_drinks_venue ON venue_drink_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_crowd_venue ON venue_crowd_profile(venue_id);
