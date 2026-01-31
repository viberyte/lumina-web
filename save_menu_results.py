#!/usr/bin/env python3
import requests
import json

APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'

# Get the completed run results
run_id = '8VCjYdrJ1SLDqSUmM'
dataset_id_response = requests.get(
    f"https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/runs/{run_id}",
    params={"token": APIFY_API_KEY}
)
dataset_id = dataset_id_response.json()['data']['defaultDatasetId']

# Download results
results = requests.get(
    f"https://api.apify.com/v2/datasets/{dataset_id}/items",
    params={"token": APIFY_API_KEY}
).json()

# Save to file
with open('menu_scrape_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"✅ Saved {len(results)} results to menu_scrape_results.json")
print(f"   Will update database after AI tagging completes")
