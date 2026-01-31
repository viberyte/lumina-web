#!/usr/bin/env python3
import sqlite3
import requests
import json
import time
from collections import Counter

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
BATCH_SIZE = 200

# Get all venues needing location IDs
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_handle
    FROM venues
    WHERE instagram_handle IS NOT NULL
    AND instagram_location_id IS NULL
    AND should_exclude = 0
    ORDER BY id
""")

remaining_venues = cursor.fetchall()
conn.close()

print(f"=== PROCESSING ALL REMAINING BATCHES ===\n")
print(f"📊 {len(remaining_venues)} venues need location IDs")
print(f"🔄 Will process in batches of {BATCH_SIZE}\n")

total_batches = (len(remaining_venues) + BATCH_SIZE - 1) // BATCH_SIZE

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, len(remaining_venues))
    batch_venues = remaining_venues[start_idx:end_idx]
    
    print(f"\n{'='*60}")
    print(f"BATCH {batch_num + 2}/{total_batches + 1}: Processing venues {start_idx + 1}-{end_idx}")
    print(f"{'='*60}\n")
    
    # Build profile URLs
    profile_urls = [f"https://www.instagram.com/{handle}/" for _, _, handle in batch_venues]
    
    # Start Apify scraper
    url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"
    
    payload = {
        "directUrls": profile_urls,
        "resultsType": "details",
        "resultsLimit": len(profile_urls),
        "searchType": "user",
        "searchLimit": 1
    }
    
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start batch {batch_num + 2}")
        continue
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run: {run_id}")
    print(f"   Scraping {len(profile_urls)} profiles...")
    
    # Wait for completion
    dots = 0
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/acts/apify~instagram-scraper/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_resp.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Scraping complete!")
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
    print(f"📦 Received {len(results)} results\n")
    
    # Extract and update location IDs
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    
    for result in results:
        username = result.get('username')
        posts = result.get('latestPosts', [])
        
        location_ids = []
        location_names = []
        
        for post in posts:
            if post.get('locationId'):
                location_ids.append(post['locationId'])
                if post.get('locationName'):
                    location_names.append(post['locationName'])
        
        if location_ids:
            most_common_id = Counter(location_ids).most_common(1)[0][0]
            most_common_name = Counter(location_names).most_common(1)[0][0] if location_names else None
            
            cursor.execute("""
                UPDATE venues
                SET instagram_location_id = ?, instagram_location_name = ?
                WHERE instagram_handle = ?
            """, (most_common_id, most_common_name, username))
            
            if cursor.rowcount > 0:
                updated += 1
    
    conn.commit()
    conn.close()
    
    print(f"✅ Batch {batch_num + 2} complete: {updated} location IDs saved")
    print(f"⏳ Waiting 30 seconds before next batch...")
    time.sleep(30)

print(f"\n{'='*60}")
print(f"=== ALL BATCHES COMPLETE! ===")
print(f"🎉 Location IDs extracted for all venues!")

