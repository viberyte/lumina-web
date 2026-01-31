#!/usr/bin/env python3
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Get 10 venues with location IDs to test
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_location_id, instagram_location_name
    FROM venues
    WHERE instagram_location_id IS NOT NULL
    LIMIT 10
""")

venues = cursor.fetchall()
conn.close()

print(f"=== TESTING INSTAGRAM LOCATION SCRAPER ===\n")
print(f"📊 Testing with {len(venues)} locations\n")

# Build location IDs list
location_ids = []
for venue_id, name, loc_id, loc_name in venues:
    location_ids.append(loc_id)
    print(f"  {name} → {loc_id}")

print(f"\n🔍 Scraping {len(location_ids)} location pages...\n")

# Apify Instagram Location Scraper
url = "https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs"

payload = {
    "locationIds": location_ids,
    "maxItems": 50
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
print(f"   Scraping location posts...")
print(f"   ETA: 3-5 minutes\n")

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

print(f"\n📦 Received {len(results)} results!\n")

# Save
with open('location_scraper_test.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"💾 Saved to: location_scraper_test.json\n")

# Check results
if results:
    print("=== FIRST RESULT ===")
    print(json.dumps(results[0], indent=2)[:1000])
    print("...\n")
    
    if 'error' in results[0]:
        print(f"❌ Blocked: {results[0].get('error')}")
    else:
        print(f"✅ SUCCESS! Got customer posts from location pages!")
        print(f"\n🎯 Ready to scrape all 1,119 locations!")

