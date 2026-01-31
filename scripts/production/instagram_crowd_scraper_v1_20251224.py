#!/usr/bin/env python3
"""
LUMINA INSTAGRAM CROWD SCRAPER v1.0
Created: December 24, 2025
Purpose: Scrape authentic customer posts from Instagram location pages
Actor: apidojo~instagram-location-scraper
Output: ~25 posts per venue location showing real crowd vibes

Usage: python3 instagram_crowd_scraper_v1_20251224.py
"""
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
POSTS_PER_LOCATION = 25
BATCH_SIZE = 50

# Get all venues with location IDs
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_location_id
    FROM venues
    WHERE instagram_location_id IS NOT NULL
    ORDER BY id
""")

venues = cursor.fetchall()
conn.close()

print(f"=== LUMINA INSTAGRAM CROWD SCRAPER ===")
print(f"Version: 1.0 | Date: 2025-12-24\n")
print(f"📊 Total locations: {len(venues)}")
print(f"📸 Posts per location: {POSTS_PER_LOCATION}")
print(f"🔄 Batch size: {BATCH_SIZE} locations\n")

total_batches = (len(venues) + BATCH_SIZE - 1) // BATCH_SIZE
all_posts_count = 0

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, len(venues))
    batch_venues = venues[start_idx:end_idx]
    
    print(f"\n{'='*60}")
    print(f"BATCH {batch_num + 1}/{total_batches}: Locations {start_idx + 1}-{end_idx}")
    print(f"{'='*60}\n")
    
    location_ids = [loc_id for _, _, loc_id in batch_venues]
    
    # Apify Instagram Location Scraper
    url = "https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs"
    
    payload = {
        "locationIds": location_ids,
        "maxItems": POSTS_PER_LOCATION * len(location_ids)
    }
    
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed: {response.text}")
        continue
    
    run_data = response.json()
    run_id = run_data['data']['id']
    
    print(f"⏳ Apify run: {run_id}")
    
    # Wait for completion
    dots = 0
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_resp.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"\n❌ Failed: {status}")
            break
        
        print(f"⏳ Running... {'.' * (dots % 4)}    ", end='\r')
        dots += 1
        time.sleep(10)
    
    # Get results
    dataset_id = run_data['data']['defaultDatasetId']
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    results = results_resp.json()
    
    print(f"📦 Got {len(results)} posts")
    all_posts_count += len(results)
    
    # Save batch file
    with open(f'crowd_posts_batch_{batch_num + 1}.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    saved = 0
    for post in results:
        location_id = str(post.get('inputSource'))
        post_id = post.get('id')
        
        image = post.get('image', {})
        image_url = image.get('url')
        
        owner = post.get('owner', {})
        username = owner.get('username')
        
        cursor.execute("SELECT id FROM venues WHERE instagram_location_id = ?", (location_id,))
        venue = cursor.fetchone()
        
        if venue and image_url:
            try:
                cursor.execute("""
                    INSERT INTO crowd_photos (
                        venue_id, instagram_post_id, instagram_location_id,
                        image_url, posted_by_username, caption,
                        like_count, comment_count, posted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    venue[0], post_id, location_id, image_url,
                    username, post.get('caption'), post.get('likeCount'),
                    post.get('commentCount'), post.get('createdAt')
                ))
                saved += 1
            except:
                pass
    
    conn.commit()
    conn.close()
    
    print(f"✅ Saved {saved} photos to database")
    
    if batch_num < total_batches - 1:
        print(f"⏳ Waiting 30 seconds...")
        time.sleep(30)

print(f"\n{'='*60}")
print(f"=== COMPLETE ===")
print(f"🎉 Total posts collected: {all_posts_count}")

# Final stats
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(DISTINCT venue_id), COUNT(*) FROM crowd_photos")
stats = cursor.fetchone()
conn.close()

print(f"\n📸 DATABASE:")
print(f"   Venues with photos: {stats[0]}")
print(f"   Total crowd photos: {stats[1]}")
