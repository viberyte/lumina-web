#!/bin/bash

echo "=== UNIQUE VENUE NAMES IN EVENTS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT DISTINCT venue_name, city, COUNT(*) as event_count
FROM events
WHERE venue_name IS NOT NULL
GROUP BY venue_name, city
ORDER BY event_count DESC
LIMIT 30;
SQL

echo ""
echo "=== TOTAL UNIQUE EVENT VENUES ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(DISTINCT venue_name) 
FROM events 
WHERE venue_name IS NOT NULL;
SQL

echo ""
echo "=== CHECKING: Do these venues exist in our database? ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  e.venue_name as event_venue,
  e.city,
  COUNT(e.id) as event_count,
  CASE 
    WHEN v.id IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM events e
LEFT JOIN venues v ON e.venue_name = v.name AND e.city = v.city
WHERE e.venue_name IS NOT NULL
GROUP BY e.venue_name, e.city
ORDER BY event_count DESC
LIMIT 30;
SQL

echo ""
echo "=== HOW MANY VENUES ARE MISSING? ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as missing_venues
FROM (
  SELECT DISTINCT e.venue_name, e.city
  FROM events e
  LEFT JOIN venues v ON e.venue_name = v.name AND e.city = v.city
  WHERE e.venue_name IS NOT NULL AND v.id IS NULL
);
SQL
