#!/usr/bin/env node
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";

// CLI: node event_ingest_from_json.mjs /path/to/events.json --source=posh (optional)
const jsonPath = process.argv[2];
const sourceArg = (process.argv.find(a => a.startsWith("--source=")) || "").split("=")[1] || "";

if (!jsonPath) {
  console.error("Usage: node event_ingest_from_json.mjs /path/to/events.json [--source=posh|dice|instagram|manual]");
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) {
  console.error(`File not found: ${jsonPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, "utf8");
let items;
try {
  items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    throw new Error("JSON root must be an array");
  }
} catch (e) {
  console.error("Failed to parse JSON:", e.message);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Ensure staging_events exists
db.exec(`
CREATE TABLE IF NOT EXISTS staging_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  source_id TEXT,
  name TEXT NOT NULL,
  venue_name TEXT,
  venue_id INTEGER,
  date TEXT NOT NULL,
  time TEXT,
  description TEXT,
  music_genre TEXT,
  price TEXT,
  ticket_url TEXT,
  image_url TEXT,
  city TEXT,
  neighborhood TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stg_events_key
  ON staging_events (source, source_id, date, venue_name);
`);

// Upsert helper (idempotent-ish for a weekly run)
const insertOrIgnore = db.prepare(`
INSERT OR IGNORE INTO staging_events
(source, source_id, name, venue_name, venue_id, date, time, description, music_genre, price, ticket_url, image_url, city, neighborhood, tags)
VALUES (@source, @source_id, @name, @venue_name, @venue_id, @date, @time, @description, @music_genre, @price, @ticket_url, @image_url, @city, @neighborhood, @tags)
`);

const normalize = (x) => {
  // try to infer a few common shapes from your existing scrapers
  const src = sourceArg || String(x.source || "").toLowerCase() || "unknown";

  // *Best effort* mapping across your various scrapers
  const rec = {
    source: src,
    source_id: String(x.id || x.source_id || x.eventId || x.slug || "").trim().slice(0, 128),
    name: (x.name || x.title || "").toString().trim(),
    venue_name: (x.venue_name || x.venue || x.locationName || "").toString().trim() || null,
    venue_id: Number.isInteger(x.venue_id) ? x.venue_id : null,
    date: (x.date || x.startDate || x.eventDate || "").toString().trim(),
    time: (x.time || x.startTime || "").toString().trim() || null,
    description: (x.description || x.notes || "").toString().trim() || null,
    music_genre: (x.music_genre || x.genre || x.music || "").toString().trim() || null,
    price: (x.price || x.ticketPrice || "").toString().trim() || null,
    ticket_url: (x.ticket_url || x.url || x.link || "").toString().trim() || null,
    image_url: (x.image_url || x.cover || x.poster || "").toString().trim() || null,
    city: (x.city || x.area || "").toString().trim() || null,
    neighborhood: (x.neighborhood || "").toString().trim() || null,
    tags: Array.isArray(x.tags) ? JSON.stringify(x.tags) : (typeof x.tags === "string" ? x.tags : null),
  };

  // minimal required fields
  if (!rec.name || !rec.date) return null;

  // Collapse empty strings to null
  for (const k of Object.keys(rec)) {
    if (typeof rec[k] === "string" && rec[k].trim() === "") rec[k] = null;
  }

  return rec;
};

let seen = 0, inserted = 0, skipped = 0;
const tx = db.transaction((rows) => {
  for (const x of rows) {
    seen++;
    const rec = normalize(x);
    if (!rec) { skipped++; continue; }
    insertOrIgnore.run(rec);
    if (db.prepare(`SELECT changes() AS c`).get().c > 0) inserted++;
  }
});
tx(items);

console.log(`[event-ingest] file=${path.basename(jsonPath)} seen=${seen} inserted=${inserted} skipped=${skipped}`);
