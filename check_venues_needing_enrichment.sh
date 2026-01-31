#!/bin/bash

echo "=== VENUES NEEDING ENRICHMENT ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT COUNT(*) as total
FROM venues 
WHERE recheck_flag = 1;
SQL

echo ""
echo "=== SAMPLE 10 VENUES TO ENRICH ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode column
.headers on
SELECT id, name, city, category
FROM venues
WHERE recheck_flag = 1
LIMIT 10;
SQL

echo ""
echo "=== BREAKDOWN BY CITY ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT city, COUNT(*) as count
FROM venues
WHERE recheck_flag = 1
GROUP BY city
ORDER BY count DESC;
SQL
