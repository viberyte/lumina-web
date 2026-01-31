#!/bin/bash

echo "=== 56 VENUES THAT FAILED ENRICHMENT ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, category
FROM venues
WHERE recheck_flag = 1
ORDER BY name;
SQL

echo ""
echo "=== COUNT BY CATEGORY ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT category, COUNT(*) as count
FROM venues
WHERE recheck_flag = 1
GROUP BY category;
SQL
