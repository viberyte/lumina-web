#!/bin/bash

echo "=== INSTAGRAM LOCATION ID STATUS ==="

echo ""
echo "1. TOTAL COVERAGE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_venues,
  SUM(CASE WHEN instagram_location_id IS NOT NULL THEN 1 ELSE 0 END) as with_location_id,
  ROUND(100.0 * SUM(CASE WHEN instagram_location_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) || '%' as coverage
FROM venues
WHERE should_exclude = 0;
SQL

echo ""
echo "2. SAMPLE LOCATION IDS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT name, instagram_handle, instagram_location_id, instagram_location_name
FROM venues
WHERE instagram_location_id IS NOT NULL
AND should_exclude = 0
LIMIT 10;
SQL
