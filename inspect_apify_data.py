#!/usr/bin/env python3
import requests
import json

DATASET_URL = 'https://api.apify.com/v2/datasets/Qc8icqZpX3CNzHmiS/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

response = requests.get(DATASET_URL)
results = response.json()

print(f"Total results: {len(results)}\n")
print("First 3 items structure:\n")
print(json.dumps(results[:3], indent=2))
