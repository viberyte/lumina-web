#!/bin/bash

echo "=== VERIFYING EVENT-SOURCED VENUES ==="

echo ""
echo "1. TOP EVENT VENUES (from events):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  v.id,
  v.name,
  v.city,
  COUNT(e.id) as event_count,
  v.enhancement_version
FROM venues v
JOIN events e ON e.venue_id = v.id
WHERE v.recheck_flag = 1 OR v.created_at > '2025-12-20'
GROUP BY v.id
ORDER BY event_count DESC
LIMIT 15;
SQL

echo ""
echo "2. ARE THEY BEING AI TAGGED?"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_new_venues,
  SUM(CASE WHEN enhancement_version = 'lumina-v2-master-schema' THEN 1 ELSE 0 END) as already_tagged,
  SUM(CASE WHEN enhancement_version IS NULL THEN 1 ELSE 0 END) as waiting_for_tag
FROM venues
WHERE created_at > '2025-12-20';
SQL
