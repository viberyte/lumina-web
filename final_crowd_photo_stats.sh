#!/bin/bash

echo "=== FINAL CROWD PHOTO STATISTICS ==="

echo ""
echo "1. TOP 20 VENUES WITH MOST CROWD PHOTOS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  v.name,
  v.city,
  COUNT(cp.id) as photos,
  ROUND(AVG(cp.like_count), 1) as avg_likes
FROM venues v
JOIN crowd_photos cp ON cp.venue_id = v.id
GROUP BY v.id
ORDER BY photos DESC
LIMIT 20;
SQL

echo ""
echo "2. OVERALL STATS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  COUNT(DISTINCT venue_id) as venues_with_photos,
  COUNT(*) as total_photos,
  ROUND(AVG(like_count), 1) as avg_likes,
  MAX(like_count) as most_liked_post,
  ROUND(AVG(comment_count), 1) as avg_comments
FROM crowd_photos;
SQL

echo ""
echo "3. DISTRIBUTION BY CITY:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  v.city,
  COUNT(DISTINCT v.id) as venues_with_photos,
  COUNT(cp.id) as total_photos,
  ROUND(AVG(cp.like_count), 1) as avg_likes
FROM venues v
JOIN crowd_photos cp ON cp.venue_id = v.id
GROUP BY v.city
ORDER BY total_photos DESC;
SQL
