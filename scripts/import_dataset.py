import sqlite3
import json
import os

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
DATASET_PATH = '/opt/viberyte/lumina-web/results.json'

def import_data():
    if not os.path.exists(DATASET_PATH):
        print(f"❌ Still can't find {DATASET_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Map handles to IDs
    cursor.execute("SELECT id, LOWER(REPLACE(instagram_handle, '@', '')) FROM venues")
    venue_map = {row[1]: row[0] for row in cursor.fetchall() if row[1]}

    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)

    added = 0
    for item in data:
        handle = item.get('ownerUsername', '').lower()
        if handle in venue_map:
            cursor.execute("""
                INSERT OR IGNORE INTO venue_instagram_media 
                (venue_id, instagram_handle, post_id, media_type, media_url, thumbnail_url, caption, posted_at, instagram_permalink)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                venue_map[handle], handle, item.get('id'),
                'video' if item.get('type') == 'Video' else 'photo',
                item.get('displayUrl'), item.get('displayUrl'), 
                item.get('caption', '')[:500], item.get('timestamp'), item.get('url')
            ))
            if cursor.rowcount > 0: added += 1

    conn.commit()
    conn.close()
    print(f"✅ Successfully imported {added} new posts.")

if __name__ == "__main__":
    import_data()
