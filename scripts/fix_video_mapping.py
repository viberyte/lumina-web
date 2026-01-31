import sqlite3
import requests
import os
import time
import re

DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db"
SAVE_DIR = "/mnt/HC_Volume_104366905/lumina_media/instagram"
APIFY_URL = "https://api.apify.com/v2/datasets/za1KZkejkgkicqEQq/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"

def get_shortcode_from_url(url):
    """Extract shortcode from Instagram permalink"""
    if not url:
        return None
    match = re.search(r'/p/([^/]+)/', url)
    if match:
        return match.group(1)
    match = re.search(r'/reel/([^/]+)/', url)
    if match:
        return match.group(1)
    return None

def fix_videos():
    print("🔄 Fetching Apify data...")
    response = requests.get(APIFY_URL)
    if response.status_code != 200:
        print("❌ Failed to fetch Apify data")
        return
    
    apify_items = response.json()
    print(f"📦 Got {len(apify_items)} items from Apify")
    
    # Build lookup by shortcode
    apify_lookup = {}
    for item in apify_items:
        shortcode = item.get('shortCode') or get_shortcode_from_url(item.get('url'))
        if shortcode and item.get('videoUrl'):
            apify_lookup[shortcode] = item['videoUrl']
    
    print(f"🎬 Found {len(apify_lookup)} videos with shortcodes")
    
    # Get all video records from database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, instagram_handle, media_url, instagram_permalink 
        FROM venue_instagram_media 
        WHERE media_type = 'video' AND instagram_permalink IS NOT NULL
    """)
    
    videos = cursor.fetchall()
    print(f"📊 Found {len(videos)} video records in database")
    
    fixed = 0
    skipped = 0
    not_found = 0
    
    for db_id, handle, media_url, permalink in videos:
        shortcode = get_shortcode_from_url(permalink)
        if not shortcode:
            skipped += 1
            continue
        
        video_url = apify_lookup.get(shortcode)
        if not video_url:
            not_found += 1
            continue
        
        # Get expected filename from media_url
        filename = os.path.basename(media_url)  # e.g., "2626.mp4"
        filepath = os.path.join(SAVE_DIR, filename)
        
        # Re-download the correct video
        try:
            print(f"[{fixed+1}] Fixing {filename} for @{handle} (shortcode: {shortcode})")
            r = requests.get(video_url, stream=True, timeout=30)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        f.write(chunk)
                fixed += 1
            time.sleep(0.2)
        except Exception as e:
            print(f"⚠️ Error: {e}")
    
    conn.close()
    print(f"\n✅ Done! Fixed: {fixed}, Skipped: {skipped}, Not Found in Apify: {not_found}")

if __name__ == "__main__":
    fix_videos()
