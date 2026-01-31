/**
 * Google Places photo backfill + closed detection
 * Usage:
 *   node scripts/places_photo_backfill.mjs --limit=100000 --minRating=0 --dryRun=false
 *
 * Env:
 *   GOOGLE_PLACES_API_KEY (or LUMINA_GOOGLE_API_KEY)
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k,v] = a.replace(/^--/,'').split('=');
    return [k, v ?? 'true'];
  })
);

const LIMIT = Number(argv.limit ?? 1000);
const MIN_RATING = Number(argv.minRating ?? 0);
const DRY_RUN = String(argv.dryRun ?? 'false') === 'true';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
  || process.env.LUMINA_GOOGLE_API_KEY
  || process.env.GOOGLE_API_KEY
  || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error('[places-photo] Missing GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const db = new Database(DB_PATH);

// --- Ensure columns exist (idempotent) ---
function ensureColumn(table, name, ddl) {
  const exists = db.prepare(
    `SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?`
  ).get(table, name).n;
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
    console.log(`[places-photo] Added column ${name}`);
  }
}
ensureColumn('venues','professional_photo_url','TEXT');
ensureColumn('venues','has_photo','INTEGER DEFAULT 0');
ensureColumn('venues','google_rating','REAL');
ensureColumn('venues','exclusion_reason','TEXT');
ensureColumn('venues','should_exclude','INTEGER DEFAULT 0');

// --- Helpers ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildPhotoUrl(photoRef) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photoRef)}&key=${API_KEY}`;
}

async function textSearch(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('key', API_KEY);

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`TextSearch HTTP ${res.status}`);
  return res.json();
}

// --- Candidates: missing photos, not excluded ---
const candidates = db.prepare(`
  SELECT id, name, COALESCE(NULLIF(TRIM(city),''),'') AS city
  FROM venues
  WHERE COALESCE(has_photo,0)=0
    AND COALESCE(should_exclude,0)=0
  LIMIT ?
`).all(LIMIT);

console.log(`[places-photo] Candidates: ${candidates.length} (limit=${LIMIT})  dryRun=${DRY_RUN}`);

let updated = 0, skippedNoPhoto = 0, closed = 0, misses = 0;

const updPhoto = db.prepare(`
  UPDATE venues
     SET professional_photo_url = @url,
         has_photo = 1,
         google_rating = COALESCE(@rating, google_rating)
   WHERE id = @id
`);
const markClosed = db.prepare(`
  UPDATE venues
     SET should_exclude = 1,
         exclusion_reason = 'Closed (Google)'
   WHERE id = @id
     AND COALESCE(should_exclude,0)=0
`);

for (const row of candidates) {
  const q = row.city ? `${row.name} ${row.city}` : row.name;

  try {
    const data = await textSearch(q);
    // Respect rate limits a bit
    await sleep(350);

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('[places-photo] OVER_QUERY_LIMIT, pausing 5s...');
      await sleep(5000);
      continue;
    }

    const place = Array.isArray(data.results) ? data.results[0] : null;
    if (!place) {
      misses++;
      continue;
    }

    // Closed detection
    const status = place.business_status || '';
    if (status.includes('CLOSED')) {
      if (!DRY_RUN) markClosed.run({ id: row.id });
      closed++;
      continue;
    }

    // Rating gate (optional)
    const rating = typeof place.rating === 'number' ? place.rating : null;
    if (rating !== null && rating < MIN_RATING) {
      // Below threshold — treat as miss
      misses++;
      continue;
    }

    // Photo handling
    const photos = Array.isArray(place.photos) ? place.photos : [];
    if (photos.length === 0) {
      skippedNoPhoto++;
      continue;
    }
    const url = buildPhotoUrl(photos[0].photo_reference);

    if (!DRY_RUN) {
      updPhoto.run({ id: row.id, url, rating });
    }
    updated++;
  } catch (err) {
    console.error(`[places-photo] Error for "${q}":`, err.message || err);
    continue;
  }
}

console.log(`[places-photo] done. updated_with_photos=${updated} skipped_no_photo=${skippedNoPhoto} closed=${closed} misses=${misses} of ${candidates.length}`);
