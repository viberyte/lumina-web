/**
 * Yelp photo backfill + closed detection
 * Usage:
 *   node scripts/yelp_photo_backfill.mjs --limit=100000 --minRating=0 --dryRun=false
 *
 * Env:
 *   YELP_API_KEY (or LUMINA_YELP_API_KEY)
 */

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

const YELP_KEY = process.env.YELP_API_KEY
  || process.env.LUMINA_YELP_API_KEY;

if (!YELP_KEY) {
  console.error('[yelp-photo] Missing YELP_API_KEY');
  process.exit(1);
}

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const db = new Database(DB_PATH);

// --- Ensure columns exist ---
function ensureColumn(table, name, ddl) {
  const exists = db.prepare(
    `SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?`
  ).get(table, name).n;
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
    console.log(`[yelp-photo] Added column ${name}`);
  }
}
ensureColumn('venues','professional_photo_url','TEXT');
ensureColumn('venues','has_photo','INTEGER DEFAULT 0');
ensureColumn('venues','yelp_rating','REAL');
ensureColumn('venues','exclusion_reason','TEXT');
ensureColumn('venues','should_exclude','INTEGER DEFAULT 0');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function yelpSearch(term, location) {
  const url = new URL('https://api.yelp.com/v3/businesses/search');
  url.searchParams.set('term', term);
  url.searchParams.set('location', location || 'New York, NY');
  url.searchParams.set('limit', '3');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${YELP_KEY}` }
  });
  if (!res.ok) throw new Error(`Yelp search HTTP ${res.status}`);
  return res.json();
}

async function yelpDetails(id) {
  const url = `https://api.yelp.com/v3/businesses/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${YELP_KEY}` }
  });
  if (!res.ok) throw new Error(`Yelp details HTTP ${res.status}`);
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

console.log(`[yelp-photo] Candidates: ${candidates.length} (limit=${LIMIT})  dryRun=${DRY_RUN}`);

let updated = 0, skippedNoPhoto = 0, closed = 0, misses = 0;

const updPhoto = db.prepare(`
  UPDATE venues
     SET professional_photo_url = @url,
         has_photo = 1,
         yelp_rating = COALESCE(@rating, yelp_rating)
   WHERE id = @id
`);
const markClosed = db.prepare(`
  UPDATE venues
     SET should_exclude = 1,
         exclusion_reason = 'Closed (Yelp)'
   WHERE id = @id
     AND COALESCE(should_exclude,0)=0
`);

for (const row of candidates) {
  const term = row.name;
  const location = row.city || 'New York, NY';
  try {
    const s = await yelpSearch(term, location);
    await sleep(300);

    const biz = (s.businesses && s.businesses[0]) ? s.businesses[0] : null;
    if (!biz) { misses++; continue; }

    // Closed detection
    if (biz.is_closed === true) {
      if (!DRY_RUN) markClosed.run({ id: row.id });
      closed++;
      continue;
    }

    // Drill into details for photos array
    const det = await yelpDetails(biz.id);
    await sleep(300);

    const rating = typeof det.rating === 'number' ? det.rating : (typeof biz.rating === 'number' ? biz.rating : null);
    if (rating !== null && rating < MIN_RATING) { misses++; continue; }

    const photos = Array.isArray(det.photos) ? det.photos : (biz.image_url ? [biz.image_url] : []);
    if (photos.length === 0) {
      skippedNoPhoto++;
      continue;
    }

    if (!DRY_RUN) {
      updPhoto.run({ id: row.id, url: photos[0], rating });
    }
    updated++;
  } catch (err) {
    console.error(`[yelp-photo] Error for "${term} / ${location}":`, err.message || err);
    continue;
  }
}

console.log(`[yelp-photo] done. updated_with_photos=${updated} skipped_no_photo=${skippedNoPhoto} closed=${closed} misses=${misses} of ${candidates.length}`);
