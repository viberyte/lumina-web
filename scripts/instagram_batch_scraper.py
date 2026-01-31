#!/usr/bin/env python3
"""
Instagram Batch Post Scraper for Lumina
Scrapes in batches of 50 to avoid rate limits
"""

import os
import json
import sqlite3
import requests
import time
from datetime import datetime

# Configuration
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
POSTS_PER_VENUE = 15
BATCH_SIZE = 50

def get_venues_with_instagram():
    """Get all venues with Instagram handles"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""
        SELECT id, name, instagram_handle 
        FROM venues 
        WHERE instagram_handle IS NOT NULL 
        AND instagram_handle != ''
    """)
    
    venues = c.fetchall()
    conn.close()
    
    return venues

def run_batch_scraper(batch_handles, batch_num, total_batches):
    """Run Apify scraper for a batch of handles"""
    
    print(f"\n{'='*60}")
    print(f"📦 BATCH {batch_num}/{total_batches} - {len(batch_handles)} venues")
    print(f"{'='*60}")
    
    # Build direct URLs
    direct_urls = [f"https://www.instagram.com/{handle}/" for handle in batch_handles]
    
    url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"
    
    payload = {
        "directUrls": direct_urls,
        "resultsType": "posts",
        "resultsLimit": POSTS_PER_VENUE,
        "searchLimit": 1,
        "addParentData": True
    }
    
    headers = {"Content-Type": "application/json"}
    
    # Start the run
    response = requests.post(
        url,
        json=payload,
        headers=headers,
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed: {response.text}")
        return []
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Run ID: {run_id}")
    
    # Wait for completion
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_resp.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print("✅ Batch complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"❌ Batch {status}")
            return []
        
        print(f"⏳ {status}...", end='\r')
        time.sleep(3)
    
    # Fetch results
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY, "format": "json"}
    )
    
    if results_resp.status_code != 200:
        print(f"❌ Failed to fetch: {results_resp.text}")
        return []
    
    posts = results_resp.json()
    print(f"📸 Downloaded {len(posts)} posts")
    
    return posts

def save_posts_to_db(posts, venue_map):
    """Save posts to database"""
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Create table if not exists
    c.execute("""
        CREATE TABLE IF NOT EXISTS instagram_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id INTEGER,
            post_url TEXT UNIQUE,
            web_view_url TEXT,
            media_type TEXT,
            caption TEXT,
            likes INTEGER,
            comments INTEGER,
            timestamp TEXT,
            thumbnail_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venue_id) REFERENCES venues(id)
        )
    """)
    
    saved = 0
    
    for post in posts:
        try:
            owner_username = post.get('ownerUsername', '')
            venue_id = venue_map.get(owner_username)
            
            if not venue_id:
                continue
            
            post_url = post.get('url', '')
            shortcode = post.get('shortCode', '')
            web_view_url = f"https://www.instagram.com/p/{shortcode}/embed/"
            
            if post.get('type') == 'Video':
                media_type = 'video'
            elif post.get('type') == 'Sidecar':
                media_type = 'carousel'
            else:
                media_type = 'photo'
            
            caption = post.get('caption', '')
            likes = post.get('likesCount', 0)
            comments = post.get('commentsCount', 0)
            timestamp = post.get('timestamp', '')
            thumbnail_url = post.get('displayUrl', '')
            
            c.execute("""
                INSERT OR IGNORE INTO instagram_posts 
                (venue_id, post_url, web_view_url, media_type, caption, 
                 likes, comments, timestamp, thumbnail_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (venue_id, post_url, web_view_url, media_type, caption,
                  likes, comments, timestamp, thumbnail_url))
            
            if c.rowcount > 0:
                saved += 1
        
        except Exception as e:
            continue
    
    conn.commit()
    conn.close()
    
    return saved

def main():
    print("=" * 60)
    print("🎬 INSTAGRAM BATCH SCRAPER")
    print("=" * 60)
    
    # Get venues
    print("\n📍 Loading venues...")
    venues = get_venues_with_instagram()
    print(f"✅ Found {len(venues)} venues with Instagram handles")
    
    if len(venues) == 0:
        print("❌ No venues found!")
        return
    
    # Create venue map
    venue_map = {handle: vid for vid, name, handle in venues}
    instagram_handles = list(venue_map.keys())
    
    # Split into batches
    batches = [instagram_handles[i:i+BATCH_SIZE] for i in range(0, len(instagram_handles), BATCH_SIZE)]
    total_batches = len(batches)
    
    print(f"📦 Split into {total_batches} batches of {BATCH_SIZE} venues each")
    
    total_posts = 0
    total_saved = 0
    
    # Process each batch
    for i, batch in enumerate(batches, 1):
        posts = run_batch_scraper(batch, i, total_batches)
        
        if posts:
            saved = save_posts_to_db(posts, venue_map)
            total_posts += len(posts)
            total_saved += saved
            print(f"💾 Saved {saved} new posts")
        
        # Summary after each batch
        print(f"\n📊 Progress: {i}/{total_batches} batches | {total_posts} posts | {total_saved} saved")
        
        # Rate limit pause between batches
        if i < total_batches:
            print(f"⏸️  Pausing 10 seconds before next batch...\n")
            time.sleep(10)
    
    # Final summary
    print("\n" + "=" * 60)
    print("✅ ALL BATCHES COMPLETE!")
    print("=" * 60)
    print(f"📦 Total batches: {total_batches}")
    print(f"📍 Total venues: {len(venues)}")
    print(f"📸 Total posts: {total_posts}")
    print(f"💾 Total saved: {total_saved}")
    print(f"\n🔗 Ready for web view in mobile app!")

if __name__ == "__main__":
    main()
