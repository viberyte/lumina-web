#!/usr/bin/env python3
import sqlite3
import requests
import time
import csv

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Read venues
venues = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        venues.append((int(row['id']), row['name'], row['city']))

print(f"🍽️  MENU SCRAPER: {len(venues)} venues")

# Build search queries
search_queries = [f"{name} {city}" for _, name, city in venues]

# Start Apify
url = "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs"
response = requests.post(
    url,
    json={
        "searchStringsArray": search_queries,
        "maxCrawledPlacesPerSearch": 1,
        "language": "en",
        "maxReviews": 0,
        "includeWebResults": True
    },
    headers={"Content-Type": "application/json"},
    params={"token": APIFY_API_KEY}
)

run_id = response.json()['data']['id']
print(f"⏳ Run: {run_id} | ETA: 8-12 minutes\n")

# Wait
dots = 0
while True:
    status_resp = requests.get(
        f"https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs/{run_id}",
        params={"token": APIFY_API_KEY}
    )
    status = status_resp.json()['data']['status']
    
    if status == 'SUCCEEDED':
        print("\n✅ Complete!")
        break
    elif status in ['FAILED', 'ABORTED']:
        print(f"\n❌ Failed: {status}")
        exit(1)
    
    print(f"⏳ {'.' * (dots % 4)}    ", end='\r')
    dots += 1
    time.sleep(10)

# Get results and update DB
dataset_id = response.json()['data']['defaultDatasetId']
results = requests.get(
    f"https://api.apify.com/v2/datasets/{dataset_id}/items",
    params={"token": APIFY_API_KEY}
).json()

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

found = 0
for idx, (vid, name, city) in enumerate(venues):
    matched = next((r for r in results if name.lower() in r.get('searchString', '').lower()), None)
    if matched and matched.get('website'):
        menu_url = f"{matched['website'].rstrip('/')}/menu"
        cursor.execute("UPDATE venues SET menu_url = ? WHERE id = ?", (menu_url, vid))
        found += 1
        print(f"[{idx+1}/{len(venues)}] ✅ {name}")

conn.commit()
conn.close()
print(f"\n✅ Found {found} menus")
