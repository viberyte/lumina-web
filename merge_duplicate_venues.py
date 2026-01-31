#!/usr/bin/env python3
import sqlite3
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Wait for AI tagging to finish (check if DB is locked)
max_retries = 3
for attempt in range(max_retries):
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        cursor = conn.cursor()
        break
    except sqlite3.OperationalError:
        if attempt < max_retries - 1:
            print(f"⏳ Database locked, waiting 5 seconds...")
            time.sleep(5)
        else:
            print("❌ Database locked - AI tagging still running")
            print("   Run this script after AI tagging completes")
            exit(1)

print("=== MERGING DUPLICATE VENUES ===\n")

# Find duplicates
cursor.execute("""
    SELECT 
        LOWER(name) as name_lower,
        GROUP_CONCAT(id) as ids,
        COUNT(*) as count
    FROM venues
    WHERE should_exclude = 0
    AND city IN ('New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
                 'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia')
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
""")

duplicates = cursor.fetchall()

print(f"📊 Found {len(duplicates)} duplicate venue names\n")

merged = 0
deleted = 0

for name_lower, ids_str, count in duplicates:
    ids = [int(x) for x in ids_str.split(',')]
    
    print(f"\n{'='*60}")
    print(f"Duplicate: {name_lower.title()} (IDs: {ids})")
    
    # Get full records
    cursor.execute(f"""
        SELECT 
            id, name, instagram_handle, website, address, 
            google_place_id, yelp_id, enhancement_version
        FROM venues
        WHERE id IN ({','.join('?' * len(ids))})
    """, ids)
    
    records = cursor.fetchall()
    
    # Find the "best" record (most data)
    best_record = None
    best_score = -1
    
    for record in records:
        record_id, name, ig, website, address, google_id, yelp_id, enhanced = record
        
        # Score based on data completeness
        score = 0
        if ig: score += 3
        if website: score += 2
        if address: score += 2
        if google_id: score += 2
        if yelp_id: score += 1
        if enhanced: score += 5
        
        print(f"  ID {record_id}: score={score} | IG={ig or 'None'} | enhanced={enhanced or 'None'}")
        
        if score > best_score:
            best_score = score
            best_record = record
    
    keep_id = best_record[0]
    delete_ids = [x for x in ids if x != keep_id]
    
    print(f"  ✅ KEEPING: ID {keep_id}")
    print(f"  🗑️  DELETING: {delete_ids}")
    
    # Merge Instagram handles if needed
    for record in records:
        if record[0] != keep_id and record[2]:  # Has Instagram handle
            print(f"  📸 Transferring Instagram: {record[2]}")
            cursor.execute("""
                UPDATE venues
                SET instagram_handle = ?
                WHERE id = ? AND instagram_handle IS NULL
            """, (record[2], keep_id))
    
    # Update events to point to surviving venue
    for delete_id in delete_ids:
        cursor.execute("""
            UPDATE events
            SET venue_id = ?
            WHERE venue_id = ?
        """, (keep_id, delete_id))
        
        updated_events = cursor.rowcount
        if updated_events > 0:
            print(f"  🔗 Moved {updated_events} events from ID {delete_id} to {keep_id}")
    
    # Delete duplicates
    cursor.execute(f"""
        DELETE FROM venues
        WHERE id IN ({','.join('?' * len(delete_ids))})
    """, delete_ids)
    
    merged += 1
    deleted += len(delete_ids)

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== MERGE COMPLETE ===")
print(f"✅ Merged: {merged} duplicate sets")
print(f"🗑️  Deleted: {deleted} duplicate records")
print(f"\n🎯 Now ready for Instagram scraping!")
