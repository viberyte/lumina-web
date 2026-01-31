#!/usr/bin/env python3
import sqlite3
import requests
import re

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
DATASET_URL = 'https://api.apify.com/v2/datasets/Qc8icqZpX3CNzHmiS/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

print("=== UPDATING INSTAGRAM HANDLES FROM APIFY ===\n")

# Fetch dataset
response = requests.get(DATASET_URL)
results = response.json()

print(f"📦 Received {len(results)} results\n")

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

updated = 0
skipped = 0
duplicates = 0

for item in results:
    domain = item.get('domain')
    ig_link = item.get('instagramLink')
    
    if not domain or not ig_link:
        continue
    
    # Extract Instagram handle from URL
    match = re.search(r'instagram\.com/([a-zA-Z0-9._]+)', ig_link)
    if not match:
        continue
    
    ig_handle = match.group(1).rstrip('/')
    
    try:
        # Find venue by website domain
        cursor.execute("""
            UPDATE venues
            SET instagram_handle = ?
            WHERE website LIKE ?
            AND instagram_handle IS NULL
        """, (ig_handle, f'%{domain}%'))
        
        if cursor.rowcount > 0:
            # Get venue name
            cursor.execute("SELECT name FROM venues WHERE website LIKE ?", (f'%{domain}%',))
            result = cursor.fetchone()
            venue_name = result[0] if result else domain
            print(f"✅ {venue_name} → @{ig_handle}")
            updated += 1
        else:
            skipped += 1
            
    except sqlite3.IntegrityError:
        print(f"⏭️  @{ig_handle} - duplicate, skipping")
        duplicates += 1

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"=== UPDATE COMPLETE ===")
print(f"✅ Updated: {updated}")
print(f"⏭️  Skipped: {skipped}")
print(f"🔄 Duplicates: {duplicates}")

