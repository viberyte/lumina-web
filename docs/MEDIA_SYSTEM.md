# Lumina Media System Documentation

## Overview
This document describes how media (photos, videos, thumbnails) flows through Lumina.

## Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  venues table                                                    │
│    - google_photos: JSON array of local paths                   │
│      e.g., ["/venue-photos/venue-618-1.jpg", ...]               │
│                                                                  │
│  venue_instagram_media table  ← PRIMARY SOURCE FOR IG CONTENT   │
│    - venue_id: links to venues.id                               │
│    - media_type: "image" or "video"                             │
│    - media_url: LOCAL path e.g., "/media/instagram/1599.mp4"    │
│    - thumbnail_url: can be ignored (we generate our own)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILE SYSTEM                                 │
├─────────────────────────────────────────────────────────────────┤
│  /opt/viberyte/lumina-web/public/                               │
│    ├── venue-photos/          ← Google photos (downloaded)      │
│    │     └── venue-{id}-{n}.jpg                                 │
│    ├── media/                                                    │
│    │     ├── instagram/       ← Instagram media (downloaded)    │
│    │     │     ├── {id}.jpg   (images)                          │
│    │     │     └── {id}.mp4   (videos)                          │
│    │     └── thumbnails/      ← Auto-generated video thumbnails │
│    │           └── {id}.jpg   (from videos)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API                                      │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/venues/[id]                                           │
│                                                                  │
│  Returns:                                                        │
│  {                                                               │
│    "google_photos": ["/venue-photos/venue-618-1.jpg", ...],     │
│    "instagram_media": [                                          │
│      {                                                           │
│        "id": 1599,                                               │
│        "type": "video",                                          │
│        "url": "/media/instagram/1599.mp4",                      │
│        "thumbnail": "/media/thumbnails/1599.jpg"                │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
│                                                                  │
│  IMPORTANT: professional_photos field is DELETED from response  │
│  (it contains expired Instagram CDN URLs - do not use!)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP                                    │
├─────────────────────────────────────────────────────────────────┤
│  photoHelper.ts - SINGLE SOURCE OF TRUTH for media resolution   │
│                                                                  │
│  Rules:                                                          │
│  1. Only use LOCAL paths (start with "/" or "lumina.viberyte")  │
│  2. NEVER use Instagram CDN URLs (cdninstagram.com, fbcdn.net)  │
│  3. Priority: google_photos > instagram_media > gallery_photos  │
│  4. Videos get thumbnails from /media/thumbnails/{id}.jpg       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Files

### Server-side
- `/opt/viberyte/lumina-web/app/api/venues/[id]/route.ts` - Venue API
- `/opt/viberyte/lumina-web/scripts/generate-thumbnails.sh` - Thumbnail generator
- `/opt/viberyte/lumina-web/scripts/api-health-check.sh` - API health check

### Mobile-side  
- `utils/photoHelper.ts` - Media resolution (ONLY place to resolve media URLs)
- `components/VibeMediaViewer.tsx` - Fullscreen media viewer with video playback

## Adding New Instagram Media

When scraping new Instagram content:

1. Download media to `/public/media/instagram/{id}.jpg` or `.mp4`
2. Insert into `venue_instagram_media` table with LOCAL path
3. Run thumbnail generation: `./scripts/generate-thumbnails.sh`
```sql
INSERT INTO venue_instagram_media (venue_id, media_type, media_url, posted_at)
VALUES (618, 'video', '/media/instagram/99999.mp4', datetime('now'));
```

## NEVER DO THIS
- ❌ Store Instagram CDN URLs in database (they expire!)
- ❌ Use `professional_photos` field (deprecated, has CDN URLs)
- ❌ Resolve media URLs anywhere except `photoHelper.ts`
- ❌ Mount `<Video>` components without thumbnails

## Maintenance Scripts
```bash
# Generate thumbnails for new videos
./scripts/generate-thumbnails.sh

# Check API health
./scripts/api-health-check.sh

# Count media
ls public/media/instagram/*.mp4 | wc -l  # Videos
ls public/media/instagram/*.jpg | wc -l  # Images
ls public/media/thumbnails/*.jpg | wc -l # Thumbnails
```

## Troubleshooting

### Videos not showing thumbnails
1. Check if thumbnail exists: `ls public/media/thumbnails/{id}.jpg`
2. If not, run: `./scripts/generate-thumbnails.sh`

### Photos showing "coming soon"
1. Check API response: `curl https://lumina.viberyte.com/api/venues/{id}`
2. Verify `google_photos` or `instagram_media` arrays are populated
3. Check file exists: `ls public/venue-photos/venue-{id}-*.jpg`

### Instagram media not loading
1. Verify local file exists: `ls public/media/instagram/{id}.*`
2. Check `venue_instagram_media` table has correct LOCAL path
3. NEVER use CDN URLs - they expire within hours!
