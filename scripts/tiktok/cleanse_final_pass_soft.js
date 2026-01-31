import fs from "fs";

const INPUT = "venue_clean_final.json";
const OUTPUT = "venue_final.json";

/*
 SOFT CLEANSING RULES:
 - KEEP one-word venues (Rouge, Rec, Vesper, Tabu, Ruba, etc.)
 - KEEP high trendScore venues
 - KEEP missing vibes/dressCode (some entries incomplete but still real)
 - KEEP all Philly neighborhoods

 REMOVE ONLY:
 1. empty names
 2. emoji-only names
 3. usernames (random letters, no spaces, ends with digits, underscores)
 4. names containing @
 5. generic categories ("nightlife", "philly nightlife")
 6. obvious non-venues ("recap", "highlight", "clip")
 7. day-of-week or sentence-based names ("Friday night", "great spot", etc.)
*/

const BAD_GENERIC = [
  "nightlife",
  "philly nightlife",
  "philadelphia nightlife",
  "philadelphia nightclub",
  "night club",
  "night out",
  "night out in philly",
  "philly night out"
];

const BAD_PHRASES = [
  "recap",
  "highlight",
  "bloopers",
  "my night",
  "my vibes",
  "date night idea",
  "friday night",
  "saturday night",
  "night in philly",
  "stuff to do",
  "things to do",
  "best spots",
  "places to go"
];

// Check if name is emojis only
function isEmojiOnly(str) {
  return /^[\p{Emoji_Presentation}\p{Emoji}\s]+$/u.test(str || "");
}

// Detect usernames like "gliaan", "trvpking88", "user_3091"
function looksLikeUsername(str) {
  const low = str.toLowerCase();

  // @ inside name = username reference
  if (low.includes("@")) return true;

  // ends with digits AND no spaces → very likely user handle
  if (!low.includes(" ") && /\d+$/.test(low)) return true;

  // only letters, no spaces, length 4–12 → probable username
  if (/^[a-z]{4,12}$/i.test(low) && !low.includes(" ")) return true;

  // underscores = usernames
  if (low.includes("_")) return true;

  return false;
}

// Generic filler names
function isGenericName(str) {
  const low = str.toLowerCase();
  return BAD_GENERIC.some(g => low === g || low.includes(g));
}

// Non-venues like "Friday night", "fun times", etc.
function isSentenceName(str) {
  const low = str.toLowerCase();
  return BAD_PHRASES.some(p => low.includes(p));
}

function cleanse(items) {
  return items.filter(v => {
    const name = (v.venueName || "").trim();
    const low = name.toLowerCase();

    // 1. Empty name
    if (!name) return false;

    // 2. Emoji-only names
    if (isEmojiOnly(name)) return false;

    // 3. Usernames
    if (looksLikeUsername(name)) return false;

    // 4. Remove generic categories
    if (isGenericName(name)) return false;

    // 5. Remove descriptive sentences
    if (isSentenceName(name)) return false;

    // 6. Remove names that are literally 1–2 characters
    if (name.length <= 2) return false;

    // EVERYTHING ELSE STAYS
    return true;
  });
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  console.log("Loaded:", data.length);

  const cleaned = cleanse(data);
  console.log("After soft cleansing:", cleaned.length);

  fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2));
  console.log("✔ Saved → venue_final.json");
}

main();
