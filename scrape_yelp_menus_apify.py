#!/usr/bin/env python3
import sqlite3
import requests
import time
import csv

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

def scrape_yelp_menus(venues):
    """Use Apify epctex/yelp-scraper to get menu data"""
    
    # Build search queries  
    search_list = []
    for venue_id, name, city, address in venues:
        search_list.append(f"{name} {city}")
    
    print(f"🔍 Searching Yelp for {len(search_list)} venues...")
    
    # Apify epctex/yelp-scraper
    url = "https://api.apify.com/v2/acts/epctex~yelp-scraper/runs"
    
    payload = {
        "search": ",".join(search_list),
        "startUrls": [],
        "endPage": 1,
        "maxItems": 1,
        "proxy": {
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
        return None
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run: {run_id}")
    print(f"   Scraping Yelp for {len(search_list)} venues...")
    print(f"   Estimated time: 5-10 minutes\n")
    
    # Wait for completion
    dots = 0
    while True:
        status_response = requests.get(
            f"https://api.apify.com/v2/acts/epctex~yelp-scraper/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status_data = status_response.json()
        status = status_data['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Yelp scraping complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"\n❌ Failed: {status}")
            return None
        
        print(f"⏳ Running... {'.' * (dots % 4)}    ", end='\r')
        dots += 1
        time.sleep(10)
    
    # Get results
    results_response = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    return results_response.json()

# Main
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== YELP MENU SCRAPER (epctex) ===\n")

# Read venues
venues = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        venues.append((
            int(row['id']),
            row['name'],
            row['city'],
            row.get('address', '')
        ))

print(f"📊 Loaded {len(venues)} venues\n")

# Scrape Yelp
results = scrape_yelp_menus(venues)

if not results:
    print("❌ No results")
    conn.close()
    exit(1)

print(f"\n📦 Received {len(results)} Yelp results")
print(f"\n{'='*60}\n")

# Process results
found_menus = 0
found_yelp = 0
no_match = 0

for idx, (venue_id, name, city, address) in enumerate(venues):
    print(f"[{idx+1}/{len(venues)}] {name} ({city})")
    
    # Find matching result (results come in same order as search queries)
    if idx < len(results):
        result = results[idx]
    else:
        print(f"   ⏭️  No result")
        no_match += 1
        continue
    
    # Extract data
    yelp_url = result.get('url')
    business_id = result.get('businessId')
    has_menu = result.get('hasMenu', False)
    
    # Build menu URL
    menu_url = None
    if has_menu and yelp_url:
        menu_url = f"{yelp_url.rstrip('/')}/menu"
    
    # Update database
    update_fields = []
    update_values = []
    
    if business_id:
        update_fields.append("yelp_id = ?")
        update_values.append(business_id)
        found_yelp += 1
    
    if yelp_url:
        update_fields.append("yelp_url = ?")
        update_values.append(yelp_url)
    
    if menu_url:
        update_fields.append("menu_url = ?")
        update_values.append(menu_url)
        found_menus += 1
        print(f"   🍽️  Menu: {menu_url}")
    
    if update_fields:
        update_values.append(venue_id)
        query = f"UPDATE venues SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, update_values)
        print(f"   ✅ Updated")
    else:
        print(f"   ⏭️  No data found")
        no_match += 1

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== COMPLETE ===")
print(f"✅ Found Yelp data: {found_yelp}")
print(f"🍽️  Found menus: {found_menus}")
print(f"❌ No match: {no_match}")
print(f"\n🎯 NEXT: OpenAI tagging for ALL venues!")

