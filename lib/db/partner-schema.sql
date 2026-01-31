CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS partner_venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  phone TEXT,
  website TEXT,
  instagram TEXT,
  is_home INTEGER DEFAULT 0,
  payment_venmo TEXT,
  payment_zelle TEXT,
  payment_cashapp TEXT,
  accept_cash INTEGER DEFAULT 1,
  stripe_account_id TEXT,
  stripe_connected INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'trial',
  trial_ends_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS venue_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  table_count INTEGER DEFAULT 1,
  capacity INTEGER DEFAULT 6,
  min_spend INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES partner_venues(id)
);

CREATE TABLE IF NOT EXISTS partner_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  end_time TIME,
  genre TEXT,
  guest_list_enabled INTEGER DEFAULT 1,
  guest_list_price INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  attendees INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES partner_venues(id)
);

CREATE TABLE IF NOT EXISTS event_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  section_id INTEGER NOT NULL,
  min_spend INTEGER NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  FOREIGN KEY (event_id) REFERENCES partner_events(id),
  FOREIGN KEY (section_id) REFERENCES venue_sections(id)
);

CREATE TABLE IF NOT EXISTS partner_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  event_id INTEGER,
  section_id INTEGER,
  invite_code TEXT UNIQUE NOT NULL,
  host_name TEXT NOT NULL,
  host_phone TEXT NOT NULL,
  host_email TEXT,
  table_type TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  total_amount INTEGER NOT NULL,
  funded_amount INTEGER DEFAULT 0,
  guest_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  confidence TEXT DEFAULT 'low',
  expires_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES partner_venues(id),
  FOREIGN KEY (event_id) REFERENCES partner_events(id),
  FOREIGN KEY (section_id) REFERENCES venue_sections(id)
);

CREATE TABLE IF NOT EXISTS booking_guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  amount INTEGER NOT NULL,
  paid INTEGER DEFAULT 0,
  paid_at DATETIME,
  payment_method TEXT,
  is_host INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES partner_bookings(id)
);

CREATE TABLE IF NOT EXISTS booking_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  guest_id INTEGER,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES partner_bookings(id),
  FOREIGN KEY (guest_id) REFERENCES booking_guests(id)
);

CREATE INDEX IF NOT EXISTS idx_partner_venues_partner ON partner_venues(partner_id);
CREATE INDEX IF NOT EXISTS idx_venue_sections_venue ON venue_sections(venue_id);
CREATE INDEX IF NOT EXISTS idx_partner_events_venue ON partner_events(venue_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_venue ON partner_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_code ON partner_bookings(invite_code);
CREATE INDEX IF NOT EXISTS idx_booking_guests_booking ON booking_guests(booking_id);
