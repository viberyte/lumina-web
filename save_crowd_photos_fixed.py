#!/usr/bin/env python3
import sqlite3
import json

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

# Load all posts
with open('all_location_posts.json', 'r') as f:
    posts = json.load(f)

print(f"=== SAVING CROWD PHOTOS ===\n")
print(f"📦 Total posts: {len(posts)}\n")

# Create table
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS crowd_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER,
        instagram_post_id TEXT UNIQUE,
        instagram_location_id TEXT,
        image_url TEXT,
        posted_by_username TEXT,
        caption TEXT,
        like_count INTEGER,
        comment_count INTEGER,
        posted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venue_id) REFERENCES venues(id)
    )
""")

added = 0
skipped = 0

for post in posts:
    location_id = str(post.get('inputSource'))  # Convert to string
    post_id = post.get('id')
    
    # Get image from 'image' object
    image = post.get('image', {})
    image_url = image.get('url') if image else None
    
    owner = post.get('owner', {})
    username = owner.get('username')
    
    caption = post.get('caption', '')
    likes = post.get('likeCount', 0)
    comments = post.get('commentCount', 0)
    posted_at = post.get('createdAt')
    
    # Find venue
    cursor.execute("""
        SELECT id FROM venues WHERE instagram_location_id = ?
    """, (location_id,))
    
    venue = cursor.fetchone()
    
    if venue and image_url:
        try:
            cursor.execute("""
                INSERT INTO crowd_photos (
                    venue_id, instagram_post_id, instagram_location_id,
                    image_url, posted_by_username, caption, 
                    like_count, comment_count, posted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (venue[0], post_id, location_id, image_url, username, caption, likes, comments, posted_at))
            added += 1
        except sqlite3.IntegrityError:
            skipped += 1
    else:
        if not venue:
            print(f"⏭️  No venue for location {location_id}")
        skipped += 1

conn.commit()

# Stats
cursor.execute("""
    SELECT 
        COUNT(DISTINCT venue_id) as venues_with_photos,
        COUNT(*) as total_photos
    FROM crowd_photos
""")

stats = cursor.fetchone()

# Show venues with photos
cursor.execute("""
    SELECT v.name, COUNT(cp.id) as photo_count
    FROM venues v
    JOIN crowd_photos cp ON cp.venue_id = v.id
    GROUP BY v.id
    ORDER BY photo_count DESC
    LIMIT 10
""")

top_venues = cursor.fetchall()

conn.close()

print(f"\n{'='*60}")
print(f"✅ Added: {added} crowd photos")
print(f"⏭️  Skipped: {skipped}")
print(f"\n📊 STATS:")
print(f"   Venues with photos: {stats[0]}")
print(f"   Total photos: {stats[1]}")

print(f"\n🏆 TOP VENUES WITH CROWD PHOTOS:")
for name, count in top_venues:
    print(f"   {name}: {count} photos")

