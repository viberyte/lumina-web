#!/bin/bash

echo "=== AI TAGGING PROGRESS ==="

echo ""
echo "1. OVERALL PROGRESS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_venues,
  SUM(CASE WHEN enhancement_version = 'lumina-v2-master-schema' THEN 1 ELSE 0 END) as tagged,
  SUM(CASE WHEN enhancement_version IS NULL THEN 1 ELSE 0 END) as remaining
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "2. LAST TAGGED VENUE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, enhancement_version
FROM venues
WHERE enhancement_version = 'lumina-v2-master-schema'
ORDER BY id DESC
LIMIT 1;
SQL

echo ""
echo "3. WILL EVENT VENUES BE TAGGED?"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  'Event venues like Somewhere Nowhere' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES - In queue' ELSE 'NO - Not included' END as status
FROM venues
WHERE name = 'Somewhere Nowhere'
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL
