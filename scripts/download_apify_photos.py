#!/usr/bin/env python3
import requests
import os
import time

APIFY_TOKEN = "apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"
DATASET_ID = "XpjsUCBRNNPkJm6mq"
OUTPUT_DIR = "/mnt/HC_Volume_104366905/lumina_media/instagram"

print("📥 Fetching Apify dataset...")
offset = 0
limit = 1000
all_items = []

while True:
    url = f"https://api.apify.com/v2/datasets/{DATASET_ID}/items?token={APIFY_TOKEN}&limit={limit}&offset={offset}"
    response = requests.get(url)
    items = response.json()
    if not items:
        break
    all_items.extend(items)
    print(f"  Fetched {len(all_items)} items...")
    offset += limit

photos = [i for i in all_items if i.get('type') == 'Image']
print(f"\n📸 Downloading {len(photos)} photos...")

downloaded = 0
failed = 0

for item in photos:
    post_id = item.get('id')
    display_url = item.get('displayUrl')
    
    if not display_url:
        failed += 1
        continue
    
    filename = f"apify_{post_id}.jpg"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    if os.path.exists(filepath):
        downloaded += 1
        continue
    
    try:
        resp = requests.get(display_url, timeout=30)
        if resp.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(resp.content)
            downloaded += 1
            if downloaded % 50 == 0:
                print(f"  ✅ {downloaded}/{len(photos)}")
        else:
            failed += 1
    except:
        failed += 1
    
    time.sleep(0.05)

print(f"\n🎉 Done! Downloaded: {downloaded}, Failed: {failed}")
