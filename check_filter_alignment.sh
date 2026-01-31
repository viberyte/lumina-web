#!/bin/bash

echo "=== CHECKING EXISTING VENUE TAGS ==="

echo ""
echo "1. MUSIC GENRES (existing in DB):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT DISTINCT music_genres 
FROM venues 
WHERE music_genres IS NOT NULL 
LIMIT 10;
SQL

echo ""
echo "2. VIBE TAGS (existing in DB):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT DISTINCT vibe_tags 
FROM venues 
WHERE vibe_tags IS NOT NULL 
LIMIT 10;
SQL

echo ""
echo "3. CATEGORIES (existing in DB):"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT category, COUNT(*) as count
FROM venues
WHERE should_exclude = 0
GROUP BY category
ORDER BY count DESC;
SQL

echo ""
echo "4. SAMPLE FULLY TAGGED VENUE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode json
SELECT 
  name, 
  primary_vibes, 
  mood_tags, 
  atmosphere_tags,
  music_genres,
  vibe_tags
FROM venues 
WHERE primary_vibes IS NOT NULL 
LIMIT 1;
SQL
