#!/bin/bash

echo "=== NY/NJ MENU STATUS ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  city,
  COUNT(*) as total_restaurants,
  SUM(CASE WHEN menu_url IS NOT NULL THEN 1 ELSE 0 END) as with_menu,
  SUM(CASE WHEN menu_url IS NULL THEN 1 ELSE 0 END) as without_menu,
  SUM(CASE WHEN website IS NULL THEN 1 ELSE 0 END) as no_website
FROM venues
WHERE category IN ('restaurant', 'lounge', 'cafe', 'bar')
  AND should_exclude = 0
  AND city IN (
    'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
    'North Jersey', 'South Jersey', 'Hoboken'
  )
GROUP BY city
ORDER BY total_restaurants DESC;
SQL

echo ""
echo "=== SAMPLE NY/NJ VENUES NEEDING MENUS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, website, menu_url
FROM venues
WHERE category IN ('restaurant', 'lounge')
  AND should_exclude = 0
  AND city IN ('New York', 'Manhattan', 'Brooklyn', 'North Jersey')
  AND website IS NOT NULL
  AND menu_url IS NULL
LIMIT 10;
SQL
