#!/bin/bash

echo "=== ADDING INSTAGRAM LOCATION COLUMNS ==="

sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
ALTER TABLE venues ADD COLUMN instagram_location_id TEXT;
ALTER TABLE venues ADD COLUMN instagram_location_name TEXT;
SQL

echo "✅ Columns added!"
