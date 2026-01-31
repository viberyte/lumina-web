import "dotenv/config";
import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;

const INPUT_FILE = "google_filtered_richmond.json";
const OUTPUT_FILE = "super_enriched_richmond.json";

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
  const prompt = `Analyze ${venue.venueName} in Richmond for Lumina's nightlife concierge:

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
  "lounge_type": "upscale-lounge" | "casual-lounge" | "hookah-lounge" | "rooftop-lounge" or null,
  "lounge_vibes": ["calm-lounge", "lively-lounge", "mixy-lounge"],
  "music_genres": ["Hip-Hop", "Afrobeats", "Jazz"],
  "category": "dining" | "nightlife" | "lounge",
  "has_happy_hour": true/false,
  "happy_hour_details": "4-7pm weekdays, $5 drinks" or null,
  "average_entree_price": 25 or null,
  "budget_friendly_items": ["burger $12", "pasta $18"] or [],
  "needs_menu_scraping": true/false,
  "needs_event_scraping": true/false,
  "customer_insights": "2-3 sentences"
}

Return ONLY JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content.trim();
    const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(json);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return null;
  }
}

async function enrichVenue(venue) {
  console.log(`\n📍 ${venue.venueName}`);
  
  const googleReviews = await getGoogleReviews(venue.placeId);
  const yelpData = await getYelpData(venue.venueName, venue.address);
  
  console.log(`  ✓ ${googleReviews.length} Google + ${yelpData.reviews.length} Yelp reviews`);
  
  if (googleReviews.length === 0 && yelpData.reviews.length === 0) {
    return {
      ...venue,
      needs_menu_scraping: true,
      needs_event_scraping: true,
      yelpUrl: yelpData.yelpUrl
    };
  }
  
  const analysis = await analyzeWithOpenAI(venue, googleReviews, yelpData);
  
  return {
    ...venue,
    ...analysis,
    yelpUrl: yelpData.yelpUrl,
    review_count: {
      google: googleReviews.length,
      yelp: yelpData.reviews.length
    }
  };
}

async function run() {
  const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  console.log(`🧠 ENRICHING ${venues.length} Richmond venues with OpenAI`);
  
  const enriched = [];
  
  for (let i = 0; i < venues.length; i++) {
    console.log(`\n[${i + 1}/${venues.length}]`);
    
    const enrichedVenue = await enrichVenue(venues[i]);
    enriched.push(enrichedVenue);
    
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`💾 Progress saved (${i + 1}/${venues.length})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`📄 Enriched: ${enriched.length}`);
  
  process.exit(0); // STOP HERE
}

run().catch(console.error);
