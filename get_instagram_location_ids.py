#!/usr/bin/env python3
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Get all Instagram handles
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_handle
    FROM venues
    WHERE instagram_handle IS NOT NULL
    AND should_exclude = 0
    ORDER BY id
""")

venues = cursor.fetchall()
conn.close()

print(f"=== INSTAGRAM LOCATION ID SCRAPER ===\n")
print(f"📊 Processing {len(venues)} venues with Instagram handles\n")

# Prepare Instagram profile URLs (do in batches of 200)
batch_size = 200
total_batches = (len(venues) + batch_size - 1) // batch_size

print(f"🔄 Will process in {total_batches} batches of {batch_size}\n")

# Process first batch
batch_venues = venues[:batch_size]
profile_urls = [f"https://www.instagram.com/{handle}/" for _, _, handle in batch_venues]

print(f"🔍 Batch 1: Scraping {len(profile_urls)} Instagram profiles...\n")

# Apify Instagram Scraper
url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"

payload = {
    "directUrls": profile_urls,
    "resultsType": "details",
    "resultsLimit": len(profile_urls),
    "searchType": "user",
    "searchLimit": 1
}

headers = {"Content-Type": "application/json"}

# Start actor
response = requests.post(
    url,
    json=payload,
    headers=headers,
    params={"token": APIFY_API_KEY}
)

if response.status_code != 201:
    print(f"❌ Failed to start: {response.text}")
    exit(1)

run_data = response.json()
run_id = run_data['data']['id']
dataset_id = run_data['data']['defaultDatasetId']

print(f"⏳ Apify run: {run_id}")
print(f"   Scraping {len(profile_urls)} Instagram profiles...")
print(f"   ETA: 5-10 minutes\n")

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
        exit(1)
    
    print(f"⏳ Running... {'.' * (dots % 4)}    ", end='\r')
    dots += 1
    time.sleep(10)

# Get results
results_resp = requests.get(
    f"https://api.apify.com/v2/datasets/{dataset_id}/items",
    params={"token": APIFY_API_KEY}
)

results = results_resp.json()

print(f"\n📦 Received {len(results)} results\n")

# Save results
with open('instagram_location_ids_batch1.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"💾 Saved to: instagram_location_ids_batch1.json\n")

# Show sample
if results:
    print("=== SAMPLE RESULT ===")
    print(json.dumps(results[0], indent=2)[:500])
    print("...\n")

print(f"{'='*60}")
print(f"=== BATCH 1 COMPLETE ===")
print(f"Next: Check results, then process remaining {len(venues) - batch_size} venues")

