#!/bin/bash

echo "=== CHECKING COMMENT DATA ==="

echo ""
echo "1. WHAT'S IN THE DATABASE:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.schema crowd_photos
SQL

echo ""
echo "2. SAMPLE POST WITH COMMENTS:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode line
SELECT 
  v.name,
  cp.posted_by_username,
  cp.caption,
  cp.comment_count,
  cp.like_count
FROM crowd_photos cp
JOIN venues v ON v.id = cp.venue_id
WHERE cp.comment_count > 10
LIMIT 1;
SQL

echo ""
echo "3. CHECK RAW SCRAPE DATA:"
echo "Sample from batch 1:"
cat crowd_posts_batch_1.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
post = data[0] if data else {}
print('Available fields:', list(post.keys()))
print()
print('Has comments field?', 'comments' in post)
print('Has commentCount?', 'commentCount' in post)
if 'commentCount' in post:
    print(f'Comment count: {post[\"commentCount\"]}')
"
