import sqlite3
import json

def beautify():
    conn = sqlite3.connect('/opt/viberyte/lumina-web/data/lumina.db')
    cur = conn.cursor()

    # Check if the column exists, if not, add it
    try:
        cur.execute("ALTER TABLE venue_intelligence ADD COLUMN vibe_tags TEXT;")
    except:
        pass # Column already exists

    cur.execute("SELECT venue_id, weekly_specials_json FROM venue_intelligence")
    rows = cur.fetchall()

    print(f"✨ Beautifying {len(rows)} venues...")

    for v_id, raw_json in rows:
        try:
            data = json.loads(raw_json)
            tags = []

            # Extract Dress Code
            if data.get('dress_code'):
                tags.append(data['dress_code'])

            # Extract Music
            music = data.get('music', [])
            if isinstance(music, list):
                tags.extend(music)

            # Extract Lit Days
            lit_days = data.get('lit_days', [])
            if isinstance(lit_days, list):
                tags.extend([f"{d} Night" for d in lit_days])

            # Clean up: Remove duplicates and empty strings
            clean_list = list(set([str(t).strip() for t in tags if t]))
            vibe_string = ", ".join(clean_list)

            cur.execute("UPDATE venue_intelligence SET vibe_tags = ? WHERE venue_id = ?", (vibe_string, v_id))
        except Exception as e:
            print(f"⚠️ Error cleaning ID {v_id}: {e}")

    conn.commit()
    conn.close()
    print("✅ Done! Your mobile app can now display clean vibe tags.")

if __name__ == "__main__":
    beautify()

