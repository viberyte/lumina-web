#!/bin/bash

echo "=== FINAL INSTAGRAM STATUS ==="

echo ""
echo "1. OVERALL COVERAGE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_venues,
  SUM(CASE WHEN instagram_handle IS NOT NULL THEN 1 ELSE 0 END) as has_instagram,
  SUM(CASE WHEN instagram_handle IS NULL THEN 1 ELSE 0 END) as missing_instagram,
  ROUND(100.0 * SUM(CASE WHEN instagram_handle IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as coverage_percent
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "2. STILL NEED INSTAGRAM:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  category,
  COUNT(*) as still_missing
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
GROUP BY category
ORDER BY still_missing DESC;
SQL

echo ""
echo "3. TOP VENUES STILL MISSING INSTAGRAM:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT v.id, v.name, v.category, COUNT(e.id) as event_count
FROM venues v
LEFT JOIN events e ON e.venue_id = v.id
WHERE v.instagram_handle IS NULL
AND v.should_exclude = 0
GROUP BY v.id
ORDER BY event_count DESC
LIMIT 15;
SQL
