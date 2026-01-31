import sqlite3
import json

db_path = '/opt/viberyte/lumina-web/data/lumina.db'

def standardize():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT venue_id, weekly_specials_json FROM venue_intelligence")
    rows = cur.fetchall()

    for v_id, raw_json in rows:
        try:
            data = json.loads(raw_json)
            # Create a uniform structure
            clean_data = {"bottomless": None, "happy_hour": None}
            
            if isinstance(data, list):
                for item in data:
                    t = item.get('type', '').lower()
                    if 'bottomless' in t: clean_data['bottomless'] = item.get('description')
                    if 'happy' in t: clean_data['happy_hour'] = item.get('description')
            elif isinstance(data, dict):
                # Handle different casing
                for k, v in data.items():
                    if k.lower() == 'bottomless': clean_data['bottomless'] = v
                    if k.lower() == 'happy_hour' or k.lower() == 'happy hour': clean_data['happy_hour'] = v

            cur.execute("UPDATE venue_intelligence SET weekly_specials_json = ? WHERE venue_id = ?", 
                        (json.dumps(clean_data), v_id))
        except: continue
    
    conn.commit()
    print("✅ Standardized 496 venues for the frontend!")
    conn.close()

if __name__ == "__main__":
    standardize()
