#!/usr/bin/env python3
"""
Finish scraping remaining venues for crowd photos
"""

import os
import json
import sqlite3
import time
import sys
from datetime import datetime
from apify_client import ApifyClient

# Configuration
APIFY_TOKEN = os.environ.get('APIFY_TOKEN')
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
OUTPUT_DIR = '/opt/viberyte/lumina-web'
POSTS_PER_LOCATION = 25
BATCH_SIZE = 50
WAIT_BETWEEN_BATCHES = 30

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_venues_needing_photos(conn):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, instagram_location_id, city
        FROM venues 
        WHERE instagram_location_id IS NOT NULL 
        AND instagram_location_id != ''
        AND id NOT IN (SELECT DISTINCT venue_id FROM crowd_photos)
        ORDER BY city, name
    """)
    return cursor.fetchall()

def scrape_batch_locations(client, location_ids):
    run_input = {
        "locationIds": location_ids,
        "resultsLimit": POSTS_PER_LOCATION,
        "resultsType": "posts"
    }
    
    try:
        run = client.actor("apidojo/instagram-location-scraper").call(run_input=run_input)
        run_id = run.get('id', 'unknown')
        print(f"⏳ Apify run: {run_id}")
        
        sys.stdout.write("⏳ Running... ")
        sys.stdout.flush()
        
        while True:
            run_info = client.run(run_id).get()
            status = run_info.get('status')
            
            if status in ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']:
                break
            
            sys.stdout.write(".")
            sys.stdout.flush()
            time.sleep(2)
        
        print()
        
        if status != 'SUCCEEDED':
            print(f"❌ Run failed with status: {status}")
            return []
        
        print("✅ Complete!")
        
        posts = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            posts.append(item)
        
        return posts
    
    except Exception as e:
        print(f"\n❌ Error scraping batch: {e}")
        return []

def save_posts_to_db(conn, venues_map, posts):
    cursor = conn.cursor()
    saved_count = 0
    
    for post in posts:
        try:
            location_id = post.get('locationId') or post.get('location', {}).get('id')
            
            if not location_id or str(location_id) not in venues_map:
                continue
            
            venue_id = venues_map[str(location_id)]
            
            post_id = post.get('id') or post.get('shortCode')
            image_url = post.get('displayUrl') or post.get('imageUrl')
            username = post.get('ownerUsername') or post.get('owner', {}).get('username')
            caption = post.get('caption', '')
            like_count = post.get('likesCount', 0)
            comment_count = post.get('commentsCount', 0)
            posted_at = post.get('timestamp') or post.get('takenAtTimestamp')
            
            if not post_id or not image_url:
                continue
            
            if isinstance(posted_at, int):
                posted_at = datetime.fromtimestamp(posted_at).isoformat()
            
            cursor.execute("""
                INSERT OR IGNORE INTO crowd_photos 
                (venue_id, instagram_post_id, instagram_location_id, image_url, 
                 posted_by_username, caption, like_count, comment_count, posted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                venue_id,
                str(post_id),
                str(location_id),
                image_url,
                username,
                caption[:500] if caption else None,
                like_count,
                comment_count,
                posted_at
            ))
            
            if cursor.rowcount > 0:
                saved_count += 1
                
        except Exception as e:
            continue
    
    conn.commit()
    return saved_count

def main():
    if not APIFY_TOKEN:
        print("❌ ERROR: APIFY_TOKEN environment variable not set")
        return
    
    client = ApifyClient(APIFY_TOKEN)
    conn = get_db_connection()
    
    venues_to_scrape = get_venues_needing_photos(conn)
    
    print("=" * 60)
    print("🎯 FINISHING CROWD PHOTO SCRAPE")
    print("=" * 60)
    print(f"Venues remaining: {len(venues_to_scrape)}")
    print("=" * 60)
    
    total_batches = (len(venues_to_scrape) + BATCH_SIZE - 1) // BATCH_SIZE
    total_new_photos = 0
    
    for batch_num in range(total_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, len(venues_to_scrape))
        batch_venues = venues_to_scrape[start_idx:end_idx]
        
        print()
        print("=" * 60)
        print(f"BATCH {batch_num + 1}/{total_batches}: Locations {start_idx + 1}-{end_idx}")
        print("=" * 60)
        print()
        
        location_ids = []
        venues_map = {}
        
        for venue in batch_venues:
            loc_id = str(venue['instagram_location_id'])
            location_ids.append(loc_id)
            venues_map[loc_id] = venue['id']
        
        print(f"Scraping {len(location_ids)} locations...")
        
        posts = scrape_batch_locations(client, location_ids)
        
        if posts:
            print(f"📦 Got {len(posts)} posts")
            saved = save_posts_to_db(conn, venues_map, posts)
            total_new_photos += saved
            print(f"✅ Saved {saved} photos to database")
            print(f"🎯 Total new photos: {total_new_photos}")
        else:
            print("⚠️ No posts retrieved")
        
        if batch_num < total_batches - 1:
            print(f"⏳ Waiting {WAIT_BETWEEN_BATCHES} seconds...")
            time.sleep(WAIT_BETWEEN_BATCHES)
    
    conn.close()
    
    print()
    print("=" * 60)
    print("✅ SCRAPING COMPLETE")
    print(f"📊 Total new photos saved: {total_new_photos}")
    print("=" * 60)

if __name__ == "__main__":
    main()
