#!/usr/bin/env python3
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
BATCH_SIZE = 100  # Process 100 locations at a time

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

print(f"=== SCRAPING ALL LOCATION POSTS ===\n")
print(f"📊 Total locations: {len(venues)}")

total_batches = (len(venues) + BATCH_SIZE - 1) // BATCH_SIZE
print(f"🔄 Will process in {total_batches} batches of {BATCH_SIZE}\n")

all_posts = []

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, len(venues))
    batch_venues = venues[start_idx:end_idx]
    
    print(f"\n{'='*60}")
    print(f"BATCH {batch_num + 1}/{total_batches}: Locations {start_idx + 1}-{end_idx}")
    print(f"{'='*60}\n")
    
    # Get location IDs for this batch
    location_ids = [loc_id for _, _, loc_id in batch_venues]
    
    # Start Apify scraper
    url = "https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs"
    
    payload = {
        "locationIds": location_ids,
        "maxItems": 50  # Get 50 posts per location
    }
    
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start batch {batch_num + 1}")
        continue
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run: {run_id}")
    print(f"   Scraping {len(location_ids)} locations...")
    
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
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    results = results_resp.json()
    all_posts.extend(results)
    
    print(f"📦 Got {len(results)} customer posts from this batch")
    print(f"🎯 Total posts so far: {len(all_posts)}")
    
    # Save progress after each batch
    with open(f'location_posts_batch_{batch_num + 1}.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"💾 Saved batch to: location_posts_batch_{batch_num + 1}.json")
    
    if batch_num < total_batches - 1:
        print(f"⏳ Waiting 30 seconds before next batch...")
        time.sleep(30)

# Save all posts
with open('all_location_posts.json', 'w') as f:
    json.dump(all_posts, f, indent=2)

print(f"\n{'='*60}")
print(f"=== COMPLETE ===")
print(f"🎉 Total customer posts collected: {len(all_posts)}")
print(f"📁 Saved to: all_location_posts.json")
print(f"\n🎯 NEXT: Save these posts to database for mobile app!")

