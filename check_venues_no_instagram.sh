#!/bin/bash

echo "=== VENUES WITHOUT INSTAGRAM HANDLES ==="

echo ""
echo "1. OVERALL BREAKDOWN:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_no_instagram,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as have_website,
  SUM(CASE WHEN website IS NULL THEN 1 ELSE 0 END) as no_website
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "2. BREAKDOWN BY CATEGORY:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  category,
  COUNT(*) as no_instagram,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as have_website
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
GROUP BY category
ORDER BY no_instagram DESC;
SQL

echo ""
echo "3. SAMPLE VENUES WITH WEBSITES (but no Instagram):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, category, website
FROM venues
WHERE instagram_handle IS NULL
AND website IS NOT NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn')
LIMIT 10;
SQL
