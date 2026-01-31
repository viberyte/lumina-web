#!/usr/bin/env bash
set -euo pipefail

DB="/opt/viberyte/lumina-web/data/lumina.db"
ING="/opt/viberyte/lumina-web/scripts/event_ingest_any.mjs"

# Collect candidate JSONs (newest first)
mapfile -t FILES < <( \
  find /opt/viberyte -type f -name "*event*.json" -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr \
  | awk '{ $1=""; sub(/^ /,""); print }' \
)

echo "[runner] found \${#FILES[@]} event JSON file(s)"
if (( \${#FILES[@]} == 0 )); then
  echo "[runner] nothing to ingest"
  exit 0
fi

# Ingest in batches to avoid overly long argv
BATCH=50
i=0
while (( i < \${#FILES[@]} )); do
  batch=( "\${FILES[@]:i:BATCH}" )
  echo "[runner] ingesting \${#batch[@]} file(s)..."
  node "\$ING" "\${batch[@]}"
  (( i += BATCH ))
done

echo "[runner] staging counts:"
sqlite3 -cmd ".headers on" -cmd ".mode column" "\$DB" "
SELECT
  COUNT(*)                                           AS total_rows,
  SUM(date_iso GLOB '____-__-__')                   AS with_iso,
  SUM(date_iso GLOB '____-__-__' AND date_iso>=date('now')) AS future_rows
FROM staging_events;
"
