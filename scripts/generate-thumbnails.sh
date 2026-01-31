#!/bin/bash

MEDIA_DIR="/opt/viberyte/lumina-web/public/media/instagram"
THUMB_DIR="/opt/viberyte/lumina-web/public/media/thumbnails"

mkdir -p "$THUMB_DIR"

echo "🎬 Generating video thumbnails..."
TOTAL=$(ls "$MEDIA_DIR"/*.mp4 2>/dev/null | wc -l)
echo "Found $TOTAL videos"

COUNT=0
SKIPPED=0
for video in "$MEDIA_DIR"/*.mp4; do
  if [ -f "$video" ]; then
    filename=$(basename "$video" .mp4)
    thumb="$THUMB_DIR/${filename}.jpg"
    
    if [ ! -f "$thumb" ]; then
      ffmpeg -i "$video" -ss 00:00:01 -vframes 1 -vf "scale=480:-1" -q:v 2 "$thumb" -y 2>/dev/null
      
      if [ ! -f "$thumb" ]; then
        ffmpeg -i "$video" -vframes 1 -vf "scale=480:-1" -q:v 2 "$thumb" -y 2>/dev/null
      fi
      
      ((COUNT++))
      if [ $((COUNT % 500)) -eq 0 ]; then
        echo "  Generated $COUNT thumbnails..."
      fi
    else
      ((SKIPPED++))
    fi
  fi
done

echo "✅ Done! Generated $COUNT new thumbnails, skipped $SKIPPED existing"
