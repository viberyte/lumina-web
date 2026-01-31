#!/usr/bin/env python3
"""
Instagram Embed API Scraper for Lumina
Uses Instagram's public embed API - FREE & UNLIMITED
Scrapes 15 posts per venue with photos, videos, captions
"""

import sqlite3
import requests
import json
import time
from datetime import datetime
import re

# Configuration
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
POSTS_PER_VENUE = 15
DELAY_BETWEEN_REQUESTS = 2  # seconds to avoid rate limits

def get_venues_with_instagram():
    """Get all venues with Instagram handles"""
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

def get_instagram_profile_data(username):
    """Scrape Instagram profile using embed API"""
    
    try:
        # Instagram's public API endpoint
        url = f"https://www.instagram.com/{username}/?__a=1&__d=dis"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/json',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            print(f"⚠️  Status {response.status_code} for @{username}")
            return None
            
    except Exception as e:
        print(f"⚠️  Error scraping @{username}: {e}")
        return None

def extract_posts_from_profile(profile_data, username):
    """Extract post data from Instagram profile JSON"""
    
    posts = []
    
    try:
        # Navigate the Instagram JSON structure
        user_data = profile_data.get('graphql', {}).get('user', {})
        
        if not user_data:
            # Try alternative structure
            user_data = profile_data.get('data', {}).get('user', {})
        
        if not user_data:
            return posts
        
        # Get posts from edge_owner_to_timeline_media
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
            
            # Extract post data
            post = {
                'shortcode': shortcode,
                'post_url': f"https://www.instagram.com/p/{shortcode}/",
                'web_view_url': f"https://www.instagram.com/p/{shortcode}/embed/",
                'media_type': media_type,
                'caption': node.get('edge_media_to_caption', {}).get('edges', [{}])[0].get('node', {}).get('text', ''),
                'likes': node.get('edge_liked_by', {}).get('count', 0),
                'comments': node.get('edge_media_to_comment', {}).get('count', 0),
                'timestamp': datetime.fromtimestamp(node.get('taken_at_timestamp', 0)).isoformat(),
                'thumbnail_url': node.get('display_url', ''),
                'owner_username': username
            }
            
            posts.append(post)
    
    except Exception as e:
        print(f"⚠️  Error extracting posts: {e}")
    
    return posts

def save_posts_to_db(posts, venue_id):
    """Save posts to database"""
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Create table if not exists
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
                venue_id,
                post['post_url'],
                post['web_view_url'],
                post['media_type'],
                post['caption'],
                post['likes'],
                post['comments'],
                post['timestamp'],
                post['thumbnail_url']
            ))
            
            if c.rowcount > 0:
                saved += 1
        
        except Exception as e:
            continue
    
    conn.commit()
    conn.close()
    
    return saved

def main():
    print("=" * 60)
    print("🔥 INSTAGRAM EMBED API SCRAPER - FREE & UNLIMITED")
    print("=" * 60)
    
    # Get venues
    print("\n📍 Loading venues...")
    venues = get_venues_with_instagram()
    print(f"✅ Found {len(venues)} venues with Instagram handles\n")
    
    if len(venues) == 0:
        print("❌ No venues found!")
        return
    
    total_posts = 0
    total_saved = 0
    failed_count = 0
    
    # Process each venue
    for i, (venue_id, venue_name, instagram_handle) in enumerate(venues, 1):
        
        print(f"\n{'='*60}")
        print(f"[{i}/{len(venues)}] 📍 {venue_name}")
        print(f"{'='*60}")
        print(f"Instagram: @{instagram_handle}")
        
        # Scrape profile
        profile_data = get_instagram_profile_data(instagram_handle)
        
        if not profile_data:
            print(f"❌ Failed to scrape")
            failed_count += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)
            continue
        
        # Extract posts
        posts = extract_posts_from_profile(profile_data, instagram_handle)
        
        if not posts:
            print(f"⚠️  No posts found")
            time.sleep(DELAY_BETWEEN_REQUESTS)
            continue
        
        print(f"📸 Found {len(posts)} posts")
        
        # Save to database
        saved = save_posts_to_db(posts, venue_id)
        
        total_posts += len(posts)
        total_saved += saved
        
        print(f"💾 Saved {saved} new posts")
        print(f"\n📊 Progress: {i}/{len(venues)} | Total posts: {total_posts} | Saved: {total_saved} | Failed: {failed_count}")
        
        # Rate limit delay
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Final summary
    print("\n" + "=" * 60)
    print("✅ SCRAPING COMPLETE!")
    print("=" * 60)
    print(f"📍 Total venues processed: {len(venues)}")
    print(f"📸 Total posts found: {total_posts}")
    print(f"💾 Total posts saved: {total_saved}")
    print(f"❌ Failed venues: {failed_count}")
    print(f"\n🔗 All posts ready for web view in mobile app!")
    print(f"💰 Cost: $0.00 (FREE!)")

if __name__ == "__main__":
    main()
