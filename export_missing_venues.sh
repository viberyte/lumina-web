#!/bin/bash

echo "=== EXPORTING MISSING VENUES TO CSV ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/missing_venues.csv
SELECT DISTINCT 
  e.venue_name,
  e.city,
  e.neighborhood,
  COUNT(e.id) as event_count,
  GROUP_CONCAT(DISTINCT e.music_genre) as music_genres
FROM events e
LEFT JOIN venues v ON e.venue_name = v.name AND e.city = v.city
WHERE e.venue_name IS NOT NULL AND v.id IS NULL
GROUP BY e.venue_name, e.city, e.neighborhood
ORDER BY event_count DESC;
.output stdout
SQL

echo ""
echo "✅ Exported to: /opt/viberyte/lumina-web/missing_venues.csv"
echo ""
echo "=== FIRST 10 ROWS ==="
head -11 /opt/viberyte/lumina-web/missing_venues.csv
