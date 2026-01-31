#!/usr/bin/env python3
import sqlite3
import csv
from datetime import datetime

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
CSV_PATH = '/opt/viberyte/lumina-web/missing_venues.csv'

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Read the CSV
created_count = 0
skipped_count = 0
skipped_venues = []

print("=== CREATING MISSING VENUES ===\n")

with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        venue_name = row['venue_name']
        city = row['city']
        neighborhood = row['neighborhood'] if row['neighborhood'] else None
        event_count = int(row['event_count'])
        music_genres = row['music_genres']
        
        # Skip obvious junk venues
        skip_list = ['preferences', 'Venue TBA', 'New York NY US', 'public records']
        if venue_name in skip_list:
            print(f"⏭️  SKIPPING: {venue_name} (junk data)")
            skipped_count += 1
            skipped_venues.append(venue_name)
            continue
        
        # Determine category from music genres
        category = 'nightclub'
        if music_genres:
            if 'Jazz' in music_genres or 'Live Music' in music_genres:
                category = 'live_music'
            elif 'Latin' in music_genres or 'Afrobeats' in music_genres:
                category = 'nightclub'
            elif 'House' in music_genres or 'EDM' in music_genres:
                category = 'nightclub'
        
        # Create basic venue record
        try:
            cursor.execute("""
                INSERT INTO venues (
                    name, city, neighborhood, category, 
                    music_genres, recheck_flag, created_at
                ) VALUES (?, ?, ?, ?, ?, 1, ?)
            """, (
                venue_name,
                city,
                neighborhood,
                category,
                music_genres,
                datetime.now().isoformat()
            ))
            
            created_count += 1
            print(f"✅ Created: {venue_name} ({city}) - {event_count} events - category: {category}")
            
        except sqlite3.IntegrityError as e:
            print(f"⚠️  Already exists: {venue_name}")
            continue

# Commit changes
conn.commit()

print(f"\n=== SUMMARY ===")
print(f"✅ Created: {created_count} venues")
print(f"⏭️  Skipped: {skipped_count} junk venues")
if skipped_venues:
    print(f"   Junk list: {', '.join(skipped_venues)}")
print(f"\n🎯 All new venues marked with recheck_flag=1 for enrichment")

conn.close()
