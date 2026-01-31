#!/usr/bin/env python3
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Get venues with location IDs (start with first 50 for testing)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_location_id, instagram_location_name
    FROM venues
    WHERE instagram_location_id IS NOT NULL
    AND should_exclude = 0
    ORDER BY id
    LIMIT 50
""")

venues = cursor.fetchall()
conn.close()

print(f"=== SCRAPING INSTAGRAM LOCATION POSTS ===\n")
print(f"📊 Testing with first {len(venues)} venues\n")

# Build location URLs
location_urls = []
for venue_id, name, loc_id, loc_name in venues:
    location_urls.append(f"https://www.instagram.com/locations/{loc_id}/")

print(f"🔍 Scraping {len(location_urls)} location pages for customer posts...\n")

# Apify Instagram Scraper
url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"

payload = {
    "directUrls": location_urls,
    "resultsType": "posts",
    "resultsLimit": 50,  # Get top 50 posts per location
    "searchType": "place"
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
print(f"   Scraping customer posts from {len(location_urls)} locations...")
print(f"   ETA: 8-12 minutes\n")

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

print(f"\n📦 Received {len(results)} customer posts!\n")

# Save to file
with open('location_posts_sample.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"💾 Saved to: location_posts_sample.json\n")

# Show sample
if results:
    print("=== SAMPLE CUSTOMER POST ===")
    sample = results[0]
    print(f"Location: {sample.get('locationName')}")
    print(f"Posted by: @{sample.get('ownerUsername')}")
    print(f"Likes: {sample.get('likesCount')}")
    print(f"Image: {sample.get('displayUrl', 'N/A')[:80]}...")
    print(f"Caption: {sample.get('caption', 'N/A')[:100]}...")

print(f"\n{'='*60}")
print(f"=== TEST COMPLETE ===")
print(f"✅ Got {len(results)} real customer posts from {len(venues)} venues!")
print(f"🎯 Ready to process all 1,119 locations!")

