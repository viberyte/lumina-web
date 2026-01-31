#!/usr/bin/env python3
import sqlite3
import json
from collections import Counter

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Load results
with open('instagram_location_ids_batch1.json', 'r') as f:
    results = json.load(f)

print("=== EXTRACTING INSTAGRAM LOCATION IDS ===\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

updated = 0
no_location = 0

for result in results:
    username = result.get('username')
    posts = result.get('latestPosts', [])
    
    # Extract all location IDs from posts
    location_ids = []
    location_names = []
    
    for post in posts:
        loc_id = post.get('locationId')
        loc_name = post.get('locationName')
        
        if loc_id:
            location_ids.append(loc_id)
            if loc_name:
                location_names.append(loc_name)
    
    if location_ids:
        # Use most common location ID (venues tag themselves consistently)
        most_common_id = Counter(location_ids).most_common(1)[0][0]
        most_common_name = Counter(location_names).most_common(1)[0][0] if location_names else None
        
        # Update database
        cursor.execute("""
            UPDATE venues
            SET instagram_location_id = ?,
                instagram_location_name = ?
            WHERE instagram_handle = ?
        """, (most_common_id, most_common_name, username))
        
        if cursor.rowcount > 0:
            print(f"✅ @{username} → {most_common_id} ({most_common_name})")
            updated += 1
        else:
            print(f"⏭️  @{username} - not in database")
    else:
        no_location += 1

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== BATCH 1 COMPLETE ===")
print(f"✅ Updated: {updated}")
print(f"❌ No location: {no_location}")
print(f"\n🔄 Ready to process 7 more batches!")

