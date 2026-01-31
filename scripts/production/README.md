# Lumina Production Scripts

## Version History

### December 24, 2025

#### 1. Instagram Crowd Scraper v1.0
**File:** `instagram_crowd_scraper_v1_20251224.py`
**Purpose:** Scrape authentic customer posts from Instagram location pages
**Actor:** `apidojo~instagram-location-scraper`
**Output:** ~25 crowd photos per venue (28,000+ total)
**Database:** Saves to `crowd_photos` table

**Usage:**
```bash
python3 instagram_crowd_scraper_v1_20251224.py
```

#### 2. OpenAI Venue Enhancement v2.0
**File:** `openai_venue_enhancement_v2_20251224.py`
**Purpose:** AI-tag all venues with cuisines, styles, occasions, vibes
**Model:** `ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2`
**Schema:** `LUMINA_COMPLETE_TAGS.json`
**Output:** Complete venue intelligence (100% coverage)

**Usage:**
```bash
python3 openai_venue_enhancement_v2_20251224.py
```

## Database Schema

### Tables Created/Updated
- `venues` - Enhanced with AI tags
- `crowd_photos` - Customer Instagram posts by location

### Key Fields
- `cuisine_primary`, `cuisine_style` - "upscale Italian"
- `primary_vibes` - JSON array of vibes
- `best_for` - JSON array of occasions
- `energy_level`, `dress_code`, `acoustic_band`
- `enhancement_version` - "lumina-v2-master-schema"

## Notes
- Both scripts are production-ready
- Idempotent - safe to re-run
- Rate limited for API compliance
- Save batch files for recovery
