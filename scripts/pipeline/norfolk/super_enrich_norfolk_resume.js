import "dotenv/config";
import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;

const INPUT_FILE = "google_filtered_norfolk.json";
const OUTPUT_FILE = "super_enriched_norfolk.json";

async function getGoogleReviews(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=reviews`;
    const response = await axios.get(url);
    const reviews = response.data.result?.reviews || [];
    return reviews.slice(0, 10).map(r => r.text);
  } catch (err) {
    return [];
  }
}

async function getYelpData(venueName, address) {
  try {
    const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(venueName)}&location=${encodeURIComponent(address)}&limit=1`;
    const searchResponse = await axios.get(searchUrl, {
      headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
    });
    
    const business = searchResponse.data.businesses[0];
    if (!business) return { reviews: [], yelpUrl: null, photos: [] };
    
    const reviewsUrl = `https://api.yelp.com/v3/businesses/${business.id}/reviews`;
    const reviewsResponse = await axios.get(reviewsUrl, {
      headers: { 'Authorization': `Bearer ${YELP_API_KEY}` }
    });
    
    return {
      reviews: reviewsResponse.data.reviews.map(r => r.text),
      yelpUrl: business.url,
      photos: business.photos || [],
      price: business.price || null,
      categories: business.categories?.map(c => c.title) || []
    };
  } catch (err) {
    return { reviews: [], yelpUrl: null, photos: [] };
  }
}

async function analyzeWithOpenAI(venue, googleReviews, yelpData) {
  const prompt = `Analyze ${venue.venueName} in Norfolk for Lumina's nightlife concierge:

VENUE: ${venue.venueName}
Website: ${venue.website || 'none'}
Price: ${venue.priceLevel ? '$'.repeat(venue.priceLevel) : 'unknown'}

GOOGLE REVIEWS:
${googleReviews.join('\n---\n')}

YELP REVIEWS:
${yelpData.reviews.join('\n---\n')}

Provide comprehensive intelligence in EXACT JSON:
{
  "cuisine_primary": "Italian" or null,
  "cuisine_secondary": "Mediterranean" or null,
  "cuisine_style": "upscale" | "casual" | "fast-casual" or null,
  "cuisine_tags": ["pasta-focused", "wine-heavy"],
  "primary_vibes": ["upscale", "romantic", "trendy"],
  "secondary_vibes": ["instagram-worthy", "date-friendly"],
  "pregame_suitable": true/false,
  "first_date_suitable": true/false,
  "anniversary_suitable": true/false,
  "girls_night_suitable": true/false,
  "guys_night_suitable": true/false,
  "brunch_spot": true/false,
  "late_night_spot": true/false,
  "energy_level": "calm" | "moderate" | "lively" | "high",
  "energy_progression": ["can_wind_down", "can_turn_up"],
  "lounge_type": "upscale-lounge" | "sports-bar" | "dive-bar" or null,
  "music_genres": ["House", "Hip-Hop"],
  "category": "dining" | "nightlife" | "entertainment",
  "has_happy_hour": true/false,
  "happy_hour_details": "4-7pm weekdays, $5 drinks" or null,
  "average_entree_price": 35 or null,
  "budget_friendly_items": ["happy hour tacos $3"],
  "needs_menu_scraping": true/false,
  "needs_event_scraping": true/false,
  "customer_insights": "2-3 sentence summary"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const json = content.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("No JSON found");
    return JSON.parse(json);
  } catch (err) {
    console.error("❌ OpenAI analysis failed:", err.message);
    return {};
  }
}

async function enrichVenue(venue) {
  console.log(`📍 ${venue.venueName}`);
  
  const googleReviews = await getGoogleReviews(venue.placeId);
  const yelpData = await getYelpData(venue.venueName, venue.address);
  const aiInsights = await analyzeWithOpenAI(venue, googleReviews, yelpData);

  return {
    ...venue,
    googleReviews: googleReviews.slice(0, 5),
    yelpReviews: yelpData.reviews.slice(0, 5),
    yelpUrl: yelpData.yelpUrl,
    yelpPhotos: yelpData.photos,
    yelpPrice: yelpData.price,
    yelpCategories: yelpData.categories,
    ...aiInsights
  };
}

async function main() {
  const allVenues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  
  // Load existing enriched venues
  let enriched = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    enriched = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    console.log(`📂 Loaded ${enriched.length} existing enriched venues`);
  }
  
  // Create set of already enriched venue names for fast lookup
  const enrichedNames = new Set(enriched.map(v => v.venueName));
  
  // Filter to only venues not yet enriched
  const remaining = allVenues.filter(v => !enrichedNames.has(v.venueName));
  
  console.log(`🧠 SUPER ENRICHING Norfolk venues:`);
  console.log(`   Total: ${allVenues.length}`);
  console.log(`   Already done: ${enriched.length}`);
  console.log(`   Remaining: ${remaining.length}`);

  for (let i = 0; i < remaining.length; i++) {
    console.log(`\n[${enriched.length + 1}/${allVenues.length}] (${i + 1}/${remaining.length} remaining)`);
    
    const enrichedVenue = await enrichVenue(remaining[i]);
    enriched.push(enrichedVenue);

    if ((enriched.length) % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`💾 Progress saved (${enriched.length}/${allVenues.length})`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));

  const menuScrapingList = enriched.filter(v => v.needs_menu_scraping && v.website);
  const eventScrapingList = enriched.filter(v => v.needs_event_scraping && v.website);
  
  fs.writeFileSync("menu_scraping_todo.json", JSON.stringify(menuScrapingList, null, 2));
  fs.writeFileSync("event_scraping_todo.json", JSON.stringify(eventScrapingList, null, 2));

  console.log(`\n✅ NORFOLK COMPLETE!`);
  console.log(`📄 Enriched: ${enriched.length}`);
  console.log(`🍽️  Menu scraping: ${menuScrapingList.length}`);
  console.log(`🎉 Event scraping: ${eventScrapingList.length}`);
  
  process.exit(0);
}

main().catch(console.error);
