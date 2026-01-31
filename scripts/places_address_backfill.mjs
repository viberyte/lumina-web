#!/usr/bin/env node
/**
 * Backfill blank `address` fields on `venues` using Google Places.
 * - Only touches rows where address is blank and should_exclude = 0
 * - Safe to re-run; it skips rows that already have an address
 * - Honors --limit and --dryRun flags
 *
 * Usage:
 *   node /opt/viberyte/lumina-web/scripts/places_address_backfill.mjs --limit=5000 --dryRun=false
 *
 * Requires env:
 *   GOOGLE_PLACES_API_KEY
 */

import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import { setTimeout as sleep } from 'timers/promises';

const DB_PATH = process.env.LUMINA_DB || '/opt/viberyte/lumina-web/data/lumina.db';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;

const LIMIT =
  Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '5000');
const DRY =
  process.argv.find(a => a.startsWith('--dryRun='))?.split('=')[1] === 'true';

if (!GOOGLE_KEY) {
  console.error('[address-backfill] Missing GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const pickQuery = db.prepare(`
  SELECT id, name, city, neighborhood
  FROM venues
  WHERE COALESCE(should_exclude,0)=0
    AND COALESCE(TRIM(address),'')=''
  LIMIT ?;
`);

const setAddress = db.prepare(`UPDATE venues SET address = ? WHERE id = ?`);
const tx = db.transaction((rows) => {
  for (const r of rows) setAddress.run(r.address, r.id);
});

function buildQuery(name, city, hood) {
  const bits = [];
  if (name) bits.push(String(name));
  if (hood) bits.push(String(hood));
  if (city) bits.push(String(city));
  // Light location bias — safe and generic
  bits.push('USA');
  return bits.filter(Boolean).join(' ');
}

async function textSearch(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('key', GOOGLE_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TextSearch HTTP ${res.status}`);
  return res.json();
}

async function details(place_id) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', place_id);
  url.searchParams.set('fields', 'formatted_address');
  url.searchParams.set('key', GOOGLE_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Details HTTP ${res.status}`);
  return res.json();
}

async function resolveAddress(row) {
  const q = buildQuery(row.name, row.city, row.neighborhood);
  const ts = await textSearch(q);
  const cand = ts.results?.[0];
  if (!cand?.place_id) return null;
  const det = await details(cand.place_id);
  const addr = det.result?.formatted_address?.trim();
  return addr || null;
}

(async () => {
  const candidates = pickQuery.all(LIMIT);
  console.log(`[address-backfill] Candidates: ${candidates.length}  limit=${LIMIT}  dryRun=${DRY}`);

  let ok = 0, miss = 0, err = 0;
  const updates = [];

  for (const r of candidates) {
    try {
      const addr = await resolveAddress(r);
      if (addr) {
        console.log(`[address-backfill] + ${r.name} (${r.city || ''}) -> ${addr}`);
        if (!DRY) updates.push({ id: r.id, address: addr });
        ok++;
      } else {
        console.log(`[address-backfill] ~ no match: ${r.name} (${r.city || ''})`);
        miss++;
      }
    } catch (e) {
      console.log(`[address-backfill] ! error: ${r.name} (${r.city || ''}) -> ${String(e.message || e)}`);
      err++;
    }

    // Gentle pacing for API
    await sleep(150);
  }

  if (!DRY && updates.length) {
    tx(updates);
  }

  console.log(`[address-backfill] done. ok=${ok} miss=${miss} err=${err} wrote=${DRY ? 0 : updates.length}`);
  process.exit(0);
})().catch(e => {
  console.error('[address-backfill] fatal:', e);
  process.exit(1);
});
