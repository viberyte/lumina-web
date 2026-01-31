#!/usr/bin/env python3
"""
LUMINA INSTAGRAM CROWD SCRAPER - RETRY MISSING VENUES
Date: December 24, 2025
Purpose: Scrape the 662 venues that didn't get crowd photos in first run
"""
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
POSTS_PER_LOCATION = 25
BATCH_SIZE = 50

# Get venues WITHOUT crowd photos
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT v.id, v.name, v.instagram_location_id
    FROM venues v
    WHERE v.instagram_location_id IS NOT NULL
    AND v.id NOT IN (
        SELECT DISTINCT venue_id FROM crowd_photos
    )
    ORDER BY v.id
""")

missing_venues = cursor.fetchall()
conn.close()

print(f"=== RETRY: VENUES MISSING CROWD PHOTOS ===\n")
print(f"📊 Venues to retry: {len(missing_venues)}")
print(f"📸 Posts per location: {POSTS_PER_LOCATION}")
print(f"🔄 Batch size: {BATCH_SIZE} locations\n")

if len(missing_venues) == 0:
    print("✅ All venues already have crowd photos!")
    exit(0)

total_batches = (len(missing_venues) + BATCH_SIZE - 1) // BATCH_SIZE
print(f"Will process in {total_batches} batches\n")

all_posts_count = 0
total_saved = 0

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, len(missing_venues))
    batch_venues = missing_venues[start_idx:end_idx]
    
    print(f"\n{'='*60}")
    print(f"BATCH {batch_num + 1}/{total_batches}: Locations {start_idx + 1}-{end_idx}")
    print(f"{'='*60}\n")
    
    location_ids = [loc_id for _, _, loc_id in batch_venues]
    
    print(f"Scraping {len(location_ids)} locations...")
    
    # Start scraper
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
    
    # Wait
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
    
    # Save batch
    with open(f'retry_batch_{batch_num + 1}.json', 'w') as f:
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
    
    total_saved += saved
    print(f"✅ Saved {saved} photos to database")
    print(f"🎯 Total new photos: {total_saved}")
    
    if batch_num < total_batches - 1:
        print(f"⏳ Waiting 30 seconds...")
        time.sleep(30)

# Final stats
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(DISTINCT venue_id), COUNT(*) FROM crowd_photos")
stats = cursor.fetchone()
conn.close()

print(f"\n{'='*60}")
print(f"=== RETRY COMPLETE ===")
print(f"📦 Posts collected: {all_posts_count}")
print(f"💾 New photos saved: {total_saved}")
print(f"\n📊 UPDATED DATABASE:")
print(f"   Venues with photos: {stats[0]}/1119")
print(f"   Total crowd photos: {stats[1]}")

