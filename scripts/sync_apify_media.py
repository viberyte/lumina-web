import sqlite3
import requests
import os
import time

# Configuration
APIFY_URL = "https://api.apify.com/v2/datasets/za1KZkejkgkicqEQq/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"
SAVE_DIR = "/opt/viberyte/lumina-web/public/media/instagram"

def sync_media():
    # Ensure directory exists
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    print("🌐 Fetching latest data from Apify...")
    response = requests.get(APIFY_URL)
    if response.status_code != 200:
        print("❌ Failed to reach Apify.")
        return
    
    items = response.json()
    total = len(items)
    print(f"📦 Found {total} items. Starting download to local volume...")

    for index, item in enumerate(items, 1):
        # We match the 'id' from the dataset to your '1.mp4' naming
        # If your DB IDs match the order of the dataset:
        media_id = index 
        url = item.get('videoUrl') or item.get('displayUrl')
        
        if not url:
            continue

        ext = ".mp4" if item.get('videoUrl') else ".jpg"
        filename = f"{media_id}{ext}"
        filepath = os.path.join(SAVE_DIR, filename)

        if os.path.exists(filepath):
            print(f"[{index}/{total}] Skip: {filename} already exists.")
            continue

        try:
            print(f"[{index}/{total}] Downloading {filename}...")
            r = requests.get(url, stream=True, timeout=15)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        f.write(chunk)
            
            # Small sleep to keep the connection stable
            time.sleep(0.1)
        except Exception as e:
            print(f"⚠️ Error on {filename}: {e}")

    print("\n✅ Sync Complete! Your /media/instagram folder is now populated.")

if __name__ == "__main__":
    sync_media()
import sqlite3
import requests
import os
import time

# Configuration
APIFY_URL = "https://api.apify.com/v2/datasets/za1KZkejkgkicqEQq/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"
SAVE_DIR = "/opt/viberyte/lumina-web/public/media/instagram"

def sync_media():
    # Ensure directory exists
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    print("🌐 Fetching latest data from Apify...")
    response = requests.get(APIFY_URL)
    if response.status_code != 200:
        print("❌ Failed to reach Apify.")
        return
    
    items = response.json()
    total = len(items)
    print(f"📦 Found {total} items. Starting download to local volume...")

    for index, item in enumerate(items, 1):
        # We match the 'id' from the dataset to your '1.mp4' naming
        # If your DB IDs match the order of the dataset:
        media_id = index 
        url = item.get('videoUrl') or item.get('displayUrl')
        
        if not url:
            continue

        ext = ".mp4" if item.get('videoUrl') else ".jpg"
        filename = f"{media_id}{ext}"
        filepath = os.path.join(SAVE_DIR, filename)

        if os.path.exists(filepath):
            print(f"[{index}/{total}] Skip: {filename} already exists.")
            continue

        try:
            print(f"[{index}/{total}] Downloading {filename}...")
            r = requests.get(url, stream=True, timeout=15)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        f.write(chunk)
            
            # Small sleep to keep the connection stable
            time.sleep(0.1)
        except Exception as e:
            print(f"⚠️ Error on {filename}: {e}")

    print("\n✅ Sync Complete! Your /media/instagram folder is now populated.")

if __name__ == "__main__":
    sync_media()
