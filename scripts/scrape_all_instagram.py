#!/usr/bin/env python3
import sqlite3
import requests
import time
import sys

# --- CONFIGURATION ---
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_KEY = 'apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW'
BATCH_SIZE = 30  # Optimized to stay under Apify memory limits

def get_next_batch():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, instagram_handle FROM venues 
        WHERE instagram_handle IS NOT NULL 
        AND instagram_handle != '' 
        AND instagram_scrape_attempted = 0 
        LIMIT ?
    """, (BATCH_SIZE,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def mark_attempted(ids):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executemany("UPDATE venues SET instagram_scrape_attempted = 1 WHERE id = ?", [(i,) for i in ids])
    conn.commit()
    conn.close()

def main():
    print("🌙 Lumina Scraper: Precision Mode Active")
    
    while True:
        venues = get_next_batch()
        if not venues:
            print("🎉 No venues left to scrape!")
            break
        
        v_ids = [v[0] for v in venues]
        # Map handles to IDs for lookup after scrape
        handle_map = {v[1].replace('@','').strip().lower(): v[0] for v in venues}
        handles = list(handle_map.keys())
        
        # Protect budget: Mark them as attempted before the API call
        mark_attempted(v_ids)
        print(f"\n📦 Starting Batch ({len(handles)} venues)")

        # Use the Profile Scraper (apify~instagram-scraper) to avoid tagged noise
        url = "https://api.apify.com/v2/acts/apify~instagram-scraper/runs"
        payload = {
            "usernames": handles,
            "resultsLimit": 15,
            "resultsType": "posts"
        }
        
        res = requests.post(url, json=payload, params={"token": APIFY_KEY})
        if res.status_code != 201:
            print(f"❌ API Error: {res.text}")
            continue

        data = res.json()
        run_id, ds_id = data['data']['id'], data['data']['defaultDatasetId']
        print(f"⏳ Run: {run_id} | Dataset: {ds_id}")
        
        # Polling
        while True:
            status = requests.get(f"https://api.apify.com/v2/actor-runs/{run_id}", params={"token": APIFY_KEY}).json()['data']['status']
            if status == 'SUCCEEDED':
                print(" ✅ Success!")
                break
            if status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
                print(f" ❌ {status}")
                break
            sys.stdout.write('.')
            sys.stdout.flush()
            time.sleep(15)

        # Download results
        items = requests.get(f"https://api.apify.com/v2/datasets/{ds_id}/items", params={"token": APIFY_KEY}).json()
        
        conn = sqlite3.connect(DB_PATH)
        curr = conn.cursor()
        saved = 0
        
        for item in items:
            owner = item.get('ownerUsername', '').lower()
            if owner in handle_map:
                v_id = handle_map[owner]
                curr.execute("""
                    INSERT OR IGNORE INTO venue_instagram_media 
                    (venue_id, instagram_handle, post_id, media_type, media_url, thumbnail_url, caption, posted_at, instagram_permalink)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    v_id, owner, item.get('id'), 
                    'video' if item.get('type') == 'Video' else 'photo',
                    item.get('displayUrl'), item.get('displayUrl'), 
                    item.get('caption', '')[:500], item.get('timestamp'), item.get('url')
                ))
                if curr.rowcount > 0: saved += 1
        
        conn.commit()
        conn.close()
        print(f"💾 Saved {saved} new posts.")
        time.sleep(5)

if __name__ == "__main__":
    main()
