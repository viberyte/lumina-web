import axios from 'axios';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

async function searchInstagram(venueName, city) {
  try {
    const searchQuery = `${venueName} ${city}`.trim();
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      { search: searchQuery, resultsLimit: 3 },
      { timeout: 90000 }
    );
    const results = response.data || [];
    if (results.length > 0) return results[0].username || null;
    return null;
  } catch (err) {
    return null;
  }
}

async function searchTikTok(venueName, city) {
  try {
    const searchQuery = `${venueName} ${city}`;
    const response = await axios.post(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      { searchQueries: [searchQuery], resultsPerPage: 5 },
      { timeout: 90000 }
    );
    const results = response.data || [];
    const usernames = new Set();
    results.forEach(video => {
      if (video.authorName) usernames.add(video.authorName);
    });
    return usernames.size > 0 ? Array.from(usernames)[0] : null;
  } catch (err) {
    return null;
  }
}

async function scrapeAllVenues() {
  const venues = db.prepare(`
    SELECT id, name, address, city
    FROM venues 
    WHERE should_exclude = 0
    AND (instagram_handle IS NULL OR instagram_handle = '')
    ORDER BY id
    LIMIT 100
  `).all();
  
  console.log(`Processing ${venues.length} venues\n`);
  
  let foundIG = 0, foundTT = 0;
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    console.log(`[${i+1}/${venues.length}] ${venue.name}`);
    
    const igHandle = await searchInstagram(venue.name, venue.city);
    await new Promise(r => setTimeout(r, 2000));
    
    const ttHandle = await searchTikTok(venue.name, venue.city);
    
    if (igHandle || ttHandle) {
      console.log(`  IG: ${igHandle || 'none'} | TT: ${ttHandle || 'none'}`);
      db.prepare(`UPDATE venues SET instagram_handle = ?, tiktok_handle = ? WHERE id = ?`)
        .run(igHandle, ttHandle, venue.id);
      if (igHandle) foundIG++;
      if (ttHandle) foundTT++;
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log(`\nComplete! IG: ${foundIG} | TT: ${foundTT}`);
}

scrapeAllVenues().catch(console.error);
