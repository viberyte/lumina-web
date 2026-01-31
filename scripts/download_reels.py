import sqlite3
import requests
import os
import time

# Configuration
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
BASE_SAVE_PATH = '/opt/viberyte/lumina-web/public/media/venues'

def download_reels():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get all video URLs that haven't been downloaded yet
    cur.execute("""
        SELECT m.id, v.id, m.media_url 
        FROM venue_instagram_media m
        JOIN venues v ON m.venue_id = v.id
        WHERE m.media_type = 'VIDEO' AND m.media_url LIKE 'http%'
    """)
    
    videos = cur.fetchall()
    total = len(videos)
    print(f"📦 Found {total} videos to archive...")

    for index, (media_id, venue_id, url) in enumerate(videos, 1):
        try:
            # Create venue-specific folder
            venue_dir = os.path.join(BASE_SAVE_PATH, str(venue_id))
            os.makedirs(venue_dir, exist_ok=True)
            
            # Create file name
            filename = f"reel_{media_id}.mp4"
            filepath = os.path.join(venue_dir, filename)
            
            # Local URL for the database
            local_url = f"/media/venues/{venue_id}/{filename}"

            print(f"[{index}/{total}] Downloading to: {local_url}")

            # Download the file
            r = requests.get(url, stream=True, timeout=10)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        if chunk: f.write(chunk)
                
                # Update the database to point to the LOCAL file instead of the URL
                cur.execute("UPDATE venue_instagram_media SET media_url = ? WHERE id = ?", (local_url, media_id))
                conn.commit()
            else:
                print(f"❌ Failed to download {media_id}: Status {r.status_code}")

            # Safety sleep to avoid IP bans
            if index % 10 == 0: time.sleep(1)

        except Exception as e:
            print(f"⚠️ Error downloading {media_id}: {e}")

    conn.close()
    print("✅ All videos successfully archived to local storage!")

if __name__ == "__main__":
    download_reels()
