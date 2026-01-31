#!/usr/bin/env python3
import sqlite3
import requests
import time
import csv
import re

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

def scrape_menu_links(websites):
    """Use Apify Web Scraper to find menu links and PDFs"""
    
    print(f"🔍 Searching for menu links on {len(websites)} websites...")
    
    # Build start URLs
    start_urls = []
    for venue_id, website in websites:
        if website:
            start_urls.append({
                "url": website,
                "userData": {"venue_id": venue_id}
            })
    
    print(f"📋 Prepared {len(start_urls)} URLs\n")
    
    # Use Web Scraper actor
    url = "https://api.apify.com/v2/acts/apify~web-scraper/runs"
    
    payload = {
        "startUrls": start_urls,
        "pageFunction": """
async function pageFunction(context) {
    const { page, request } = context;
    
    // Find all links
    const links = await page.$$eval('a', elements => 
        elements.map(el => ({
            href: el.href,
            text: el.innerText?.toLowerCase() || ''
        }))
    );
    
    // Filter for menu-related links
    const menuLinks = links.filter(link => {
        const href = link.href?.toLowerCase() || '';
        const text = link.text?.toLowerCase() || '';
        
        return (
            href.includes('menu') ||
            href.endsWith('.pdf') ||
            text.includes('menu') ||
            text.includes('food') ||
            text.includes('dinner') ||
            text.includes('lunch')
        );
    });
    
    return {
        venue_id: request.userData.venue_id,
        url: request.url,
        menuLinks: menuLinks.map(l => l.href).slice(0, 5)
    };
}
        """,
        "maxCrawlDepth": 0,
        "maxConcurrency": 10
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
    print(f"   Scraping in progress...\n")
    
    # Wait for completion
    dots = 0
    while True:
        status_response = requests.get(
            f"https://api.apify.com/v2/acts/apify~web-scraper/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_response.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Scraping complete!")
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

print("=== MENU PDF/LINK SCRAPER ===\n")

# Read CSV
websites = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        websites.append((int(row['id']), row['website']))

print(f"📊 Loaded {len(websites)} venues\n")

# Scrape
results = scrape_menu_links(websites)

if not results:
    print("❌ No results")
    conn.close()
    exit(1)

print(f"\n📦 Received {len(results)} results")
print(f"\n{'='*60}\n")

# Process results
found = 0
no_menu = 0

for result in results:
    venue_id = result.get('venue_id')
    menu_links = result.get('menuLinks', [])
    
    if not venue_id:
        continue
    
    # Get venue name
    cursor.execute("SELECT name FROM venues WHERE id = ?", (venue_id,))
    name_row = cursor.fetchone()
    name = name_row[0] if name_row else f"ID {venue_id}"
    
    print(f"[{venue_id}] {name}")
    
    if menu_links and len(menu_links) > 0:
        # Pick best menu link (prefer PDFs, then pages with 'menu' in URL)
        best_link = None
        
        for link in menu_links:
            if link.endswith('.pdf'):
                best_link = link
                break
        
        if not best_link:
            for link in menu_links:
                if 'menu' in link.lower():
                    best_link = link
                    break
        
        if not best_link:
            best_link = menu_links[0]
        
        # Update database
        cursor.execute("UPDATE venues SET menu_url = ? WHERE id = ?", (best_link, venue_id))
        found += 1
        print(f"   ✅ {best_link[:80]}...")
    else:
        no_menu += 1
        print(f"   ⏭️  No menu links found")

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== COMPLETE ===")
print(f"✅ Found: {found}")
print(f"❌ Not found: {no_menu}")

