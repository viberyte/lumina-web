#!/usr/bin/env python3
import sqlite3
from datetime import datetime

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== FIXING UNMATCHED EVENTS ===\n")

# 1. Create "Public Records" venue (real Brooklyn nightclub)
print("1️⃣ Creating Public Records venue...")
try:
    cursor.execute("""
        INSERT INTO venues (
            name, city, neighborhood, category, 
            music_genres, recheck_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?)
    """, (
        'Public Records',
        'New York',
        'Brooklyn',
        'nightclub',
        'House,Techno,Electronic',
        datetime.now().isoformat()
    ))
    public_records_id = cursor.lastrowid
    print(f"   ✅ Created Public Records (ID: {public_records_id})")
except sqlite3.IntegrityError:
    cursor.execute("SELECT id FROM venues WHERE name = 'Public Records' AND city = 'New York'")
    public_records_id = cursor.fetchone()[0]
    print(f"   ℹ️  Public Records already exists (ID: {public_records_id})")

# 2. Match "public records" events to the venue
cursor.execute("""
    UPDATE events
    SET venue_id = ?
    WHERE venue_name = 'public records' AND city = 'New York'
""", (public_records_id,))
matched = cursor.rowcount
print(f"   ✅ Matched {matched} events to Public Records\n")

# 3. Delete junk events
junk_venues = ['Venue TBA', 'preferences', 'New York NY US']
print("2️⃣ Deleting junk events...")
for venue in junk_venues:
    cursor.execute("DELETE FROM events WHERE venue_name = ?", (venue,))
    deleted = cursor.rowcount
    print(f"   🗑️  Deleted {deleted} events from '{venue}'")

conn.commit()

# 4. Final check
cursor.execute("SELECT COUNT(*) FROM events WHERE venue_id IS NULL")
remaining = cursor.fetchone()[0]

print(f"\n✅ CLEANUP COMPLETE")
print(f"   📊 Events without venues: {remaining}")

conn.close()
