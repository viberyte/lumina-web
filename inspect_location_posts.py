#!/usr/bin/env python3
import json

with open('location_posts_sample.json', 'r') as f:
    results = json.load(f)

print(f"=== LOCATION POSTS DATA STRUCTURE ===\n")
print(f"Total posts: {len(results)}\n")

if results:
    print("First post structure:")
    print(json.dumps(results[0], indent=2))
    
    print(f"\n{'='*60}\n")
    print("All available fields:")
    for key in results[0].keys():
        print(f"  - {key}")

