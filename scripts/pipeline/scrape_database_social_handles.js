import axios from 'axios';
import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

async function scrapeGoogleForSocialHandles(venueName, address) {
  const query = `${venueName} ${address} instagram OR tiktok`;
  
  try {
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        queries: [query],
        maxPagesPerQuery: 1,
        resultsPerPage: 10
      },
      { timeout: 60000 }
    );
    
    const results = response.data || [];
    
    const handles = {
      instagram: null,
      tiktok: null
    };
    
    results.forEach(result => {
      const text = (result.title + ' ' + result.description + ' ' + result.url).toLowerCase();
      
      // Extract Instagram handle
      const igMatch = text.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igMatch && !handles.instagram) {
        handles.instagram = igMatch[1];
      }
      
      // Extract TikTok handle  
      const ttMatch = text.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
      if (ttMatch && !handles.tiktok) {
        handles.tiktok = ttMatch[1];
      }
    });
    
    return handles;
    
  } catch (err) {
    return { instagram: null, tiktok: null, error: err.message };
  }
}

async function scrapeAllVenues() {
  // Get total count
  const total = db.prepare('SELECT COUNT(*) as count FROM venues WHERE should_exclude = 0').get();
  console.log(`🚀 SOCIAL HANDLE SCRAPER - FULL DATABASE`);
  console.log(`   Total venues: ${total.count}`);
  console.log(`\nChecking existing handles...`);
  
  // Get venues that don't have social handles yet
  const venues = db.prepare(`
    SELECT id, name, address, city, instagram_handle, tiktok_handle
    FROM venues 
    WHERE should_exclude = 0
    AND (instagram_handle IS NULL OR instagram_handle = '' OR tiktok_handle IS NULL OR tiktok_handle = '')
    ORDER BY id
  `).all();
  
  console.log(`   Need social handles: ${venues.length}`);
  console.log(`   Already have handles: ${total.count - venues.length}`);
  console.log(`\nStarting scrape...\n`);
  
  let processed = 0;
  let foundIG = 0;
  let foundTT = 0;
  
  for (const venue of venues) {
    processed++;
    console.log(`\n[${processed}/${venues.length}] ${venue.name}`);
    
    const handles = await scrapeGoogleForSocialHandles(venue.name, venue.address || venue.city);
    
    if (handles.instagram || handles.tiktok) {
      console.log(`   ✅ IG: ${handles.instagram || 'none'} | TT: ${handles.tiktok || 'none'}`);
      
      // Update database
      db.prepare(`
        UPDATE venues 
        SET instagram_handle = COALESCE(?, instagram_handle),
            tiktok_handle = COALESCE(?, tiktok_handle)
        WHERE id = ?
      `).run(handles.instagram, handles.tiktok, venue.id);
      
      if (handles.instagram) foundIG++;
      if (handles.tiktok) foundTT++;
    } else {
      console.log(`   ⚠️  No handles found`);
    }
    
    // Progress report every 50
    if (processed % 50 === 0) {
      console.log(`\n📊 PROGRESS: ${processed}/${venues.length}`);
      console.log(`   Instagram found: ${foundIG}`);
      console.log(`   TikTok found: ${foundTT}`);
    }
    
    // Rate limit: 3 seconds
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log(`\n🎉 COMPLETE!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Instagram handles found: ${foundIG}`);
  console.log(`   TikTok handles found: ${foundTT}`);
  console.log(`   Total with either: ${foundIG + foundTT - (foundIG + foundTT - venues.length)}`);
}

scrapeAllVenues().catch(console.error);
