#!/usr/bin/env python3
import sqlite3

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== MERGING DUPLICATES (FIXED) ===\n")

# Find duplicates
cursor.execute("""
    SELECT 
        LOWER(name) as name_lower,
        GROUP_CONCAT(id) as ids
    FROM venues
    WHERE should_exclude = 0
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
""")

duplicates = cursor.fetchall()
print(f"📊 Found {len(duplicates)} duplicate sets\n")

merged = 0
deleted = 0

for name_lower, ids_str in duplicates:
    ids = [int(x) for x in ids_str.split(',')]
    
    print(f"\n{'='*60}")
    print(f"{name_lower.title()} (IDs: {ids})")
    
    # Get records
    cursor.execute(f"""
        SELECT id, instagram_handle, website, enhancement_version
        FROM venues
        WHERE id IN ({','.join('?' * len(ids))})
    """, ids)
    
    records = cursor.fetchall()
    
    # Keep the one with AI tagging, or most data
    best = max(records, key=lambda r: (
        5 if r[3] else 0,  # enhancement_version
        3 if r[1] else 0,  # instagram_handle
        2 if r[2] else 0   # website
    ))
    
    keep_id = best[0]
    delete_ids = [r[0] for r in records if r[0] != keep_id]
    
    print(f"  ✅ KEEPING: {keep_id}")
    print(f"  🗑️  DELETING: {delete_ids}")
    
    # Move events
    for del_id in delete_ids:
        cursor.execute("UPDATE events SET venue_id = ? WHERE venue_id = ?", (keep_id, del_id))
        if cursor.rowcount > 0:
            print(f"  🔗 Moved {cursor.rowcount} events from {del_id}")
    
    # Delete (skip Instagram transfer to avoid UNIQUE conflict)
    cursor.execute(f"DELETE FROM venues WHERE id IN ({','.join('?' * len(delete_ids))})", delete_ids)
    
    merged += 1
    deleted += len(delete_ids)

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"✅ Merged: {merged} sets")
print(f"🗑️  Deleted: {deleted} duplicates")

