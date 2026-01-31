#!/usr/bin/env python3
import csv
import requests
import json
import time

CSV_PATH = '/opt/viberyte/lumina-web/venues_need_instagram.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Read venues with websites
venues = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['website']:
            venues.append({
                'id': int(row['id']),
                'name': row['name'],
                'website': row['website']
            })

print(f"=== BULK INSTAGRAM PROFILE HUNTER ===\n")
print(f"📊 Found {len(venues)} venues with websites\n")

# Prepare startUrls format
start_urls = [{"url": v['website']} for v in venues]

print(f"🔍 Searching Instagram profiles for {len(start_urls)} websites...\n")

# Apify Instagram Profile Hunter
url = "https://api.apify.com/v2/acts/6sigmag~instagram-profile-hunter-bulk-website-to-instagram-mapper/runs"

payload = {
    "startUrls": start_urls,
    "proxyConfiguration": {
        "useApifyProxy": True
    }
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
print(f"   Processing {len(start_urls)} websites...")
print(f"   ETA: 8-12 minutes\n")

# Wait for completion
dots = 0
while True:
    status_resp = requests.get(
        f"https://api.apify.com/v2/acts/6sigmag~instagram-profile-hunter-bulk-website-to-instagram-mapper/runs/{run_id}",
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

print(f"\n📦 Received {len(results)} results\n")
print(f"{'='*60}\n")

# Match results back to venues
instagram_updates = []
found = 0
not_found = 0

for venue in venues:
    # Find matching result
    matched = None
    for result in results:
        if result.get('url') == venue['website']:
            matched = result
            break
    
    if matched and matched.get('instagramUrl'):
        ig_url = matched['instagramUrl']
        # Extract handle from URL
        handle = ig_url.replace('https://www.instagram.com/', '').replace('https://instagram.com/', '').strip('/').split('/')[0]
        
        print(f"✅ [{venue['id']}] {venue['name']} → @{handle}")
        instagram_updates.append({
            'venue_id': venue['id'],
            'instagram_handle': handle,
            'instagram_url': ig_url
        })
        found += 1
    else:
        not_found += 1

# Save to file
with open('instagram_handles_bulk.json', 'w') as f:
    json.dump(instagram_updates, f, indent=2)

print(f"\n{'='*60}")
print(f"=== BULK SEARCH COMPLETE ===")
print(f"✅ Found Instagram: {found}")
print(f"❌ Not found: {not_found}")
print(f"Success rate: {round(found/len(venues)*100, 1)}%")
print(f"\n💾 Saved to: instagram_handles_bulk.json")
print(f"   Will update database after AI tagging completes")

