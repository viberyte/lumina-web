#!/usr/bin/env python3
import sqlite3
import requests
import time
import json
from datetime import datetime

# Configuration
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
BATCH_SIZE = 20  # Process 20 venues at a time

def search_venues_on_google(venues_list):
    """Use Apify Google Maps Scraper to find venues"""
    
    # Prepare search queries
    search_queries = []
    for venue_id, name, city in venues_list:
        search_queries.append(f"{name} {city}")
    
    print(f"🔍 Searching for {len(search_queries)} venues on Google Maps...")
    
    # Apify Google Maps Scraper actor
    url = "https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs"
    
    payload = {
        "searchStringsArray": search_queries,
        "maxCrawledPlacesPerSearch": 1,
        "language": "en",
        "maxReviews": 0,
        "maxImages": 5,
        "includeWebResults": True,
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Start the actor
    response = requests.post(
        url,
        json=payload,
        headers=headers,
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to start Apify actor: {response.text}")
        return None
    
    run_data = response.json()
    run_id = run_data['data']['id']
    default_dataset_id = run_data['data']['defaultDatasetId']
    
    print(f"⏳ Apify run started: {run_id}")
    print(f"   Waiting for results...")
    
    # Wait for completion
    while True:
        status_response = requests.get(
            f"https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_response.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"✅ Scraping complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"❌ Scraping failed with status: {status}")
            return None
        
        time.sleep(3)
    
    # Get results
    results_response = requests.get(
        f"https://api.apify.com/v2/datasets/{default_dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    return results_response.json()

def extract_instagram_from_website(website_url):
    """Extract Instagram handle from website URL"""
    if not website_url:
        return None
    
    import re
    patterns = [
        r'instagram\.com/([a-zA-Z0-9._]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, website_url)
        if match:
            handle = match.group(1).rstrip('/')
            return handle
    return None

# Main processing
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== GOOGLE PLACES ENRICHMENT VIA APIFY ===\n")

# Get venues to enrich
cursor.execute("""
    SELECT id, name, city
    FROM venues
    WHERE recheck_flag = 1
    ORDER BY id
    LIMIT ?
""", (BATCH_SIZE,))

venues = cursor.fetchall()
total = len(venues)

if total == 0:
    print("✅ No venues need enrichment!")
    conn.close()
    exit(0)

print(f"📊 Processing batch of {total} venues\n")

# Search on Google Maps
results = search_venues_on_google(venues)

if not results:
    print("❌ Failed to get results from Apify")
    conn.close()
    exit(1)

# Match results to venues and update database
enriched = 0
failed = 0

for idx, (venue_id, name, city) in enumerate(venues):
    print(f"\n[{idx+1}/{total}] {name} ({city})")
    
    # Find matching result
    matched_result = None
    for result in results:
        if result.get('searchString', '').lower().startswith(name.lower()):
            matched_result = result
            break
    
    if not matched_result:
        print(f"   ⏭️  No match found in Google Maps")
        failed += 1
        continue
    
    # Extract data
    address = matched_result.get('address')
    phone = matched_result.get('phoneUnformatted') or matched_result.get('phone')
    website = matched_result.get('website')
    rating = matched_result.get('totalScore')
    review_count = matched_result.get('reviewsCount')
    price_level = matched_result.get('priceLevel')
    
    # Coordinates
    latitude = matched_result.get('location', {}).get('lat')
    longitude = matched_result.get('location', {}).get('lng')
    
    # Hours
    opening_hours = matched_result.get('openingHours')
    hours_json = json.dumps(opening_hours) if opening_hours else None
    
    # Photos
    images = matched_result.get('imageUrls', [])
    photo_url = images[0] if images else None
    
    # Place ID
    place_id = matched_result.get('placeId')
    
    # Try to get Instagram from website
    instagram_handle = extract_instagram_from_website(website)
    
    # Update database
    try:
        cursor.execute("""
            UPDATE venues
            SET 
                google_place_id = ?,
                address = ?,
                phone = ?,
                website = ?,
                google_rating = ?,
                google_price_level = ?,
                latitude = ?,
                longitude = ?,
                hours_json = ?,
                professional_photo_url = ?,
                instagram_handle = COALESCE(instagram_handle, ?),
                has_photo = CASE WHEN ? IS NOT NULL THEN 1 ELSE has_photo END,
                recheck_flag = 0,
                updated_at = ?
            WHERE id = ?
        """, (
            place_id,
            address,
            phone,
            website,
            rating,
            len(price_level) if price_level else None,  # Convert $ symbols to number
            latitude,
            longitude,
            hours_json,
            photo_url,
            instagram_handle,
            photo_url,
            datetime.now().isoformat(),
            venue_id
        ))
        
        enriched += 1
        print(f"   ✅ Address: {address}")
        print(f"   ⭐ Rating: {rating}/5 ({review_count} reviews)")
        if website:
            print(f"   🌐 Website: {website}")
        if instagram_handle:
            print(f"   📸 Instagram: @{instagram_handle}")
        
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        failed += 1

conn.commit()

# Show summary
print(f"\n{'='*50}")
print(f"=== BATCH COMPLETE ===")
print(f"✅ Enriched: {enriched}/{total}")
print(f"❌ Failed: {failed}/{total}")

# Check remaining
cursor.execute("SELECT COUNT(*) FROM venues WHERE recheck_flag = 1")
remaining = cursor.fetchone()[0]

print(f"\n📊 Venues still needing enrichment: {remaining}")
if remaining > 0:
    print(f"🔄 Run this script again to process the next batch!")

conn.close()
