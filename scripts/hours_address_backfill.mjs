#!/usr/bin/env node
// hours_address_backfill.mjs
// One-pass backfill of hours + full address for every venue.
// Sources: Google Places (primary), Yelp (secondary), optional Anthropic check.
// Usage:
//   node scripts/hours_address_backfill.mjs --limit=100000 --force=false --dryRun=false --hoursCutoff=2 --log=/opt/viberyte/logs/hours_backfill.log
//
// ENV:
//   GOOGLE_API_KEY=...          (required for Google Places)
//   YELP_API_KEY=...            (optional – improves coverage)
//   ANTHROPIC_API_KEY=...       (optional – Claude validation)

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const LOG_PATH = args.log || '/opt/viberyte/logs/hours_backfill.log';
const LIMIT = Number(args.limit || 100000);
const FORCE = String(args.force || 'false') === 'true';
const DRY = String(args.dryRun || 'false') === 'true';
const HOURS_CUTOFF = Number(args.hoursCutoff || 2); // 2am means "after-club"
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
const log = (msg) => fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ensureColumns(db) {
  const run = (sql) => db.prepare(sql).run();

  // Generic helper to add column if missing
  const hasCol = db.prepare(`
    SELECT 1 FROM pragma_table_info('venues') WHERE name=? LIMIT 1
  `);

  const maybeAdd = (name, type, def=null) => {
    const row = hasCol.get(name);
    if (!row) {
      run(`ALTER TABLE venues ADD COLUMN ${name} ${type}${def!==null ? ` DEFAULT ${def}` : ''};`);
    }
  };

  maybeAdd('google_place_id', 'TEXT');
  maybeAdd('yelp_id', 'TEXT');
  maybeAdd('hours_json', 'TEXT');
  maybeAdd('address', 'TEXT'); // safeguard if older schemas had different field
  maybeAdd('vibe_tags', 'TEXT');
  maybeAdd('why_recommended', 'TEXT');
  // flags handy for filtering
  maybeAdd('has_hours', 'INTEGER', 0);

  // normalize blanks
  run(`UPDATE venues SET hours_json=NULL WHERE hours_json IS NOT NULL AND TRIM(hours_json)=''`);
  run(`UPDATE venues SET address=NULL    WHERE address    IS NOT NULL AND TRIM(address)=''`);
  run(`UPDATE venues SET vibe_tags='[]'  WHERE vibe_tags  IS NULL OR TRIM(vibe_tags)=''`);
  run(`CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues(google_place_id)`);
  run(`CREATE INDEX IF NOT EXISTS idx_venues_yelp_id ON venues(yelp_id)`);
  run(`CREATE INDEX IF NOT EXISTS idx_venues_has_hours ON venues(has_hours)`);
}

function parseWeekdayText(weekdayText = []) {
  // Returns array of {day:"Mon", open:"11:00", close:"02:00", closeNextDay:boolean}
  // Supports Google "weekday_text" strings like "Monday: 11 AM–2 AM"
  const out = [];
  const dayMap = {Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun'};
  const twelve = s => s.replace(/\u202F/g,' ').replace(/\s+/g,' ').trim(); // normalize thin spaces
  const to24 = (t) => {
    // "11 AM", "2 AM", "11:30 PM", "Closed", "Open 24 hours"
    const x = t.trim().toLowerCase();
    if (x.includes('open 24')) return {open:'00:00', close:'24:00', closeNextDay:false};
    if (x.includes('closed')) return null;
    const m = x.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (!m) return null;
    let h = parseInt(m[1],10);
    const min = m[2] ? parseInt(m[2],10) : 0;
    const ampm = m[3].toLowerCase();
    if (ampm==='pm' && h!==12) h+=12;
    if (ampm==='am' && h===12) h=0;
    return {open:`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`};
  };

  for (const line of weekdayText) {
    // e.g., "Monday: 11 AM–2 AM"
    const [d, rest] = twelve(line).split(':');
    const day = dayMap[d.trim()] || d.trim();
    if (!rest) continue;
    const span = rest.trim();
    if (/closed/i.test(span)) {
      out.push({day, closed:true});
      continue;
    }
    if (/open 24/i.test(span)) {
      out.push({day, open:'00:00', close:'24:00', closeNextDay:false});
      continue;
    }
    const parts = span.split('–').map(s=>s.trim());
    if (parts.length!==2) continue;
    const o = to24(parts[0]);
    const c = to24(parts[1]);
    if (!o || !c || !o.open) continue;
    let close = c.open;
    // if close hour numerically less than open, it spills to next day
    const closeNextDay = close !== '24:00' && close < o.open;
    out.push({day, open:o.open, close, closeNextDay});
  }
  return out;
}

async function googleDetailsByPlaceId(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,opening_hours,website,international_phone_number,place_id,rating,user_ratings_total,types,geometry&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google details HTTP ${res.status}`);
  const j = await res.json();
  if (j.status !== 'OK') return null;
  const r = j.result;
  return {
    place_id: r.place_id,
    address: r.formatted_address || null,
    weekday_text: r.opening_hours?.weekday_text || null,
  };
}

async function googleFindPlace(name, city) {
  const input = [name, city].filter(Boolean).join(', ');
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?inputtype=textquery&input=${encodeURIComponent(input)}&fields=place_id,formatted_address,name&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google findplace HTTP ${res.status}`);
  const j = await res.json();
  if (j.status !== 'OK' || !j.candidates?.length) return null;
  return j.candidates[0]; // best candidate
}

async function yelpBusiness(name, city) {
  if (!YELP_API_KEY) return null;
  const qs = new URLSearchParams({ term: name, location: city, limit:'1' });
  const url = `https://api.yelp.com/v3/businesses/search?${qs.toString()}`;
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${YELP_API_KEY}` }});
  if (!res.ok) return null;
  const j = await res.json();
  const biz = j.businesses?.[0];
  if (!biz) return null;
  // details (hours) require a second call
  const d = await fetch(`https://api.yelp.com/v3/businesses/${biz.id}`, { headers:{ Authorization:`Bearer ${YELP_API_KEY}` }});
  if (!d.ok) return { id: biz.id, address: (biz.location?.display_address||[]).join(', ') || null };
  const dj = await d.json();
  const yHours = dj.hours?.[0]?.open || [];
  // Yelp hours open contains { day:0..6, start:"HHMM", end:"HHMM", is_overnight:true }
  const mapDay = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grouped = {};
  for (const h of yHours) {
    const day = mapDay[h.day] || String(h.day);
    const toHHMM = (s) => `${s.slice(0,2)}:${s.slice(2,4)}`;
    (grouped[day] ||= []).push({
      day,
      open: toHHMM(h.start),
      close: toHHMM(h.end),
      closeNextDay: !!h.is_overnight
    });
  }
  // flatten into Google-like structure if we want
  const flat = Object.keys(grouped).sort((a,b)=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(a)-['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(b))
                 .flatMap(k => grouped[k]);
  return { id: dj.id || biz.id, address: (dj.location?.display_address||[]).join(', ') || null, hours: flat.length?flat:null };
}

async function anthropicValidate(payload) {
  if (!ANTHROPIC_API_KEY) return null;
  const prompt = `You are validating nightlife/dining venue data. Return strict JSON with fields:
  {"is_valid": boolean, "corrected_address": string|null, "notes": string|null}
  Consider only restaurants, lounges, bars, clubs as VALID. Parks, museums, generic streets, fake entries are INVALID.
  DATA:\n${JSON.stringify(payload).slice(0,6000)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages:[{role:'user', content: prompt}]
    })
  });
  if (!res.ok) return null;
  const j = await res.json();
  const text = j?.content?.[0]?.text || '';
  try { return JSON.parse(text); } catch { return null; }
}

function needsWork(row) {
  if (FORCE) return true;
  const missingHours = !row.hours_json || !row.has_hours;
  const missingAddr  = !row.address || !row.address.trim();
  return missingHours || missingAddr;
}

function computeAfterClubFlag(hours, cutoffHour = 2) {
  // hours: array of {day, open, close, closeNextDay, closed?}
  if (!Array.isArray(hours) || !hours.length) return false;
  // if any close time is >= cutoff (02:00) or 24:00, mark true
  const toNum = (hhmm) => {
    if (!hhmm || hhmm==='24:00') return 24*60;
    const [h,m] = hhmm.split(':').map(Number);
    return h*60+m;
  };
  const cutoff = cutoffHour*60;
  for (const h of hours) {
    if (h.closed) continue;
    const closeMin = toNum(h.close);
    const spill = h.closeNextDay ? closeMin + 24*60 : closeMin; // 02:00 next day -> 26:00
    if (spill >= (24*60 + cutoff) || (!h.closeNextDay && closeMin >= cutoff)) return true;
  }
  return false;
}

(async () => {
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_API_KEY env');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  ensureColumns(db);

  // pull candidates
  const selectStmt = db.prepare(`
    SELECT id, name, city, COALESCE(address,'') AS address,
           google_place_id, yelp_id, COALESCE(hours_json,'') AS hours_json,
           COALESCE(vibe_tags,'[]') AS vibe_tags, COALESCE(has_hours,0) AS has_hours
    FROM venues
    WHERE COALESCE(should_exclude,0)=0
    ORDER BY id
    LIMIT ?
  `);
  const rows = selectStmt.all(LIMIT);
  log(`[hours-backfill] candidates=${rows.length} limit=${LIMIT} force=${FORCE} dry=${DRY}`);

  const upd = db.prepare(`
    UPDATE venues
    SET google_place_id = COALESCE(?, google_place_id),
        yelp_id         = COALESCE(?, yelp_id),
        address         = COALESCE(NULLIF(?,''), address),
        hours_json      = COALESCE(?, hours_json),
        has_hours       = COALESCE(?, has_hours),
        vibe_tags       = ?
    WHERE id = ?
  `);

  let touched = 0, skips = 0;

  for (const v of rows) {
    if (!needsWork(v)) { skips++; continue; }

    let gDetails = null, yDetails = null;

    try {
      // 1) Google (prefer place_id if we have it; else FindPlace)
      let placeId = v.google_place_id;
      if (!placeId) {
        const fp = await googleFindPlace(v.name, v.city);
        placeId = fp?.place_id || null;
      }
      if (placeId) {
        gDetails = await googleDetailsByPlaceId(placeId);
        // basic rate-limit
        await sleep(120);
      }

      // 2) Yelp (best-effort)
      if (YELP_API_KEY) {
        yDetails = await yelpBusiness(v.name, v.city);
        await sleep(100);
      }

      // 3) Merge hours/address
      let mergedAddress = v.address;
      if ((!mergedAddress || !mergedAddress.trim()) && (gDetails?.address || yDetails?.address)) {
        mergedAddress = gDetails?.address || yDetails?.address || '';
      }

      let hours = null;
      if (gDetails?.weekday_text) hours = parseWeekdayText(gDetails.weekday_text);
      if (!hours && yDetails?.hours) hours = yDetails.hours;

      // 4) Optional Anthropic sanity check (type validation & address tweak)
      if (ANTHROPIC_API_KEY) {
        const check = await anthropicValidate({
          name: v.name, city: v.city,
          google: {place_id: gDetails?.place_id, address: gDetails?.address, weekday_text: gDetails?.weekday_text},
          yelp: {id: yDetails?.id, address: yDetails?.address}
        });
        if (check?.corrected_address && (!mergedAddress || mergedAddress.length < 10)) {
          mergedAddress = check.corrected_address;
        }
        if (check?.is_valid === false) {
          // mark exclude – we’re not doing it here to keep this script idempotent
          // You can flip should_exclude later in a separate pass if desired.
        }
      }

      // 5) Compute after-club flag (>= HOURS_CUTOFF)
      let tags = [];
      try { tags = JSON.parse(v.vibe_tags); } catch { tags = []; }
      if (hours && computeAfterClubFlag(hours, HOURS_CUTOFF)) {
        if (!tags.includes('after-club')) tags.push('after-club');
      }

      // Prepare update values
      const newVibeTags = JSON.stringify([...new Set(tags)]);
      const hoursJson = hours ? JSON.stringify(hours) : null;
      const hasHours = hours ? 1 : (v.has_hours || 0);
      const placeIdToSave = gDetails?.place_id || null;
      const yelpIdToSave  = yDetails?.id || null;

      if (DRY) {
        log(`[dry] ${v.id} ${v.name} addr="${mergedAddress||''}" placeId=${placeIdToSave||''} yelp=${yelpIdToSave||''} hours=${!!hours}`);
      } else {
        upd.run(
          placeIdToSave,
          yelpIdToSave,
          mergedAddress || '',
          hoursJson,
          hasHours,
          newVibeTags,
          v.id
        );
        touched++;
      }
    } catch (e) {
      log(`[err] id=${v.id} ${v.name} -> ${e.message}`);
      await sleep(250);
    }
  }

  log(`[hours-backfill] done. touched=${touched} skipped=${skips} dry=${DRY}`);
  console.log(`[hours-backfill] done. touched=${touched} skipped=${skips} dry=${DRY}`);
})();
