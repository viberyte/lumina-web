/**
 * event_ingest_any.mjs
 * Robust ingester for assorted event JSON shapes (TAO / POSH / Instagram / generic).
 * - Accepts 1..N JSON file paths as CLI args
 * - Detects events array at .events / .data / .items / root array
 * - Normalizes fields and writes into staging_events
 * - Computes date_iso for common formats (YYYY-MM-DD, MMM DD, YYYY, Month DD, YYYY, DD/MM/YY)
 * - Idempotent via shadow uniqueness table
 *
 * Usage:
 *   node /opt/viberyte/lumina-web/scripts/event_ingest_any.mjs /path/to/file1.json [/path/to/file2.json ...]
 */

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";
function log(...a){ console.log("[event-ingest-any]", ...a); }

const db = new Database(DB_PATH);

// Ensure table exists
db.exec(`
CREATE TABLE IF NOT EXISTS staging_events (
  id INTEGER PRIMARY KEY,
  source TEXT,
  source_id TEXT,
  name TEXT NOT NULL,
  city TEXT,
  neighborhood TEXT,
  venue_name TEXT,
  venue_id INTEGER,
  date TEXT,         -- original
  date_iso TEXT,     -- YYYY-MM-DD
  time TEXT,
  description TEXT,
  music_genre TEXT,
  price TEXT,
  ticket_url TEXT,
  image_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- dedupe key (shadow table so we don't mutate schema assumptions)
CREATE TABLE IF NOT EXISTS _stg_event_uniques (
  key TEXT PRIMARY KEY
);
`);

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12"
};

function toISODate(s) {
  if (!s) return null;
  const str = String(s).trim();

  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YY or DD/MM/YYYY -> YYYY-MM-DD
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [ , d, mo, y ] = m;
    if (y.length === 2) y = Number(y) >= 70 ? "19"+y : "20"+y;
    return `${y.padStart(4,"0")}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  // MMM DD, YYYY  (e.g., Sep 12, 2025)
  m = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${String(m[2]).padStart(2,"0")}`;
  }

  // Friday September 12th 2025 (strip weekday & suffix)
  m = str.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i);
  if (m) {
    const mon = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${String(m[2]).padStart(2,"0")}`;
  }

  // Month DD YYYY (no comma) e.g., September 12 2025
  m = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${String(m[2]).padStart(2,"0")}`;
  }

  // Ranges like "Sep 12, 2025 – Sep 13, 2025 | 11:00 PM – 4:00 AM" -> first date
  const range = str.split(/[–\-]|to/i)[0].trim();
  if (range && range !== str) {
    const tryFirst = toISODate(range);
    if (tryFirst) return tryFirst;
  }

  return null; // unknown
}

function pick(arr, ...keys) {
  for (const k of keys) if (k in arr) return arr[k];
  return undefined;
}

function coerceArrayMaybe(o) {
  if (Array.isArray(o)) return o;
  if (!o || typeof o !== "object") return [];
  return (o.events || o.data || o.items || (Array.isArray(o) ? o : [])) || [];
}

const insUnique = db.prepare(`INSERT OR IGNORE INTO _stg_event_uniques(key) VALUES (?)`);
const ins = db.prepare(`
  INSERT INTO staging_events
  (source, source_id, name, city, neighborhood, venue_name, venue_id, date, date_iso, time,
   description, music_genre, price, ticket_url, image_url, tags)
  VALUES
  (@source, @source_id, @name, @city, @neighborhood, @venue_name, @venue_id, @date, @date_iso, @time,
   @description, @music_genre, @price, @ticket_url, @image_url, @tags)
`);

let seen = 0, inserted = 0, skipped = 0;

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node event_ingest_any.mjs <file1.json> [file2.json ...]");
  process.exit(1);
}

for (const f of files) {
  let raw;
  try {
    raw = fs.readFileSync(f, "utf8");
  } catch {
    log("skip (unreadable):", f);
    continue;
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    log("skip (not JSON):", f);
    continue;
  }

  // Handle array root or {events|data|items}
  const arr = Array.isArray(json) ? json : coerceArrayMaybe(json);
  log("file:", path.basename(f), "items:", arr.length);

  db.transaction(() => {
    for (const ev of arr) {
      seen++;

      const rec = {
        source: ev.source || json.source || "generic",
        source_id: ev.id || ev.eventId || ev.slug || null,
        name: ev.name || ev.title || ev.event_name || "",
        city: ev.city || ev.location?.city || ev.venue_city || "",
        neighborhood: ev.neighborhood || ev.location?.neighborhood || "",
        venue_name: ev.venue_name || ev.venue || ev.location?.venue || "",
        venue_id: ev.venue_id || null,
        date: ev.date || ev.date_text || ev.when || ev.datetime || ev.start_date || "",
        date_iso: null, // fill below
        time: ev.time || ev.start_time || ev.when_time || "",
        description: ev.description || ev.caption || "",
        music_genre: ev.music_genre || ev.genre || "",
        price: ev.price || ev.ticket_price || "",
        ticket_url: ev.ticket_url || ev.url || ev.link || "",
        image_url: ev.image_url || ev.image || ev.flyer || ev.cover || "",
        tags: Array.isArray(ev.tags) ? JSON.stringify(ev.tags) : (typeof ev.tags === "string" ? ev.tags : "")
      };

      // Try to compute ISO date
      rec.date_iso = toISODate(rec.date);

      // Build dedupe key (source + normalized name + date_iso + city + venue_name)
      const key = [
        (rec.source||"").trim().toLowerCase(),
        (rec.name||"").trim().toLowerCase(),
        (rec.date_iso||"").trim(),
        (rec.city||"").trim().toLowerCase(),
        (rec.venue_name||"").trim().toLowerCase()
      ].join("|");

      if (insUnique.run(key).changes === 0) { skipped++; continue; }
      ins.run(rec);
      inserted++;
    }
  })();

}

log(`seen=${seen} inserted=${inserted} skipped_dupes=${skipped}`);

// quick peek: how many with future ISO dates
const today = new Date().toISOString().slice(0,10);
const counts = db.prepare(`
  SELECT
    SUM(CASE WHEN date_iso GLOB '____-__-__' AND date_iso >= ? THEN 1 ELSE 0 END) AS future_iso,
    COUNT(*) AS total_staging
  FROM staging_events
`).get(today);

log("staging summary:", counts);
db.close();
