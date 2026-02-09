# LUMINA — FINAL PARTNER, INSTAGRAM, & DISTRIBUTION LOGIC (SOURCE OF TRUTH)
**Last Updated: February 8, 2026**

This document defines exactly how claimed vs spotlight venues work, how Instagram is used, and how distribution stays fair while still being monetizable.

---

## 1. CORE PHILOSOPHY (NON-NEGOTIABLE)

- Lumina never posts on behalf of venues
- Lumina never edits venue content
- Lumina never competes with venues' own Instagram
- Instagram access exists only to enrich the venue's Lumina presence

**Instagram is input data, not a publishing tool.**

---

## 2. PARTNER TIERS

### 🆓 CLAIMED (FREE — DEFAULT)

A venue becomes claimed when:
- They verify ownership via Instagram OAuth
- They complete onboarding

**What CLAIMED venues get:**

Venue Page (ONLY):
- ✅ Instagram photos auto-populate the venue gallery
- ✅ Reels appear in a "Recent Vibes" / "From Instagram" section
- ✅ Story previews appear on the venue page only
- ✅ Venue can manually post events
- ✅ Events show in Explore feed and homepage (standard cards)
- ✅ Events show in "Tonight Trending" if organically trending
- ✅ Venue page is linkable & bio-ready (events + photos + vibes)

**What they do NOT get:**
- ❌ No "Lumina Partner Events" featured row
- ❌ No bigger event cards
- ❌ No featured badge
- ❌ No algorithmic boosts
- ❌ No analytics

**Claimed = ownership + presence, not promotion.**

---

### ⭐ SPOTLIGHT ($25/month)

Spotlight is distribution, not content access. Everything in CLAIMED plus:

**Distribution & Visibility:**
- ⭐ Stories rotate on Lumina homepage
- ⭐ Reels appear in Explore + Nightlife feeds
- ⭐ Events appear in dedicated "Lumina Partner Events" row (bigger cards)
- ⭐ Events get visual priority in "Tonight Trending" (bigger card, glow, badge)
- ⭐ Featured badge on venue & events
- ⭐ Analytics (views, taps, saves)

**Spotlight = reach & visibility.**

---

### 💎 ELITE ($44.99/month)

Everything in SPOTLIGHT plus:

- 💎 Priority in AI recommendations
- 💎 Booking system (tables, bottle service, guest lists)
- 💎 Door management / check-in system
- 💎 Boost tools
- 💎 Full analytics dashboard
- 💎 Revenue tracking

**Elite = full business tools.**

---

## 3. FAIRNESS RULE (VERY IMPORTANT)

**Lumina must never suppress reality.**

If a claimed (non-spotlight) venue is:
- Truly trending
- High engagement
- High nightlife score

They CAN appear in:
- Explore feed (standard cards)
- "Tonight Trending" (standard cards)
- Mood-based / vibe-based feeds

BUT:
- They appear without boost priority
- They are NOT labeled Featured
- They use standard-size cards (not the bigger Spotlight cards)
- They are out-ranked by Spotlight when scores are equal

**This keeps Lumina credible, not pay-to-play.**

---

## 4. EXPLORE FEED LAYOUT
```
[Lumina Partner Events ⭐]     ← Spotlight/Elite only, bigger horizontal cards
  🔥 Wine Wednesday at Nobu     🔥 Jazz Brunch at Blue Note

[Tonight Trending]              ← Mixed, Spotlight gets bigger cards + badge
  Afrobeats Night                Latin Fridays

[All Events]                    ← Everyone, chronological, standard cards
  Wine Wednesday                 Open Mic Tuesday
  Salsa Night                    DJ Set @ Basement
```

---

## 5. EVENT DISTRIBUTION LOGIC

**CLAIMED venues:**
- Can post events (single + recurring)
- Events appear in Explore feed (standard cards)
- Events appear in "Tonight Trending" if organically trending (standard cards)
- Events do NOT appear in "Lumina Partner Events" row

**SPOTLIGHT venues:**
- Same event posting
- Events appear in "Lumina Partner Events" featured row (bigger cards)
- Events get visual priority in all feed sections
- Events receive featured badge + boost indicator

**Events = allowed for all. Premium placement = paid.**

---

## 6. INSTAGRAM AUTH

### Scope:
```
instagram_business_basic
```

### What we pull:
- Posts (images + carousels)
- Reels (video)
- Stories (read-only)

### What we DO NOT do:
- ❌ Post
- ❌ Comment
- ❌ DM
- ❌ Schedule
- ❌ Edit captions

---

## 7. INSTAGRAM SYNC BEHAVIOR

### Trigger:
Instagram sync runs **automatically when OAuth succeeds.** No button. No toggle.

### Sync does:
- Pull last ~50 posts
- Rank by engagement
- Select:
  - Top 10 photos → venue gallery
  - Top 5 reels → "Recent Vibes" section
  - Active stories → venue page preview

### Storage:
- `partners.gallery_photos` (JSON)
- `venues.gallery_photos` (JSON)
- `partners.instagram_synced_at` (timestamp)

### Visibility rules:
- **Claimed:** venue page only
- **Spotlight:** homepage + feeds + venue page

---

## 8. UX COPY (MANDATORY)

Before Instagram connect button:

> "We'll automatically use your best photos and reels to keep your Lumina page fresh. We never post on your behalf."

This is critical for trust.

---

## 9. WHY THIS WORKS (STRATEGY)

- Claimed venues feel ownership immediately
- Pages look alive → venues care
- Caring leads to upgrading
- Spotlight sells visibility, not control
- Lumina gathers real nightlife + event data at scale
- This makes Lumina better than Eventbrite (atmosphere + proof)

---

## 10. ENGINEERING RULES (DO NOT VIOLATE)

- `primary_lens` is canonical for dining
- claimed ≠ suppressed
- spotlight ≠ forced inclusion
- algorithms stay honest
- money only affects distribution weight, never content visibility
- partner events with `on_explore = 1` always appear in feed
- Spotlight events get `boost_level` > 0 for priority sorting

---

## ONE-LINE SUMMARY

**Claimed venues get ownership and a beautiful page. Spotlight venues get reach. Elite venues get business tools. Instagram is enrichment, not publishing. Distribution is paid, reality is not suppressed.**
