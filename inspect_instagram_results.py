#!/usr/bin/env python3
import json

# Load results
with open('instagram_location_ids_batch1.json', 'r') as f:
    results = json.load(f)

print(f"=== INSTAGRAM SCRAPER FIELDS ===\n")
print(f"Total results: {len(results)}\n")

# Show all available fields
if results:
    print("Available fields in each result:")
    print("="*60)
    for key in results[0].keys():
        print(f"  - {key}")
    
    print(f"\n{'='*60}\n")
    print("FULL FIRST RESULT:")
    print(json.dumps(results[0], indent=2))
    
    print(f"\n{'='*60}\n")
    print("Checking for location data...")
    
    for i, result in enumerate(results[:5]):
        username = result.get('username')
        
        # Check various location-related fields
        location_fields = {
            'locationId': result.get('locationId'),
            'address': result.get('address'),
            'businessAddress': result.get('businessAddress'),
            'location': result.get('location'),
            'city': result.get('city'),
            'zip': result.get('zip')
        }
        
        print(f"\n[{i+1}] @{username}:")
        for field, value in location_fields.items():
            if value:
                print(f"  ✅ {field}: {value}")

