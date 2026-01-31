#!/usr/bin/env python3
import json
import sqlite3

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Load posts
with open('all_location_posts.json', 'r') as f:
    posts = json.load(f)

print("=== DEBUGGING CROWD PHOTOS ===\n")

# Check first few posts
print("SAMPLE POSTS:")
for i, post in enumerate(posts[:3]):
    print(f"\nPost {i+1}:")
    print(f"  inputSource: {post.get('inputSource')}")
    print(f"  type: {post.get('type')}")
    print(f"  All keys: {list(post.keys())}")

# Check what location IDs are in database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT instagram_location_id, COUNT(*) 
    FROM venues 
    WHERE instagram_location_id IS NOT NULL 
    GROUP BY instagram_location_id 
    LIMIT 5
""")

print("\n\nSAMPLE VENUE LOCATION IDS:")
for row in cursor.fetchall():
    print(f"  {row[0]}")

# Try to match
post_location_ids = [p.get('inputSource') for p in posts if p.get('inputSource')]
print(f"\n\nUnique location IDs in posts: {len(set(post_location_ids))}")
print(f"Sample post location IDs: {list(set(post_location_ids))[:5]}")

# Check if any match
cursor.execute("""
    SELECT COUNT(*) FROM venues 
    WHERE instagram_location_id IN ({})
""".format(','.join('?' * len(set(post_location_ids)))), list(set(post_location_ids)))

matches = cursor.fetchone()[0]
print(f"\nMatching venues found: {matches}")

conn.close()

