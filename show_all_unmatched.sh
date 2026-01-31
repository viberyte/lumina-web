#!/bin/bash

echo "=== ALL 84 UNMATCHED EVENTS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  venue_name, 
  city, 
  COUNT(*) as event_count,
  GROUP_CONCAT(name, ' | ') as event_names
FROM events
WHERE venue_id IS NULL AND venue_name IS NOT NULL
GROUP BY venue_name, city
ORDER BY event_count DESC;
SQL

echo ""
echo "=== TOTAL UNMATCHED ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) FROM events WHERE venue_id IS NULL;
SQL
