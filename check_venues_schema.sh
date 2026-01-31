#!/bin/bash

echo "=== VENUES TABLE SCHEMA ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db ".schema venues"

echo ""
echo "=== VENUES TABLE COLUMNS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "PRAGMA table_info(venues);"
