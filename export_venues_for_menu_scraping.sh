#!/bin/bash

echo "=== EXPORTING NY/NJ/PHILLY VENUES FOR MENU SCRAPING ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/venues_need_menus.csv
SELECT 
  id,
  name,
  category,
  website,
  city,
  address
FROM venues
WHERE category IN ('restaurant', 'lounge', 'cafe', 'bar')
  AND website IS NOT NULL
  AND menu_url IS NULL
  AND should_exclude = 0
  AND city IN (
    'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
    'North Jersey', 'South Jersey', 'Hoboken',
    'Philadelphia'
  )
ORDER BY city, id;
.output stdout
SQL

echo "✅ Exported to: /opt/viberyte/lumina-web/venues_need_menus.csv"
echo ""
echo "=== BREAKDOWN BY CITY ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  city,
  COUNT(*) as count
FROM venues
WHERE category IN ('restaurant', 'lounge', 'cafe', 'bar')
  AND website IS NOT NULL
  AND menu_url IS NULL
  AND should_exclude = 0
  AND city IN (
    'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
    'North Jersey', 'South Jersey', 'Hoboken',
    'Philadelphia'
  )
GROUP BY city
ORDER BY count DESC;
SQL

echo ""
echo "=== TOTAL VENUES TO SCRAPE ==="
wc -l /opt/viberyte/lumina-web/venues_need_menus.csv | awk '{print $1 - 1 " venues (excluding header)"}'
