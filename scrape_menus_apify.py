#!/usr/bin/env python3
import sqlite3
import requests
import time
import csv
import json

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

def scrape_menus(venues_data):
    """Use Apify Website Content Crawler to find menu pages"""
    
    print(f"🔍 Scraping menus from {len(venues_data)} websites...")
    
    # Build start URLs
    start_urls = []
    for venue_id, name, website in venues_data:
        if website:
            start_urls.append({"url": website, "label": str(venue_id)})
    
    print(f"📋 Prepared {len(start_urls)} URLs for scraping\n")
    
    # Apify Website Content Crawler
    url = "https://api.apify.com/v2/acts/apify~website-content-crawler/runs"
    
    payload = {
        "startUrls": start_urls,
        "maxCrawlDepth": 2,
        "maxCrawlPages": 5,
        "crawlerType": "cheerio",
        "includeUrlGlobs": [
            "**/*menu*/**",
            "**/menu",
            "**/menus/**",
            "**/food*/**",
            "**/drinks*/**",
            "**/lunch*/**",
            "**/dinner*/**"
        ],
        "excludeUrlGlobs": [
            "**/*.pdf",
            "**/*.jpg",
            "**/*.png"
        ],
        "removeCookieWarnings": True,
        "clickElementsCssSelector": "a[href*='menu'], a[href*='food'], a[href*='drinks']"
    }
    
    headers = {"Content-Type": "application/json"}
    
    # Start the actor
    response = requests.post(
        url,
        json=payload,
        headers=headers,
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start Apify: {response.text}")
        return None
    
    run_data = response.json()
    run_id = run_data['data']['id']
    dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run started: {run_id}")
    print(f"   This will take 10-15 minutes for {len(start_urls)} websites...")
    print(f"   Checking status every 15 seconds...\n")
    
    # Wait for completion
    dots = 0
    while True:
        status_response = requests.get(
            f"https://api.apify.com/v2/acts/apify~website-content-crawler/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_response.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Scraping complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"\n❌ Scraping failed: {status}")
            return None
        
        print(f"⏳ Running... {'.' * (dots % 4)}    ", end='\r')
        dots += 1
        time.sleep(15)
    
    # Get results
    results_response = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    return results_response.json()

# Main processing
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== MENU SCRAPING FOR 341 VENUES ===\n")

# Read CSV
venues_data = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        venues_data.append((
            int(row['id']),
            row['name'],
            row['website']
        ))

print(f"📊 Loaded {len(venues_data)} venues from CSV\n")

# Scrape menus
results = scrape_menus(venues_data)

if not results:
    print("❌ No results from scraping")
    conn.close()
    exit(1)

print(f"\n📦 Received {len(results)} pages from scraper")
print(f"\n{'='*60}\n")

# Process results and update database
found_menus = 0
no_menu = 0

# Group results by venue_id (from label)
venue_results = {}
for result in results:
    label = result.get('metadata', {}).get('label')
    if label:
        venue_id = int(label)
        if venue_id not in venue_results:
            venue_results[venue_id] = []
        venue_results[venue_id].append(result)

print(f"📊 Found content for {len(venue_results)} venues\n")

for venue_id, name, website in venues_data:
    print(f"[{venue_id}] {name}")
    
    if venue_id not in venue_results:
        print(f"   ⏭️  No menu pages found")
        no_menu += 1
        continue
    
    # Find the best menu page (prioritize URLs with 'menu' in them)
    pages = venue_results[venue_id]
    menu_page = None
    
    for page in pages:
        page_url = page.get('url', '')
        if 'menu' in page_url.lower():
            menu_page = page
            break
    
    # If no explicit menu page, use first page found
    if not menu_page and pages:
        menu_page = pages[0]
    
    if menu_page:
        menu_url = menu_page.get('url')
        
        # Update database
        cursor.execute("""
            UPDATE venues
            SET menu_url = ?
            WHERE id = ?
        """, (menu_url, venue_id))
        
        found_menus += 1
        print(f"   ✅ Menu found: {menu_url}")
    else:
        print(f"   ⏭️  No menu content extracted")
        no_menu += 1

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== MENU SCRAPING COMPLETE ===")
print(f"✅ Found menus: {found_menus}")
print(f"❌ No menu found: {no_menu}")
print(f"\n🎯 Next: OpenAI tagging for ALL venues!")

