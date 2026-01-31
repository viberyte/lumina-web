#!/usr/bin/env python3
import json

with open('instagram_location_ids_batch1.json', 'r') as f:
    results = json.load(f)

print("=== CHECKING FOR LOCATION DATA IN POSTS ===\n")

found_locations = 0

for result in results[:10]:
    username = result.get('username')
    posts = result.get('latestPosts', [])
    
    print(f"@{username}:")
    
    if posts:
        for i, post in enumerate(posts[:3]):
            # Check all fields in post
            if i == 0:
                print(f"  Post fields: {list(post.keys())}")
            
            # Look for location-related fields
            location_data = {k: v for k, v in post.items() if 'location' in k.lower()}
            if location_data:
                print(f"  ✅ FOUND: {location_data}")
                found_locations += 1
    print()

print(f"{'='*60}")
print(f"Found location data in: {found_locations} posts")
print(f"\nIf 0 locations found, we need a different approach!")

