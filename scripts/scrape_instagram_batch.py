#!/usr/bin/env python3
"""
Lumina Instagram Scraper - Batch Processing
Scrapes 15-20 posts per venue using Apify
"""

import sqlite3
import requests
import json
import time
import sys

# Config
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW'
POSTS_PER_VENUE = 20
BATCH_SIZE = 50

def get_venues_to_scrape(offset=0):
    """Get batch of venues that haven't been scraped yet"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT v.id, v.name, v.instagram_handle 
        FROM venues v
        LEFT JOIN venue_instagram_media m ON v.id = m.venue_id
        WHERE v.instagram_handle IS NOT NULL 
        AND v.instagram_handle != ''
        AND m.id IS NULL
        GROUP BY v.id
        ORDER BY v.id
        LIMIT ? OFFSET ?
    """, (BATCH_SIZE, offset))
    
    venues = cursor.fetchall()
    conn.close()
    return venues

def run_apify_scraper(handles):
    """Run Apify Instagram scraper for list of handles"""
    
    # Build direct URLs for each handle
    direct_urls = [f"https://www.instagram.com/{h.replace('@', '')}/" for h in handles]
    
    print(f"\n🚀 Starting Apify scraper for {len(handles)} venues...")
    
    url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"
    
    payload = {
        "directUrls": direct_urls,
        "resultsType": "posts",
        "resultsLimit": POSTS_PER_VENUE,
        "searchType": "user",
        "searchLimit": 1
    }
    
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(
        url,
        json=payload,
        headers=headers,
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start Apify: {response.status_code}")
        print(response.text)
        return None
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run started: {run_id}")
    print(f"   Dataset: {dataset_id}")
    print(f"   Waiting for completion (this takes 3-8 minutes)...\n")
    
    # Poll for completion
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status_data = status_resp.json()['data']
        status = status_data['status']
        
        if status == 'SUCCEEDED':
            print(f"✅ Scraping complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"❌ Scraping failed: {status}")
            return None
        
        # Show progress
        sys.stdout.write('.')
        sys.stdout.flush()
        time.sleep(10)
    
    # Fetch results
    print(f"\n📥 Downloading results...")
    
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY, "format": "json"}
    )
    
    if results_resp.status_code != 200:
        print(f"❌ Failed to get results: {results_resp.status_code}")
        return None
    
    return results_resp.json()

def save_media_to_db(posts, venue_map):
    """Save scraped posts to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    saved = 0
    skipped = 0
    
    for post in posts:
        try:
            # Get venue from handle
            owner = post.get('ownerUsername', '').lower()
            venue_id = venue_map.get(owner)
            
            if not venue_id:
                skipped += 1
                continue
            
            post_id = post.get('id') or post.get('shortCode')
            if not post_id:
                skipped += 1
                continue
            
            # Determine media type
            media_type = 'video' if post.get('type') == 'Video' or post.get('videoUrl') else 'photo'
            
            # Get URLs
            if media_type == 'video':
                media_url = post.get('videoUrl') or post.get('displayUrl')
                thumbnail_url = post.get('displayUrl')
            else:
                media_url = post.get('displayUrl')
                thumbnail_url = post.get('displayUrl')
            
            # Get permalink
            shortcode = post.get('shortCode', '')
            permalink = f"https://www.instagram.com/p/{shortcode}/" if shortcode else None
            
            cursor.execute("""
                INSERT OR IGNORE INTO venue_instagram_media 
                (venue_id, instagram_handle, post_id, media_type, media_url, 
                 thumbnail_url, caption, likes, comments, posted_at, instagram_permalink)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                venue_id,
                owner,
                post_id,
                media_type,
                media_url,
                thumbnail_url,
                post.get('caption', '')[:500] if post.get('caption') else None,
                post.get('likesCount', 0),
                post.get('commentsCount', 0),
                post.get('timestamp'),
                permalink
            ))
            
            if cursor.rowcount > 0:
                saved += 1
            else:
                skipped += 1
                
        except Exception as e:
            print(f"⚠️ Error saving post: {e}")
            skipped += 1
    
    conn.commit()
    conn.close()
    
    return saved, skipped

def main():
    # Get batch offset from command line
    offset = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    
    print(f"\n{'='*60}")
    print(f"🌙 LUMINA INSTAGRAM SCRAPER - BATCH {offset // BATCH_SIZE + 1}")
    print(f"{'='*60}")
    
    # Get venues to scrape
    venues = get_venues_to_scrape(offset)
    
    if not venues:
        print("✅ All venues have been scraped!")
        return
    
    print(f"\n📊 Found {len(venues)} venues to scrape in this batch")
    
    # Build handle -> venue_id map
    venue_map = {}
    handles = []
    
    for venue_id, name, handle in venues:
        clean_handle = handle.replace('@', '').lower().strip()
        venue_map[clean_handle] = venue_id
        handles.append(clean_handle)
        print(f"   {venue_id}: @{clean_handle} - {name[:40]}")
    
    # Run Apify scraper
    posts = run_apify_scraper(handles)
    
    if not posts:
        print("❌ No posts returned from Apify")
        return
    
    print(f"\n📸 Got {len(posts)} posts from Apify")
    
    # Save to database
    saved, skipped = save_media_to_db(posts, venue_map)
    
    print(f"\n{'='*60}")
    print(f"✅ BATCH COMPLETE")
    print(f"   Saved: {saved} media items")
    print(f"   Skipped: {skipped}")
    print(f"{'='*60}")
    
    # Show next batch command
    next_offset = offset + BATCH_SIZE
    print(f"\n📌 To run next batch:")
    print(f"   python3 /opt/viberyte/lumina-web/scripts/scrape_instagram_batch.py {next_offset}")

if __name__ == "__main__":
    main()
