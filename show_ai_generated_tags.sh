#!/bin/bash

echo "=== AI-GENERATED TAGS ANALYSIS ==="

echo ""
echo "1. SAMPLE 20 VENUES WITH AI TAGS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT 
  name,
  category,
  primary_vibes,
  energy_level,
  dress_code,
  known_for
FROM venues
WHERE enhancement_version = 'lumina-v1'
LIMIT 20;
SQL

echo ""
echo ""
echo "2. UNIQUE PRIMARY VIBES GENERATED:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT DISTINCT primary_vibes
FROM venues
WHERE primary_vibes IS NOT NULL
AND enhancement_version = 'lumina-v1'
LIMIT 30;
SQL

echo ""
echo ""
echo "3. UNIQUE ENERGY LEVELS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT energy_level, COUNT(*) as count
FROM venues
WHERE enhancement_version = 'lumina-v1'
GROUP BY energy_level;
SQL

echo ""
echo ""
echo "4. DRESS CODES:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT dress_code, COUNT(*) as count
FROM venues
WHERE enhancement_version = 'lumina-v1'
GROUP BY dress_code;
SQL

echo ""
echo ""
echo "5. HOW MANY VENUES GOT TAGGED:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as tagged_venues
FROM venues
WHERE enhancement_version = 'lumina-v1';
SQL
