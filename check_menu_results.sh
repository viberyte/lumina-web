#!/bin/bash

echo "=== CHECKING MENU SCRAPE RESULTS ==="

echo ""
echo "Total results:"
cat menu_scrape_results.json | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'{len(data)} venues')"

echo ""
echo "Sample data (first 5 venues):"
cat menu_scrape_results.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for i, item in enumerate(data[:5]):
    print(f'\n[{i+1}] {item.get(\"title\", \"N/A\")}')
    print(f'  Website: {item.get(\"website\", \"N/A\")}')
    print(f'  Google URL: {item.get(\"url\", \"N/A\")}')
"

echo ""
echo "How many have websites:"
cat menu_scrape_results.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
with_website = sum(1 for item in data if item.get('website'))
print(f'{with_website}/{len(data)} venues have websites')
"
