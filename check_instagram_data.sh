#!/bin/bash

echo "=== INSTAGRAM DATA STATUS ==="

echo ""
echo "1. VENUES WITH/WITHOUT INSTAGRAM:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(*) as total_venues,
  SUM(CASE WHEN instagram_handle IS NOT NULL THEN 1 ELSE 0 END) as has_handle,
  SUM(CASE WHEN instagram_location_id IS NOT NULL THEN 1 ELSE 0 END) as has_location_id,
  SUM(CASE WHEN instagram_tagged_posts IS NOT NULL THEN 1 ELSE 0 END) as has_crowd_photos
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL

echo ""
echo "2. SAMPLE VENUES WITH INSTAGRAM:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, instagram_handle
FROM venues
WHERE instagram_handle IS NOT NULL
AND city IN ('New York', 'Manhattan', 'Brooklyn')
LIMIT 10;
SQL

echo ""
echo "3. VENUES NEEDING INSTAGRAM DISCOVERY:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as need_instagram
FROM venues
WHERE instagram_handle IS NULL
AND should_exclude = 0
AND category IN ('restaurant', 'nightclub', 'lounge', 'bar', 'live_music')
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia');
SQL
