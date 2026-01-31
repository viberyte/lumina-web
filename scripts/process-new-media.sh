#!/bin/bash
# Run this after adding new Instagram media to generate thumbnails

echo "🔄 Processing new media..."

# Generate thumbnails for any videos without them
MEDIA_DIR="/opt/viberyte/lumina-web/public/media/instagram"
THUMB_DIR="/opt/viberyte/lumina-web/public/media/thumbnails"

mkdir -p "$THUMB_DIR"

NEW_COUNT=0
for video in "$MEDIA_DIR"/*.mp4; do
  if [ -f "$video" ]; then
    filename=$(basename "$video" .mp4)
    thumb="$THUMB_DIR/${filename}.jpg"
    
    if [ ! -f "$thumb" ]; then
      ffmpeg -i "$video" -ss 00:00:01 -vframes 1 -vf "scale=480:-1" -q:v 2 "$thumb" -y 2>/dev/null
      if [ -f "$thumb" ]; then
        ((NEW_COUNT++))
        echo "  Created thumbnail for $filename"
      fi
    fi
  fi
done

echo "✅ Generated $NEW_COUNT new thumbnails"

# Run API health check
echo ""
echo "🔍 Running API health check..."
/opt/viberyte/lumina-web/scripts/api-health-check.sh
