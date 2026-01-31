#!/bin/bash

echo "=== ALL 436 VENUES MISSING INSTAGRAM ==="
echo ""

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  v.id, 
  v.name, 
  v.category,
  v.city,
  v.website,
  COUNT(e.id) as event_count
FROM venues v
LEFT JOIN events e ON e.venue_id = v.id
WHERE v.instagram_handle IS NULL
AND v.should_exclude = 0
AND v.city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
               'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
GROUP BY v.id
ORDER BY event_count DESC, v.name;
SQL
