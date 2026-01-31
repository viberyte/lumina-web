#!/bin/bash

echo "=== SAVING DUPLICATE LIST FOR LATER MERGE ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/duplicates_to_merge.csv
SELECT 
    LOWER(name) as name_lower,
    GROUP_CONCAT(id) as ids,
    GROUP_CONCAT(instagram_handle) as instagram_handles,
    COUNT(*) as count
FROM venues
WHERE should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;
.output stdout
SQL

echo "✅ Saved to: duplicates_to_merge.csv"
echo "   Will merge after AI tagging completes"
echo ""
echo "📋 For now, continuing with Instagram scraping..."
echo "   We'll skip duplicate IDs and use the ones with existing data"
