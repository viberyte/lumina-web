#!/bin/bash

echo "=== VENUES WITHOUT CROWD PHOTOS ==="

echo ""
echo "Total missing: 798 venues (1,491 - 693 = 798)"

echo ""
echo "TOP 30 MISSING BY EVENT COUNT (Most Important):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  v.name,
  v.city,
  v.category,
  v.instagram_handle,
  COUNT(e.id) as event_count
FROM venues v
LEFT JOIN events e ON e.venue_id = v.id
WHERE v.id NOT IN (SELECT DISTINCT venue_id FROM crowd_photos)
AND v.should_exclude = 0
AND v.instagram_handle IS NOT NULL
GROUP BY v.id
ORDER BY event_count DESC, v.name
LIMIT 30;
SQL

echo ""
echo "BREAKDOWN BY CITY:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  v.city,
  COUNT(v.id) as missing_crowd_photos
FROM venues v
WHERE v.id NOT IN (SELECT DISTINCT venue_id FROM crowd_photos)
AND v.should_exclude = 0
GROUP BY v.city
ORDER BY missing_crowd_photos DESC;
SQL

echo ""
echo "VENUES WITH LOCATION IDS BUT NO PHOTOS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as count
FROM venues
WHERE instagram_location_id IS NOT NULL
AND id NOT IN (SELECT DISTINCT venue_id FROM crowd_photos)
AND should_exclude = 0;
SQL

