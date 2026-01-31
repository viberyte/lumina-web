#!/usr/bin/env python3
import sqlite3
import json
import csv

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'
RESULTS_PATH = '/opt/viberyte/lumina-web/menu_scrape_results.json'

# Load scrape results
with open(RESULTS_PATH, 'r') as f:
    results = json.load(f)

# Load venue ID mapping
venue_mapping = {}
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        venue_mapping[row['name'].lower()] = int(row['id'])

print("=== UPDATING WEBSITES FROM GOOGLE SCRAPE ===\n")
print(f"📦 Loaded {len(results)} scraped results")
print(f"📋 Loaded {len(venue_mapping)} venue IDs\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

updated_websites = 0
updated_menus = 0
no_match = 0

for idx, result in enumerate(results):
    venue_title = result.get('title', '')
    website = result.get('website')
    
    # Find matching venue ID
    venue_id = venue_mapping.get(venue_title.lower())
    
    if not venue_id:
        no_match += 1
        continue
    
    print(f"[{idx+1}/{len(results)}] {venue_title}")
    
    # Update website if we have one
    if website:
        # Build menu URL
        menu_url = f"{website.rstrip('/')}/menu"
        
        cursor.execute("""
            UPDATE venues
            SET website = ?, menu_url = ?
            WHERE id = ?
        """, (website, menu_url, venue_id))
        
        updated_websites += 1
        updated_menus += 1
        print(f"   ✅ Website: {website}")
    else:
        print(f"   ⏭️  No website found")

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== UPDATE COMPLETE ===")
print(f"✅ Updated websites: {updated_websites}")
print(f"🍽️  Updated menu URLs: {updated_menus}")
print(f"❌ No match: {no_match}")

