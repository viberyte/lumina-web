#!/usr/bin/env python3
import sqlite3
import json

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Load all posts
with open('all_location_posts.json', 'r') as f:
    posts = json.load(f)

print(f"=== SAVING CROWD PHOTOS TO DATABASE ===\n")
print(f"📦 Processing {len(posts)} customer posts\n")

# Create crowd_photos table
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS crowd_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER,
        instagram_post_id TEXT UNIQUE,
        instagram_location_id TEXT,
        image_url TEXT,
        thumbnail_url TEXT,
        posted_by_username TEXT,
        posted_by_user_id TEXT,
        caption TEXT,
        like_count INTEGER,
        comment_count INTEGER,
        posted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venue_id) REFERENCES venues(id)
    )
""")

print("✅ Created crowd_photos table\n")

# Insert photos
added = 0
skipped = 0

for post in posts:
    location_id = post.get('inputSource')
    post_id = post.get('id')
    image_url = post.get('displayUrl')
    
    # Get owner info
    owner = post.get('owner', {})
    username = owner.get('username')
    user_id = owner.get('id')
    
    caption = post.get('caption', '')
    likes = post.get('likeCount', 0)
    comments = post.get('commentCount', 0)
    posted_at = post.get('createdAt')
    
    # Find venue by location ID
    cursor.execute("""
        SELECT id FROM venues WHERE instagram_location_id = ?
    """, (location_id,))
    
    venue = cursor.fetchone()
    
    if venue and image_url:
        venue_id = venue[0]
        
        try:
            cursor.execute("""
                INSERT INTO crowd_photos (
                    venue_id, instagram_post_id, instagram_location_id,
                    image_url, posted_by_username, posted_by_user_id,
                    caption, like_count, comment_count, posted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                venue_id, post_id, location_id, image_url,
                username, user_id, caption, likes, comments, posted_at
            ))
            added += 1
        except sqlite3.IntegrityError:
            skipped += 1
    else:
        skipped += 1

conn.commit()

# Show stats
cursor.execute("""
    SELECT 
        COUNT(DISTINCT venue_id) as venues_with_photos,
        COUNT(*) as total_photos,
        AVG(like_count) as avg_likes
    FROM crowd_photos
""")

stats = cursor.fetchone()

conn.close()

print(f"{'='*60}")
print(f"=== COMPLETE ===")
print(f"✅ Added: {added} crowd photos")
print(f"⏭️  Skipped: {skipped} (duplicates/no match)")
print(f"\n📊 DATABASE STATS:")
print(f"   Venues with crowd photos: {stats[0]}")
print(f"   Total crowd photos: {stats[1]}")
print(f"   Average likes: {stats[2]:.1f}")
print(f"\n🎯 READY FOR MOBILE APP!")

