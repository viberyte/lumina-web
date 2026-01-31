#!/bin/bash

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode list
SELECT website
FROM venues
WHERE instagram_handle IS NULL
AND website IS NOT NULL
AND should_exclude = 0
AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
             'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
ORDER BY website;
SQL
