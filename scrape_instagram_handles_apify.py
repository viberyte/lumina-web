#!/usr/bin/env python3
import csv
import requests
import json
import re
import time

CSV_PATH = '/opt/viberyte/lumina-web/venues_need_instagram.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Read venues
venues = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['website']:  # Only scrape venues with websites
            venues.append((int(row['id']), row['name'], row['website']))

print(f"=== INSTAGRAM HANDLE DISCOVERY ===\n")
print(f"📊 Found {len(venues)} venues with websites to scrape\n")

# Build start URLs for Apify
start_urls = []
for venue_id, name, website in venues[:100]:  # Start with first 100
    start_urls.append({
        "url": website,
        "userData": {"venue_id": venue_id, "name": name}
    })

print(f"🔍 Scraping Instagram links from {len(start_urls)} websites...\n")

# Apify Web Scraper
url = "https://api.apify.com/v2/acts/apify~web-scraper/runs"

payload = {
    "startUrls": start_urls,
    "pageFunction": """
async function pageFunction(context) {
    const { page, request } = context;
    
    // Find all links on page
    const links = await page.$$eval('a', elements => 
        elements.map(el => el.href).filter(href => href)
    );
    
    // Find Instagram links
    const igLinks = links.filter(link => 
        link.includes('instagram.com/')
    );
    
    // Extract handle from Instagram URL
    let handle = null;
    for (const link of igLinks) {
        const match = link.match(/instagram\\.com\\/([a-zA-Z0-9._]+)/);
        if (match && match[1] !== 'p' && match[1] !== 'reel') {
            handle = match[1];
            break;
        }
    }
    
    return {
        venue_id: request.userData.venue_id,
        venue_name: request.userData.name,
        instagram_handle: handle,
        url: request.url
    };
}
    """,
    "maxCrawlDepth": 0,
    "maxConcurrency": 10
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
    print(f"❌ Failed: {response.text}")
    exit(1)

run_data = response.json()
run_id = run_data['data']['id']
dataset_id = run_data['data']['defaultDatasetId']

print(f"⏳ Apify run: {run_id}")
print(f"   Scraping {len(start_urls)} websites...")
print(f"   ETA: 3-5 minutes\n")

# Wait for completion
dots = 0
while True:
    status_resp = requests.get(
        f"https://api.apify.com/v2/acts/apify~web-scraper/runs/{run_id}",
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
print(f"{'='*60}\n")

# Save results to file (can't update DB while locked)
found = 0
not_found = 0

instagram_updates = []

for result in results:
    venue_id = result.get('venue_id')
    venue_name = result.get('venue_name')
    ig_handle = result.get('instagram_handle')
    
    if ig_handle:
        print(f"✅ [{venue_id}] {venue_name} → @{ig_handle}")
        instagram_updates.append({
            'venue_id': venue_id,
            'instagram_handle': ig_handle
        })
        found += 1
    else:
        print(f"⏭️  [{venue_id}] {venue_name} - No Instagram found")
        not_found += 1

# Save to file for later update
with open('instagram_handles_found.json', 'w') as f:
    json.dump(instagram_updates, f, indent=2)

print(f"\n{'='*60}")
print(f"=== BATCH 1 COMPLETE ===")
print(f"✅ Found Instagram: {found}")
print(f"❌ Not found: {not_found}")
print(f"\n💾 Saved to: instagram_handles_found.json")
print(f"   Will update database after AI tagging completes")
print(f"\n🔄 Run this script again to process next 100 venues")

