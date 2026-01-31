/**
 * Promote future events from staging_events -> events
 * - Only rows with ISO dates (YYYY-MM-DD) today or later
 * - Dedupes by (name, date_iso, city, COALESCE(venue_name,'')) 
 * - Keeps first seen (INSERT OR IGNORE on a unique shadow key)
 * - Leaves staging rows in place (so you can re-run safely)
 */

import Database from "better-sqlite3";

const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";
function log(...a){ console.log("[promote-events]", ...a); }

const db = new Database(DB_PATH);

// Ensure destination table exists with expected columns
db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  source TEXT,
  name TEXT NOT NULL,
  venue_name TEXT,
  venue_id INTEGER,
  city TEXT,
  neighborhood TEXT,
  date TEXT,
  date_iso TEXT,
  time TEXT,
  description TEXT,
  music_genre TEXT,
  price TEXT,
  ticket_url TEXT,
  image_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- shadow uniqueness to avoid true schema changes
CREATE TABLE IF NOT EXISTS _event_uniques (
  key TEXT PRIMARY KEY
);
`);

const today = new Date().toISOString().slice(0,10);

// pull candidates
const rows = db.prepare(`
  SELECT id, source, name, venue_name, venue_id, city, neighborhood, date, date_iso,
         time, description, music_genre, price, ticket_url, image_url, tags
  FROM staging_events
  WHERE date_iso GLOB '____-__-__' AND date_iso >= ?
  ORDER BY date_iso ASC, COALESCE(city,'') ASC, COALESCE(name,'') ASC
`).all(today);

log("candidates:", rows.length);

const insUnique = db.prepare(`INSERT OR IGNORE INTO _event_uniques(key) VALUES (?)`);
const insEvent  = db.prepare(`
  INSERT INTO events
  (source, name, venue_name, venue_id, city, neighborhood, date, date_iso, time,
   description, music_genre, price, ticket_url, image_url, tags)
  VALUES
  (@source, @name, @venue_name, @venue_id, @city, @neighborhood, @date, @date_iso, @time,
   @description, @music_genre, @price, @ticket_url, @image_url, @tags)
`);

let inserted = 0, skipped = 0;
db.transaction(() => {
  for (const r of rows) {
    const key = [
      (r.name||"").trim().toLowerCase(),
      (r.date_iso||"").trim(),
      (r.city||"").trim().toLowerCase(),
      (r.venue_name||"").trim().toLowerCase()
    ].join("|");
    const res = insUnique.run(key);
    if (res.changes === 0) { skipped++; continue; } // seen before
    insEvent.run(r);
    inserted++;
  }
})();

log(`inserted=${inserted} skipped_dupes=${skipped}`);

// tiny report
const rpt = db.prepare(`
  SELECT date_iso, COUNT(*) AS n
  FROM events
  WHERE date_iso >= ?
  GROUP BY date_iso
  ORDER BY date_iso ASC
  LIMIT 15
`).all(today);
log("upcoming sample:", rpt);

db.close();
