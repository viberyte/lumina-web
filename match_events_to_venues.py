#!/usr/bin/env python3
import sqlite3

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== MATCHING EVENTS TO VENUES ===\n")

# Update events with venue_id where name and city match
cursor.execute("""
    UPDATE events
    SET venue_id = (
        SELECT v.id 
        FROM venues v 
        WHERE v.name = events.venue_name 
        AND v.city = events.city
    )
    WHERE venue_id IS NULL
    AND venue_name IS NOT NULL
    AND EXISTS (
        SELECT 1 
        FROM venues v 
        WHERE v.name = events.venue_name 
        AND v.city = events.city
    )
""")

matched_count = cursor.rowcount
conn.commit()

print(f"✅ Matched {matched_count} events to venues\n")

# Check remaining unmatched
cursor.execute("""
    SELECT COUNT(*) 
    FROM events 
    WHERE venue_id IS NULL
""")
unmatched = cursor.fetchone()[0]

print(f"📊 SUMMARY:")
print(f"   ✅ Matched: {matched_count} events")
print(f"   ⚠️  Still unmatched: {unmatched} events")

if unmatched > 0:
    print(f"\n=== TOP 10 UNMATCHED EVENTS ===")
    cursor.execute("""
        SELECT venue_name, city, COUNT(*) as count
        FROM events
        WHERE venue_id IS NULL AND venue_name IS NOT NULL
        GROUP BY venue_name, city
        ORDER BY count DESC
        LIMIT 10
    """)
    
    for row in cursor.fetchall():
        print(f"   {row[0]} ({row[1]}) - {row[2]} events")

conn.close()

print("\n🎯 Next: Enrich the 456 new venues with Google Places API")
