const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Clear existing and recreate
db.exec(`DROP TABLE IF EXISTS venue_instagram_posts`);

db.exec(`
  CREATE TABLE venue_instagram_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER,
    instagram_handle TEXT,
    post_url TEXT,
    short_code TEXT,
    display_url TEXT,
    video_url TEXT,
    media_type TEXT,
    caption TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    posted_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id)
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_venue_ig_posts ON venue_instagram_posts(venue_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_venue_ig_handle ON venue_instagram_posts(instagram_handle)`);

// Get ALL venues with tagged posts - NO LIMIT
const venuesWithPosts = db.prepare(`
  SELECT id, name, instagram_handle, instagram_tagged_posts
  FROM venues 
  WHERE instagram_tagged_posts IS NOT NULL 
  AND instagram_tagged_posts != ''
  AND instagram_tagged_posts != '[]'
`).all();

console.log('Found ' + venuesWithPosts.length + ' venues with Instagram posts');

const insert = db.prepare(`
  INSERT INTO venue_instagram_posts 
  (venue_id, instagram_handle, post_url, short_code, display_url, video_url, media_type, caption, likes_count, comments_count, posted_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let totalInserted = 0;
let venuesProcessed = 0;

for (const venue of venuesWithPosts) {
  try {
    const posts = JSON.parse(venue.instagram_tagged_posts);
    let venueCount = 0;
    
    for (const post of posts) {
      const mediaType = post.videoUrl ? 'video' : 'image';
      
      try {
        insert.run(
          venue.id,
          venue.instagram_handle,
          post.url || '',
          post.shortCode || '',
          post.displayUrl || '',
          post.videoUrl || null,
          mediaType,
          (post.caption || '').substring(0, 500),
          post.likesCount || 0,
          post.commentsCount || 0,
          post.timestamp || ''
        );
        totalInserted++;
        venueCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
    
    venuesProcessed++;
    if (venuesProcessed % 50 === 0) {
      console.log('Processed ' + venuesProcessed + ' venues...');
    }
  } catch (e) {
    // Skip parse errors
  }
}

console.log('\n=== COMPLETE ===');
console.log('Venues processed: ' + venuesProcessed);
console.log('Total posts imported: ' + totalInserted);

// Show stats
const stats = db.prepare(`
  SELECT media_type, COUNT(*) as count 
  FROM venue_instagram_posts 
  GROUP BY media_type
`).all();

console.log('\nMedia breakdown:');
stats.forEach(s => console.log('  ' + s.media_type + ': ' + s.count));

db.close();
