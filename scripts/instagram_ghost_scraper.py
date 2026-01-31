#!/usr/bin/env python3
"""
Instagram Ghost Session Scraper for Lumina
Uses web_profile_info API with session persistence and anti-detection
"""

import requests
import sqlite3
import time
import random
import json
from datetime import datetime

# Configuration
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
POSTS_PER_VENUE = 15

# Real-world User-Agents to rotate
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
]

class RobustInstagramScraper:
    def __init__(self):
        self.session = requests.Session()
        self.update_headers()
        # Initialize session with cookies
        self._init_session()

    def update_headers(self):
        """Rotate User-Agent and simulate browser session"""
        self.session.headers.update({
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'X-IG-App-ID': '936619743392459',  # Public Instagram Web App ID
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.instagram.com/',
            'Origin': 'https://www.instagram.com',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        })

    def _init_session(self):
        """Initialize session by visiting Instagram homepage to get cookies"""
        try:
            response = self.session.get('https://www.instagram.com/', timeout=10)
            print(f"🔐 Session initialized. Cookies: {len(self.session.cookies)}")
            time.sleep(random.uniform(2, 4))
        except Exception as e:
            print(f"⚠️  Session init warning: {e}")

    def get_venue_data(self, username):
        """Scrape using the web_profile_info API endpoint"""
        url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
        
        try:
            # Random human-like delay
            time.sleep(random.uniform(3, 7))
            
            response = self.session.get(url, timeout=15)
            
            if response.status_code == 404:
                print(f"🚫 @{username} not found")
                return None
            
            if response.status_code == 429:
                print("⚠️  Rate limited! Cooling down 5 minutes...")
                time.sleep(300)
                return None
            
            if response.status_code == 401:
                print("⚠️  Login required. Refreshing session...")
                self._init_session()
                return None
            
            if response.status_code != 200:
                print(f"⚠️  Status {response.status_code} for @{username}")
                return None
            
            return response.json()
            
        except requests.exceptions.Timeout:
            print(f"⏱️  Timeout for @{username}")
            return None
        except Exception as e:
            print(f"⚠️  Error for @{username}: {e}")
            return None

    def extract_posts(self, profile_data, username):
        """Extract posts from web_profile_info response"""
        posts = []
        
        try:
            user_data = profile_data.get('data', {}).get('user', {})
            
            if not user_data:
                return posts
            
            # Get timeline media
            timeline = user_data.get('edge_owner_to_timeline_media', {})
            edges = timeline.get('edges', [])
            
            for edge in edges[:POSTS_PER_VENUE]:
                node = edge.get('node', {})
                shortcode = node.get('shortcode', '')
                
                if not shortcode:
                    continue
                
                # Determine media type
                is_video = node.get('is_video', False)
                typename = node.get('__typename', '')
                
                if is_video:
                    media_type = 'video'
                elif typename == 'GraphSidecar':
                    media_type = 'carousel'
                else:
                    media_type = 'photo'
                
                # Extract caption
                caption_edges = node.get('edge_media_to_caption', {}).get('edges', [])
                caption = caption_edges[0].get('node', {}).get('text', '') if caption_edges else ''
                
                post = {
                    'shortcode': shortcode,
                    'post_url': f"https://www.instagram.com/p/{shortcode}/",
                    'web_view_url': f"https://www.instagram.com/p/{shortcode}/embed/",
                    'media_type': media_type,
                    'caption': caption,
                    'likes': node.get('edge_liked_by', {}).get('count', 0),
                    'comments': node.get('edge_media_to_comment', {}).get('count', 0),
                    'timestamp': datetime.fromtimestamp(node.get('taken_at_timestamp', 0)).isoformat(),
                    'thumbnail_url': node.get('display_url', ''),
                    'owner_username': username
                }
                
                posts.append(post)
        
        except Exception as e:
            print(f"⚠️  Extraction error: {e}")
        
        return posts


def get_venues_with_instagram():
    """Get venues with Instagram handles"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""
        SELECT id, name, instagram_handle 
        FROM venues 
        WHERE instagram_handle IS NOT NULL 
        AND instagram_handle != ''
        ORDER BY id
    """)
    
    venues = c.fetchall()
    conn.close()
    return venues


def save_posts_to_db(posts, venue_id):
    """Save posts to database"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS instagram_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id INTEGER,
            post_url TEXT UNIQUE,
            web_view_url TEXT,
            media_type TEXT,
            caption TEXT,
            likes INTEGER,
            comments INTEGER,
            timestamp TEXT,
            thumbnail_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venue_id) REFERENCES venues(id)
        )
    """)
    
    saved = 0
    
    for post in posts:
        try:
            c.execute("""
                INSERT OR IGNORE INTO instagram_posts 
                (venue_id, post_url, web_view_url, media_type, caption, 
                 likes, comments, timestamp, thumbnail_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                venue_id, post['post_url'], post['web_view_url'],
                post['media_type'], post['caption'], post['likes'],
                post['comments'], post['timestamp'], post['thumbnail_url']
            ))
            
            if c.rowcount > 0:
                saved += 1
        except:
            continue
    
    conn.commit()
    conn.close()
    return saved


def main():
    print("=" * 60)
    print("👻 INSTAGRAM GHOST SESSION SCRAPER")
    print("=" * 60)
    
    venues = get_venues_with_instagram()
    print(f"\n📍 Found {len(venues)} venues\n")
    
    if not venues:
        return
    
    scraper = RobustInstagramScraper()
    
    total_posts = 0
    total_saved = 0
    failed_count = 0
    
    for i, (venue_id, venue_name, instagram_handle) in enumerate(venues, 1):
        print(f"\n{'='*60}")
        print(f"[{i}/{len(venues)}] 📍 {venue_name}")
        print(f"{'='*60}")
        print(f"Instagram: @{instagram_handle}")
        
        profile_data = scraper.get_venue_data(instagram_handle)
        
        if not profile_data:
            failed_count += 1
            continue
        
        posts = scraper.extract_posts(profile_data, instagram_handle)
        
        if not posts:
            print("⚠️  No posts found")
            continue
        
        print(f"📸 Found {len(posts)} posts")
        
        saved = save_posts_to_db(posts, venue_id)
        total_posts += len(posts)
        total_saved += saved
        
        print(f"💾 Saved {saved} new posts")
        print(f"\n📊 Progress: {i}/{len(venues)} | Posts: {total_posts} | Saved: {total_saved} | Failed: {failed_count}")
    
    print("\n" + "=" * 60)
    print("✅ SCRAPING COMPLETE!")
    print("=" * 60)
    print(f"📍 Processed: {len(venues)}")
    print(f"📸 Posts: {total_posts}")
    print(f"💾 Saved: {total_saved}")
    print(f"❌ Failed: {failed_count}")

if __name__ == "__main__":
    main()
