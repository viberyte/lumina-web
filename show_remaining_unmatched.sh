#!/bin/bash

echo "=== REMAINING 3 UNMATCHED EVENTS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode json
SELECT * FROM events WHERE venue_id IS NULL;
SQL

echo ""
echo ""
echo "=== SUMMARY ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  'Total events' as metric, COUNT(*) as count FROM events
UNION ALL
SELECT 
  'Events with venues' as metric, COUNT(*) as count FROM events WHERE venue_id IS NOT NULL
UNION ALL
SELECT 
  'Events without venues' as metric, COUNT(*) as count FROM events WHERE venue_id IS NULL;
SQL
