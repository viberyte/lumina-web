import sqlite3
import requests
import json
import openai
import time

# --- CONFIG ---
APIFY_URL = "https://api.apify.com/v2/datasets/gbIENyEMJQ3b6StZR/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW"
OPENAI_API_KEY = "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"
MODEL_ID = "ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2"
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

client = openai.OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a Nightlife Intelligence Agent. Analyze Instagram captions to extract:
1. vibe_summary: 2 punchy sentences on energy (e.g., "Moody speakeasy with red velvet seating").
2. dress_code: Be specific (e.g., "Upscale/Heels", "Trendy/Streetwear", "Business Casual").
3. music_genres: Array of genres (e.g., ["Afrobeat", "Hip-Hop", "Tech-House"]).
4. lit_days: Array of days the venue is peak/active (e.g., ["Friday", "Saturday"]).
5. specials: JSON object for {"bottomless": "details", "happy_hour": "details"}.

Return strictly valid JSON.
"""

def process_all():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. FETCH FROM APIFY
    print("📥 Pulling fresh data from Apify...")
    try:
        r = requests.get(APIFY_URL)
        items = r.json()
        print(f"✅ Downloaded {len(items)} posts.")
    except Exception as e:
        print(f"❌ API Error: {e}")
        return

    # 2. INSERT MEDIA & MATCH TO VENUES
    print("🔗 Mapping Instagram data to Venue IDs...")
    for item in items:
        handle = item.get('ownerUsername') or item.get('input', {}).get('username')
        caption = item.get('caption', '')
        media_url = item.get('displayUrl')
        
        if handle:
            # Match handle (case-insensitive)
            cur.execute("SELECT id FROM venues WHERE LOWER(instagram_handle) IN (?, ?)", (handle.lower(), f"@{handle.lower()}"))
            venue = cur.fetchone()
            if venue:
                cur.execute("""
                    INSERT OR IGNORE INTO venue_instagram_media (venue_id, caption, media_url)
                    VALUES (?, ?, ?)
                """, (venue[0], caption, media_url))
    conn.commit()

    # 3. AI ENRICHMENT (Targeting venues with media but no intelligence yet)
    cur.execute("""
        SELECT DISTINCT v.id, v.name 
        FROM venues v
        JOIN venue_instagram_media m ON v.id = m.venue_id
        WHERE v.id NOT IN (SELECT venue_id FROM venue_intelligence)
    """)
    targets = cur.fetchall()
    print(f"🧐 Found {len(targets)} venues ready for AI analysis.")

    for v_id, v_name in targets:
        print(f"✨ Analyzing Vibe: {v_name} (ID: {v_id})...")
        
        # Get up to 15 recent captions for context
        cur.execute("SELECT caption FROM venue_instagram_media WHERE venue_id = ? AND caption IS NOT NULL LIMIT 15", (v_id,))
        captions = [c[0] for c in cur.fetchall()]
        
        if not captions: continue

        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Venue: {v_name} | Captions: {' | '.join(captions)}"}
                ],
                response_format={"type": "json_object"}
            )
            
            res_data = json.loads(response.choices[0].message.content)
            
            # Save enriched data
            cur.execute("""
                INSERT INTO venue_intelligence 
                (venue_id, ai_vibe_summary, weekly_specials_json) 
                VALUES (?, ?, ?)
            """, (
                v_id, 
                res_data.get('vibe_summary'), 
                json.dumps({
                    "dress_code": res_data.get('dress_code'),
                    "music": res_data.get('music_genres'),
                    "lit_days": res_data.get('lit_days'),
                    "deals": res_data.get('specials')
                })
            ))
            conn.commit()
            print(f"✅ {v_name} enriched with music and dress code.")
            
        except Exception as e:
            print(f"⚠️ Skipping {v_name} due to error: {e}")
            time.sleep(1) # Brief pause for rate limits

    conn.close()
    print("🚀 DATABASE FULLY ENRICHED.")

if __name__ == "__main__":
    process_all()
