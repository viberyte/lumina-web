#!/usr/bin/env python3
import sqlite3

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# List of obvious junk venue names (fragments, generic terms, etc.)
JUNK_VENUES = [
    'Brooklyn NY Age',
    'Bryant Park Hotel Sunday',
    'Cargo @ Dead Letter No. 9',
    'Cin Cin Lounge Ring',
    'Civilian Hotel Ring',
    'Common Country Midnight',
    'Houston Hall A Grand Beer Hall Celebration',
    'Jeromes Sunday',
    'Laissez Faire A Chic',
    'Magic Hour delivers the hottest amenities',
    'Manhattan NY US',
    'New Year',
    "New York's ultimate New Year's gala",
    'Pennsylvania',
    'Refinery Hotel Sunday',
    'Saint Step',
    'TBA - Brooklyn',
    'TBA - East Williamsburg',
    'TBA - Secret Bushwick Location',
    'Why Sony Hall NYE',
    'and their tickets will be refunded',
    'blends modern elegance with creative flair',
    'has a reputation for serving an A',
    'offers an over',
    'on the map',
    "providing all your New Year's needs",
    'will be imbued with an electrifying party energy',
    'Bar Sprezzatura Ring',
    'CIVILIAN Hotel Featuring Starchild Rooftop'
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== CLEANING UP JUNK VENUES ===\n")

deleted_count = 0
for junk_name in JUNK_VENUES:
    cursor.execute("DELETE FROM venues WHERE name = ?", (junk_name,))
    if cursor.rowcount > 0:
        print(f"🗑️  Deleted: {junk_name}")
        deleted_count += 1

conn.commit()

# Check remaining venues needing enrichment
cursor.execute("SELECT COUNT(*) FROM venues WHERE recheck_flag = 1")
remaining = cursor.fetchone()[0]

print(f"\n{'='*60}")
print(f"✅ Deleted {deleted_count} junk venues")
print(f"📊 Remaining venues needing enrichment: {remaining}")
print(f"\nThese {remaining} are REAL venues that failed Google Places lookup")
print(f"We can manually add their data or try alternative search methods")

conn.close()
