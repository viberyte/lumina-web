#!/bin/bash

echo "=== VENUES THAT NEED MENU SCRAPING ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  category,
  COUNT(*) as count,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as with_website
FROM venues
WHERE category IN ('restaurant', 'lounge', 'cafe', 'bar')
  AND should_exclude = 0
GROUP BY category
ORDER BY count DESC;
SQL

echo ""
echo "=== TOTAL VENUES NEEDING MENUS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_venues,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as with_website,
  SUM(CASE WHEN menu_url IS NOT NULL THEN 1 ELSE 0 END) as already_have_menu
FROM venues
WHERE category IN ('restaurant', 'lounge', 'cafe', 'bar')
  AND should_exclude = 0;
SQL

echo ""
echo "=== SAMPLE 10 RESTAURANTS WITH WEBSITES ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, category, website
FROM venues
WHERE category IN ('restaurant', 'lounge')
  AND website IS NOT NULL
  AND menu_url IS NULL
  AND should_exclude = 0
LIMIT 10;
SQL
