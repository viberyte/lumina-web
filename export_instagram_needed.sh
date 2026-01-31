#!/bin/bash

echo "=== EXPORTING VENUES NEEDING INSTAGRAM ==="

# Export venues WITH websites
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/venues_no_ig_with_urls.csv
SELECT 
  id,
  name,
  category,
  city,
  website,
  address
FROM venues
WHERE instagram_handle IS NULL
AND website IS NOT NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
ORDER BY city, name;
.output stdout
SQL

# Export venues WITHOUT websites
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode csv
.headers on
.output /opt/viberyte/lumina-web/venues_no_ig_no_urls.csv
SELECT 
  id,
  name,
  category,
  city,
  address
FROM venues
WHERE instagram_handle IS NULL
AND website IS NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
ORDER BY city, name;
.output stdout
SQL

echo ""
echo "✅ EXPORTED:"
echo "   📄 venues_no_ig_with_urls.csv (490 venues WITH websites)"
echo "   📄 venues_no_ig_no_urls.csv (103 venues WITHOUT websites)"
echo ""

echo "=== FIRST 10 WITH URLS ==="
head -11 /opt/viberyte/lumina-web/venues_no_ig_with_urls.csv

echo ""
echo "=== FIRST 10 WITHOUT URLS ==="
head -11 /opt/viberyte/lumina-web/venues_no_ig_no_urls.csv

echo ""
echo "=== COUNTS ==="
echo "With URLs: $(wc -l < /opt/viberyte/lumina-web/venues_no_ig_with_urls.csv | awk '{print $1-1}')"
echo "No URLs: $(wc -l < /opt/viberyte/lumina-web/venues_no_ig_no_urls.csv | awk '{print $1-1}')"
