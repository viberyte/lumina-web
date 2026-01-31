#!/usr/bin/env python3
import sqlite3
import requests
import time
import csv

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/venues_need_menus.csv'

# Yelp API (you'll need to add your key)
YELP_API_KEY = 'YOUR_YELP_API_KEY'

def search_yelp(name, address, city):
    """Search for business on Yelp"""
    url = "https://api.yelp.com/v3/businesses/search"
    
    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    
    params = {
        "term": name,
        "location": f"{address}, {city}" if address else city,
        "limit": 1
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        
        businesses = data.get('businesses', [])
        if businesses:
            return businesses[0]
        return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def check_existing_yelp_data():
    """Check if venues already have yelp_id"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) 
        FROM venues 
        WHERE menu_url IS NULL 
        AND yelp_id IS NOT NULL
        AND category IN ('restaurant', 'lounge', 'cafe', 'bar')
    """)
    
    count = cursor.fetchone()[0]
    conn.close()
    return count

# Check if we have existing Yelp data
print("=== YELP MENU LOOKUP ===\n")
print("⚠️  You need a Yelp API key!")
print("   Get it from: https://www.yelp.com/developers/v3/manage_app\n")

existing = check_existing_yelp_data()
print(f"📊 {existing} venues already have Yelp IDs")

if existing > 0:
    print(f"   We can use those to get menu URLs directly!\n")

# For now, let's just use existing yelp_id to build menu URLs
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Using existing Yelp data to generate menu URLs...\n")

cursor.execute("""
    SELECT id, name, yelp_id, yelp_url
    FROM venues
    WHERE menu_url IS NULL
    AND yelp_id IS NOT NULL
    AND category IN ('restaurant', 'lounge', 'cafe', 'bar')
    AND city IN (
        'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
        'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia'
    )
""")

venues_with_yelp = cursor.fetchall()

print(f"📊 Found {len(venues_with_yelp)} venues with Yelp data")

if len(venues_with_yelp) > 0:
    print("\nGenerating menu URLs from Yelp...\n")
    
    for venue_id, name, yelp_id, yelp_url in venues_with_yelp:
        # Yelp menu URL format: https://www.yelp.com/menu/[business-name-city]/[category]
        # Simpler: just append /menu to yelp_url
        if yelp_url:
            menu_url = f"{yelp_url.rstrip('/')}/menu"
            
            cursor.execute("UPDATE venues SET menu_url = ? WHERE id = ?", (menu_url, venue_id))
            print(f"✅ [{venue_id}] {name} → {menu_url}")
    
    conn.commit()
    print(f"\n✅ Updated {len(venues_with_yelp)} menu URLs from Yelp data")

conn.close()

print(f"\n{'='*60}")
print(f"🎯 NEXT STEP: OpenAI tagging for ALL venues!")

