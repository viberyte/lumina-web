#!/bin/bash

echo "=== CHECKING FOR DUPLICATE VENUES ==="

echo ""
echo "1. DO VENUE NAMES APPEAR TWICE?"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  name,
  COUNT(*) as count,
  GROUP_CONCAT(id) as venue_ids,
  GROUP_CONCAT(instagram_handle) as handles
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
GROUP BY LOWER(name)
HAVING COUNT(*) > 1
LIMIT 20;
SQL

echo ""
echo "2. CHECK SPECIFIC EXAMPLE - 'Somewhere Nowhere':"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, instagram_handle, website
FROM venues
WHERE name LIKE '%Somewhere Nowhere%'
AND should_exclude = 0;
SQL

echo ""
echo "3. TOTAL UNIQUE VS TOTAL RECORDS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT LOWER(name)) as unique_names,
  COUNT(*) - COUNT(DISTINCT LOWER(name)) as potential_duplicates
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL
