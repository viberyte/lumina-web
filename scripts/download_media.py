import sqlite3
import requests
import os
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
SAVE_DIR = '/opt/viberyte/lumina-web/public/media/instagram'

def download_file():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all items that haven't been downloaded yet
    cursor.execute("""
        SELECT id, media_url, media_type FROM venue_instagram_media 
        WHERE media_url LIKE 'http%'
    """)
    rows = cursor.fetchall()
    
    print(f"📥 Found {len(rows)} items to download...")
    
    for row_id, url, m_type in rows:
        ext = '.mp4' if m_type == 'video' else '.jpg'
        filename = f"{row_id}{ext}"
        filepath = os.path.join(SAVE_DIR, filename)
        
        try:
            response = requests.get(url, stream=True, timeout=10)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # Update DB to point to the local path instead of the URL
                local_path = f"/media/instagram/{filename}"
                cursor.execute("UPDATE venue_instagram_media SET media_url = ? WHERE id = ?", (local_path, row_id))
                conn.commit()
                print(f"✅ Saved: {filename}")
            else:
                print(f"❌ Failed {row_id}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ Error downloading {row_id}: {e}")
        
        # Slow down to avoid being blocked by Instagram's CDN
        time.sleep(1)

    conn.close()

if __name__ == "__main__":
    download_file()
