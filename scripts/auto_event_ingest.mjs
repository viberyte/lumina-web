/**
 * Auto Event Ingest (robust)
 * - Finds newest events-*.json in data/events
 * - Accepts: [ ... ] or { events|data|items: [...] }
 * - Flexible field names (title, event_name, name, etc.)
 * - Normalizes date to YYYY-MM-DD
 * - Skips with reasons (and logs a small sample)
 */

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = "/opt/viberyte/lumina-web/data/events";
const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";
const LOG_SAMPLE = 15;

function log(...a) { console.log("[auto-event-ingest]", ...a); }

function findLatestJson() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json") && f.startsWith("events-"))
    .map(f => ({ f, m: fs.statSync(path.join(DATA_DIR, f)).mtimeMs }))
    .sort((a,b) => b.m - a.m);
  return files.length ? path.join(DATA_DIR, files[0].f) : null;
}

function toArray(maybe) {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (typeof maybe === "object") {
    const arr = maybe.events || maybe.data || maybe.items || maybe.results || null;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

const MONTHS = {
  jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12
};
function pad(n){ return String(n).padStart(2,"0"); }
function parseLooseDate(s) {
  if (!s || typeof s !== "string") return null;
  // Try native
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return new Date(n).toISOString().slice(0,10);
  // Try “Sep 12, 2025” / “September 12, 2025”
  const m = s.trim().toLowerCase()
    .replace(/\s+/g," ")
    .match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mm = MONTHS[m[1].slice(0,3).toLowerCase()];
    const dd = parseInt(m[2],10);
    const yyyy = parseInt(m[3],10);
    if (mm>=1 && mm<=12 && dd>=1 && dd<=31 && yyyy>=2000 && yyyy<=2100) {
      return `${yyyy}-${pad(mm)}-${pad(dd)}`;
    }
  }
  // Try “YYYY/MM/DD” or “MM/DD/YYYY”
  const slash = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (slash) {
    const yyyy = parseInt(slash[1],10);
    const mm = parseInt(slash[2],10);
    const dd = parseInt(slash[3],10);
    if (yyyy>=2000 && yyyy<=2100 && mm>=1&&mm<=12 && dd>=1&&dd<=31) {
      return `${yyyy}-${pad(mm)}-${pad(dd)}`;
    }
  }
  const mdY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdY) {
    const mm = parseInt(mdY[1],10);
    const dd = parseInt(mdY[2],10);
    const yyyy = parseInt(mdY[3],10);
    if (yyyy>=2000 && yyyy<=2100 && mm>=1&&mm<=12 && dd>=1&&dd<=31) {
      return `${yyyy}-${pad(mm)}-${pad(dd)}`;
    }
  }
  return null;
}

function pick(...candidates) {
  for (const v of candidates) if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  return "";
}

function normalize(rec) {
  const name = pick(rec.name, rec.title, rec.event_name);
  const venue_name = pick(rec.venue_name, rec.venue, rec.location?.name);
  const city = pick(rec.city, rec.location?.city, rec.town, rec.area);
  const neighborhood = pick(rec.neighborhood, rec.area, rec.district);
  const date_raw = pick(rec.date, rec.date_text, rec.when, rec.datetime);
  const date_iso = parseLooseDate(rec.date_iso || date_raw);
  const time = pick(rec.time, rec.start_time);
  const description = pick(rec.description, rec.summary, rec.caption);
  const music_genre = pick(rec.music_genre, rec.genre);
  const price = pick(rec.price, rec.cost);
  const ticket_url = pick(rec.ticket_url, rec.url, rec.link);
  const image_url = pick(rec.image_url, rec.image, rec.flyer, rec.poster);
  const tags = Array.isArray(rec.tags) ? rec.tags.join("|") : pick(rec.tags);

  return {
    source: pick(rec.source,"generic"),
    name, venue_name, venue_id: rec.venue_id ?? null,
    city, neighborhood,
    date: date_raw, date_iso, time, description, music_genre, price, ticket_url, image_url, tags
  };
}

try {
  const latest = findLatestJson();
  if (!latest) throw new Error("No events-*.json found in data/events");
  log("Loading", latest);

  const raw = fs.readFileSync(latest, "utf8");
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("File is not valid JSON"); }

  const arr = toArray(json);
  log("Found", arr.length, "records");

  const db = new Database(DB_PATH);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO staging_events
      (source, name, venue_name, venue_id, city, neighborhood, date, date_iso,
       time, description, music_genre, price, ticket_url, image_url, tags)
    VALUES
      (@source, @name, @venue_name, @venue_id, @city, @neighborhood, @date, @date_iso,
       @time, @description, @music_genre, @price, @ticket_url, @image_url, @tags);
  `);

  let inserted = 0, skipped = 0;
  const skipSamples = [];
  db.transaction(() => {
    for (const rec of arr) {
      const norm = normalize(rec);
      if (!norm.name) {
        if (skipSamples.length < LOG_SAMPLE) skipSamples.push({reason:"missing name", rec});
        skipped++; continue;
      }
      if (!norm.date_iso) {
        if (skipSamples.length < LOG_SAMPLE) skipSamples.push({reason:"bad date", raw: norm.date, rec});
        skipped++; continue;
      }
      insert.run(norm);
      inserted++;
    }
  })();

  log(`Inserted=${inserted} Skipped=${skipped}`);
  if (skipSamples.length) {
    log("Skip samples:");
    for (const s of skipSamples) {
      log("-", s.reason, "→", (s.rec?.name || s.rec?.title || "(no title)"));
    }
  }
  db.close();
} catch (e) {
  log("Error:", e.message);
  process.exit(1);
}
