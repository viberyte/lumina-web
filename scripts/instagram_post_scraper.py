#!/usr/bin/env python3
"""
Instagram Post Scraper for Lumina
Scrapes 15 posts (photos + videos) per venue Instagram handle
Saves web view URLs for seamless display in mobile app
"""

import os
import json
import sqlite3
import requests
import time
from datetime import datetime

# Configuration
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
OPENAI_API_KEY = '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'
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
POSTS_PER_VENUE = 15

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

def run_apify_scraper(instagram_handles):
    """Run Apify Instagram scraper for given handles"""
    
    print(f"\n🚀 Starting Apify scraper for {len(instagram_handles)} venues...")
    
    # Build direct URLs for each handle
    direct_urls = [f"https://www.instagram.com/{handle}/" for handle in instagram_handles]
    
    # Apify actor configuration
    url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"
    
    payload = {
        "directUrls": direct_urls,
        "resultsType": "posts",
        "resultsLimit": POSTS_PER_VENUE,
        "searchLimit": 1,
        "addParentData": True
    }
    
    headers = {"Content-Type": "application/json"}
    
    # Start the actor run
    response = requests.post(
        url,
        json=payload,
        headers=headers,
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start scraper: {response.text}")
        return None
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Run ID: {run_id}")
    print(f"📊 Dataset ID: {dataset_id}")
    print(f"   Scraping {len(instagram_handles)} Instagram profiles...")
    print(f"   Estimated time: {len(instagram_handles) * 2} seconds\n")
    
    # Wait for completion
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_resp.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print("✅ Scraping complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"❌ Scraping {status}")
            return None
        
        print(f"⏳ Status: {status}... ", end='\r')
        time.sleep(5)
    
    # Fetch results
    print("\n📥 Downloading results...")
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY, "format": "json"}
    )
    
    if results_resp.status_code != 200:
        print(f"❌ Failed to fetch results: {results_resp.text}")
        return None
    
    posts = results_resp.json()
    print(f"✅ Downloaded {len(posts)} posts")
    
    return posts

def save_posts_to_db(posts, venue_map):
    """Save Instagram posts to database"""
    
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
    skipped = 0
    
    print(f"\n💾 Saving posts to database...")
    
    for post in posts:
        try:
            # Get owner username
            owner_username = post.get('ownerUsername', '')
            
            # Find venue by Instagram handle
            venue_id = venue_map.get(owner_username)
            
            if not venue_id:
                skipped += 1
                continue
            
            # Extract post data
            post_url = post.get('url', '')
            shortcode = post.get('shortCode', '')
            web_view_url = f"https://www.instagram.com/p/{shortcode}/embed/"
            
            # Determine media type
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
            
            # Insert into database
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
            print(f"⚠️  Error saving post: {e}")
            continue
    
    conn.commit()
    conn.close()
    
    print(f"✅ Saved {saved} new posts")
    print(f"⏭️  Skipped {skipped} duplicates/unmatched")
    
    return saved

def main():
    print("=" * 60)
    print("🎬 INSTAGRAM POST SCRAPER FOR LUMINA")
    print("=" * 60)
    
    # Step 1: Get venues
    print("\n📍 Step 1: Loading venues from database...")
    venues = get_venues_with_instagram()
    print(f"✅ Found {len(venues)} venues with Instagram handles")
    
    if len(venues) == 0:
        print("❌ No venues with Instagram handles found!")
        return
    
    # Create handle to venue_id map
    venue_map = {handle: vid for vid, name, handle in venues}
    instagram_handles = list(venue_map.keys())
    
    # Step 2: Run scraper
    print("\n📸 Step 2: Scraping Instagram posts...")
    posts = run_apify_scraper(instagram_handles)
    
    if not posts:
        print("❌ Scraping failed!")
        return
    
    # Step 3: Save to database
    print("\n💾 Step 3: Saving to database...")
    saved_count = save_posts_to_db(posts, venue_map)
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ SCRAPING COMPLETE!")
    print("=" * 60)
    print(f"📊 Total venues scraped: {len(venues)}")
    print(f"📸 Total posts downloaded: {len(posts)}")
    print(f"💾 New posts saved: {saved_count}")
    print(f"\n🔗 Posts ready for web view display in mobile app!")

if __name__ == "__main__":
    main()
