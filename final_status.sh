#!/bin/bash

echo "=== LUMINA DATABASE FINAL STATUS ==="

echo ""
echo "1. TOTAL VENUES:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as total_venues
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "2. INSTAGRAM COVERAGE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN instagram_handle IS NOT NULL THEN 1 ELSE 0 END) as with_instagram,
  ROUND(100.0 * SUM(CASE WHEN instagram_handle IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) || '%' as coverage
FROM venues
WHERE should_exclude = 0;
SQL

echo ""
echo "3. AI TAGGING:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN enhancement_version = 'lumina-v2-master-schema' THEN 1 ELSE 0 END) as ai_tagged,
  ROUND(100.0 * SUM(CASE WHEN enhancement_version = 'lumina-v2-master-schema' THEN 1 ELSE 0 END) / COUNT(*), 1) || '%' as tagged_percent
FROM venues
WHERE should_exclude = 0;
SQL

echo ""
echo "4. EVENTS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as total_events FROM events;
SQL

echo ""
echo "5. BREAKDOWN BY CITY:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT city, COUNT(*) as venues
FROM venues
WHERE should_exclude = 0
GROUP BY city
ORDER BY venues DESC;
SQL
