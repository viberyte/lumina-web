import fs from "fs";

console.log("Loading dataset...");

// Load the big TikTok dataset
const raw = JSON.parse(fs.readFileSync("/opt/viberyte/lumina-web/tiktok_philly.json", "utf8"));
const venues = [];
const events = [];

for (const item of raw) {
  // Skip error rows from Apify
  if (item.error) continue;

  const caption = item.text || "";
  const location = item.locationMeta || {};
  const poi = item.poiMeta || item.poi || {};

  // Extract venue name
  const venueName =
    poi.name ||
    location.locationName ||
    caption.match(/at\s+([A-Za-z0-9 '&]+)/i)?.[1] ||
    caption.match(/@([A-Za-z0-9_]+)/)?.[1] ||
    null;

  // Extract cover image
  const cover =
    (item.covers && item.covers[0]) ||
    (item.slideshowImages && item.slideshowImages[0]) ||
    null;

  // Build venue candidate only if name detected
  if (venueName) {
    venues.push({
      venueName,
      caption,
      cover,
      hashtags: item.hashtags || [],
      locationName: location.locationName || null,
      address: location.address || null,
      tiktokId: item.id,
      url: item.webVideoUrl
    });
  }

  // Build event candidate ALWAYS
  events.push({
    venueName,
    caption,
    cover,
    hashtags: item.hashtags || [],
    dateWords: caption.match(/\b(friday|saturday|sunday|monday|tuesday|wednesday|thursday|tonight|tomorrow)\b/gi),
    tiktokId: item.id,
    url: item.webVideoUrl
  });
}

// Save both files
fs.writeFileSync("venue_candidates.json", JSON.stringify(venues, null, 2));
fs.writeFileSync("event_candidates.json", JSON.stringify(events, null, 2));

console.log("✔ Venues extracted:", venues.length);
console.log("✔ Events extracted:", events.length);
