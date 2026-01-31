import sqlite3
import requests
import json

# Your Apify Dataset URL
DATASET_URL = "https://api.apify.com/v2/datasets/za1KZkejkgkicqEQq/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"

def import_reels():
    print("🚀 Fetching fresh Reels from Apify...")
    response = requests.get(DATASET_URL)
    items = response.json()
    
    conn = sqlite3.connect('/opt/viberyte/lumina-web/data/lumina.db')
    cur = conn.cursor()
    
    count = 0
    for item in items:
        # Get the handle to find the venue_id
        handle = item.get('ownerUsername')
        video_url = item.get('videoUrl') # This is the REAL .mp4 link
        post_url = item.get('url')      # The Instagram link for the Webview
        caption = item.get('caption', '')
        timestamp = item.get('timestamp')

        if not video_url or not handle:
            continue

        # Find the venue_id based on the IG handle
        cur.execute("SELECT id FROM venues WHERE instagram_handle = ?", (handle,))
        venue = cur.fetchone()
        
        if venue:
            venue_id = venue[0]
            # Insert or Update the media
            cur.execute("""
                INSERT INTO venue_instagram_media 
                (venue_id, media_url, media_type, instagram_url, caption, timestamp)
                VALUES (?, ?, 'VIDEO', ?, ?, ?)
            """, (venue_id, video_url, post_url, caption, timestamp))
            count += 1

    conn.commit()
    conn.close()
    print(f"✅ Successfully imported {count} REAL Reels!")

if __name__ == "__main__":
    import_reels()
