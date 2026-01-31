#!/usr/bin/env bash
set -euo pipefail

ROOT="/opt/viberyte"
WEB="$ROOT/lumina-web"
DB="$WEB/data/lumina.db"

echo "[pipeline] start: $(date -Is)"

# 1) Attempt scraper (skip quietly if file missing)
if [[ -f "$WEB/scripts/weekly-event-scraper.mjs" ]]; then
  echo "[pipeline] running weekly-event-scraper.mjs..."
  node "$WEB/scripts/weekly-event-scraper.mjs" || echo "[pipeline] scraper finished with non-zero exit (continuing)"
else
  echo "[pipeline] weekly-event-scraper.mjs not found — skipping scrape step"
fi

# 2) Ingest whatever event JSONs exist (newest first)
if [[ -f "$WEB/scripts/run-event-ingest.sh" ]]; then
  echo "[pipeline] ingesting events from JSON files..."
  bash "$WEB/scripts/run-event-ingest.sh"
else
  echo "[pipeline] run-event-ingest.sh not found — skipping ingest step"
fi

# 3) Normalize/standardize event dates in staging
if [[ -f "$WEB/scripts/normalize_event_dates.sql" ]]; then
  echo "[pipeline] normalizing event dates..."
  sqlite3 "$DB" < "$WEB/scripts/normalize_event_dates.sql" || echo "[pipeline] normalize SQL returned non-zero (continuing)"
else
  echo "[pipeline] normalize_event_dates.sql not found — skipping date normalization"
fi

# 4) Quick status
echo "[pipeline] staging snapshot:"
sqlite3 -cmd ".headers on" -cmd ".mode column" "$DB" "
SELECT
  COUNT(*) AS total_rows,
  SUM(date_iso GLOB '____-__-__') AS iso_dates,
  SUM(date_iso GLOB '____-__-__' AND date_iso >= date('now')) AS future_rows
FROM staging_events;
"

echo "[pipeline] done: $(date -Is)"
