/**
 * Weekly Event Scraper (hardened)
 * - Runs DICE, POSH, TAO, Instagram promoter scrapers.
 * - Tolerates noisy/non-JSON stdout (trims to first/last JSON token).
 * - Merges + dedupes events and writes a dated JSON file under data/events/.
 *
 * Run:
 *   node /opt/viberyte/lumina-web/scripts/weekly-event-scraper.js
 */

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const SCRAPERS = [
  {
    name: 'DICE',
    file: '/opt/viberyte/event-scraper/dice_scraper.js',
    args: [],
    shape: 'array',
  },
  {
    name: 'POSH',
    // Prefer current posh; fallback exists in old web repo too
    file: fs.existsSync('/opt/viberyte/scripts/posh-scraper.js')
      ? '/opt/viberyte/scripts/posh-scraper.js'
      : '/opt/viberyte/lumina-web-old-20251029/scripts/scrapers/posh-scraper.js',
    args: [],
    shape: 'array',
  },
  {
    name: 'TAO',
    file: '/opt/viberyte/lumina-telegram-bot/scripts/tao-events-scraper.js',
    args: [],
    shape: 'array',
  },
  {
    name: 'INSTAGRAM',
    file: '/opt/viberyte/lumina-telegram-bot/scripts/instagram-promoter-scraper.js',
    args: [],
    shape: 'array',
  },
];

function log(...a) {
  console.log('[weekly-event-scraper]', ...a);
}

function firstJsonSlice(s) {
  if (!s) return '';
  // Try array first
  let start = s.indexOf('[');
  let end = s.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(start, end + 1);
  }
  // Try object
  start = s.indexOf('{');
  end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(start, end + 1);
  }
  return '';
}

function tryParse(text, expectedShape='array') {
  try {
    return JSON.parse(text);
  } catch {
    const slice = firstJsonSlice(text);
    if (!slice) return expectedShape === 'array' ? [] : null;
    try {
      return JSON.parse(slice);
    } catch {
      return expectedShape === 'array' ? [] : null;
    }
  }
}

function normalizeDate(d) {
  if (!d) return null;
  // Accept ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  // e.g., "Sep 12, 2025"
  const m = Date.parse(d);
  if (!isNaN(m)) return new Date(m).toISOString().slice(0, 10);
  return null;
}

function trimStr(x) {
  return (x ?? '').toString().trim();
}

function normalizeEvent(e, source) {
  // Support different shapes but map to common fields
  const obj = typeof e === 'object' && e !== null ? e : {};

  const name = trimStr(obj.name || obj.title || obj.event || obj.EventName);
  const city = trimStr(obj.city || obj.locationCity || obj.City);
  const venue = trimStr(obj.venue || obj.venue_name || obj.Venue || obj.place);
  const dateRaw = trimStr(obj.date || obj.start_date || obj.Date);
  const time = trimStr(obj.time || obj.start_time || obj.Time);
  const image = trimStr(obj.image || obj.image_url || obj.cover || obj.flyer || obj.Image);
  const url = trimStr(obj.url || obj.ticket_url || obj.link || obj.Url);
  const price = trimStr(obj.price || obj.Price);
  const genre = trimStr(obj.genre || obj.music || obj.music_genre || obj.Genre);
  const neighborhood = trimStr(obj.neighborhood || obj.area || obj.Neighborhood);
  const desc = trimStr(obj.description || obj.caption || obj.Description);

  return {
    source,
    name,
    city,
    venue_name: venue,
    date: dateRaw || null,
    date_iso: normalizeDate(dateRaw),
    time: time || null,
    neighborhood: neighborhood || null,
    description: desc || null,
    music_genre: genre || null,
    price: price || null,
    ticket_url: url || null,
    image_url: image || null,
    tags: Array.isArray(obj.tags) ? obj.tags : (obj.tags ? [String(obj.tags)] : []),
  };
}

function dedupeEvents(list) {
  const seen = new Set();
  const out = [];
  for (const e of list) {
    const key = [
      e.source || '',
      (e.name || '').toLowerCase(),
      (e.venue_name || '').toLowerCase(),
      e.date_iso || e.date || '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

async function runNode(file, args = []) {
  return new Promise((resolve) => {
    if (!fs.existsSync(file)) {
      return resolve({ ok: false, stdout: '', stderr: `ENOENT: ${file}` });
    }
    const child = execFile('node', [file, ...args], { maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: stdout?.toString() || '', stderr: stderr?.toString() || '', err });
    });
  });
}

(async () => {
  try {
    log('Running scrapers...');
    const all = [];
    for (const s of SCRAPERS) {
      log(`Running ${s.name}...`);
      const res = await runNode(s.file, s.args);
      if (!res.ok) {
        log(`${s.name} ❌ failed: ${res.stderr.trim() || res.err?.message || 'unknown error'}`);
        continue;
      }
      const parsed = tryParse(res.stdout, s.shape);
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed?.events || parsed?.items || parsed?.data || []);
      const normed = arr.map((e) => normalizeEvent(e, s.name)).filter(x => x.name);
      log(`${s.name} ✓ got ${normed.length}`);
      all.push(...normed);
    }

    const merged = dedupeEvents(all);
    // Keep only events with at least a name + some date (raw or iso)
    const kept = merged.filter(e => e.name && (e.date_iso || e.date));

    const outDir = path.join('/opt/viberyte/lumina-web/data/events');
    await fsp.mkdir(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const outFile = path.join(outDir, `events-${stamp}.json`);

    await fsp.writeFile(outFile, JSON.stringify(kept, null, 2), 'utf8');

    log(`Done. Saved ${kept.length} events → ${outFile}`);
    // Also refresh a "latest" file for downstream ingestion
    const latest = path.join(outDir, 'events-latest.json');
    await fsp.writeFile(latest, JSON.stringify(kept, null, 2), 'utf8');
  } catch (e) {
    log('Fatal error:', e?.stack || e?.message || String(e));
    process.exitCode = 1;
  }
})();
