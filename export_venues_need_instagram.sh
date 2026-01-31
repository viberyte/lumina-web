#!/bin/bash

echo "=== 588 VENUES NEEDING INSTAGRAM HANDLES ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/venues_need_instagram.csv
SELECT 
  id,
  name,
  city,
  address,
  website,
  category
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND category IN ('restaurant', 'nightclub', 'lounge', 'bar', 'live_music')
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
ORDER BY id;
.output stdout
SQL

echo "✅ Exported to: /opt/viberyte/lumina-web/venues_need_instagram.csv"

echo ""
echo "=== BREAKDOWN ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as with_website,
  SUM(CASE WHEN website IS NULL THEN 1 ELSE 0 END) as no_website
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND category IN ('restaurant', 'nightclub', 'lounge', 'bar', 'live_music')
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "=== SAMPLE 10 VENUES ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, website
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn')
LIMIT 10;
SQL
