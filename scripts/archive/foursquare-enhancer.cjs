const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const API_KEY = 'LYA3IPXN5CVTFAYVNTL1VQ3WLHJY1RQKZCIER5FYRM0YJASM';
const LOG_FILE = '/opt/viberyte/lumina-web/logs/foursquare-enhancer.log';

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchFoursquare(venueName, address, lat, lng) {
  try {
    const query = encodeURIComponent(venueName);
    const ll = lat && lng ? `${lat},${lng}` : '';
    
    const url = `https://api.foursquare.com/v3/places/search?query=${query}&ll=${ll}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': API_KEY,  // Foursquare v3 uses just the key
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foursquare API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    log(`❌ Search error: ${error.message}`);
    return null;
  }
}

async function getPlaceDetails(fsqId) {
  try {
    const url = `https://api.foursquare.com/v3/places/${fsqId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log(`❌ Details error: ${error.message}`);
    return null;
  }
}

async function enhanceVenue(db, venue) {
  try {
    log(`🔍 [${venue.id}] ${venue.name}`);
    
    const searchResult = await searchFoursquare(
      venue.name,
      venue.address,
      venue.latitude,
      venue.longitude
    );
    
    if (!searchResult) {
      return { success: false, reason: 'no_match' };
    }
    
    log(`  ✅ Found: ${searchResult.name}`);
    
    await sleep(100);
    const details = await getPlaceDetails(searchResult.fsq_id);
    
    if (!details) {
      return { success: false, reason: 'no_details' };
    }
    
    const updates = {};
    let hasUpdates = false;
    
    // Hours
    if (details.hours && (!venue.hours_json || venue.hours_json === '{}')) {
      updates.hours_json = JSON.stringify(details.hours);
      updates.has_hours = 1;
      hasUpdates = true;
      log(`  📅 Hours added`);
    }
    
    // Price
    if (details.price && !venue.price_tier) {
      const priceMap = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
      updates.price_tier = priceMap[details.price] || '$$';
      hasUpdates = true;
      log(`  💰 Price: ${updates.price_tier}`);
    }
    
    // Photos
    if (details.photos && details.photos.length > 0 && !venue.professional_photo_url) {
      const photo = details.photos[0];
      updates.professional_photo_url = `${photo.prefix}original${photo.suffix}`;
      updates.has_photo = 1;
      hasUpdates = true;
      log(`  📸 Photo added`);
    }
    
    // Rating
    if (details.rating && (!venue.rating || details.rating > venue.rating)) {
      updates.rating = details.rating;
      hasUpdates = true;
      log(`  ⭐ Rating: ${details.rating}`);
    }
    
    // Categories
    if (details.categories && details.categories.length > 0) {
      const categories = details.categories.map(c => c.name).join(', ');
      if (!venue.cuisine_tags || venue.cuisine_tags.length < 10) {
        updates.cuisine_tags = categories;
        hasUpdates = true;
        log(`  🍽️ Categories added`);
      }
    }
    
    // Popularity
    if (details.popularity) {
      updates.viberyte_score = Math.min(100, Math.round(details.popularity * 10));
      hasUpdates = true;
      log(`  🔥 Score: ${updates.viberyte_score}`);
    }
    
    if (hasUpdates) {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), venue.id];
      
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE venues SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          values,
          (err) => err ? reject(err) : resolve()
        );
      });
      
      return { success: true, updates: Object.keys(updates).length };
    }
    
    return { success: true, updates: 0 };
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    return { success: false, reason: 'error' };
  }
}

async function main() {
  log('🚀 Foursquare Enhancement Starting');
  log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  
  const db = new sqlite3.Database(DB_PATH);
  
  const venues = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, address, latitude, longitude, rating, price_tier, 
              professional_photo_url, hours_json, cuisine_tags, viberyte_score
       FROM venues 
       WHERE should_exclude = 0 
       ORDER BY id`,
      (err, rows) => err ? reject(err) : resolve(rows)
    );
  });
  
  log(`📍 Processing ${venues.length} venues\n`);
  
  let stats = {
    total: venues.length,
    enhanced: 0,
    noMatch: 0,
    errors: 0,
    totalUpdates: 0
  };
  
  for (let i = 0; i < venues.length; i++) {
    const result = await enhanceVenue(db, venues[i]);
    
    if (result.success) {
      stats.enhanced++;
      stats.totalUpdates += result.updates || 0;
    } else if (result.reason === 'no_match') {
      stats.noMatch++;
    } else {
      stats.errors++;
    }
    
    await sleep(50);
    
    if ((i + 1) % 100 === 0) {
      log(`\n📊 [${i + 1}/${venues.length}] ✅${stats.enhanced} ⚠️${stats.noMatch} ❌${stats.errors}\n`);
    }
  }
  
  log('\n' + '='.repeat(60));
  log('✨ COMPLETE');
  log(`📊 Enhanced: ${stats.enhanced}/${stats.total}`);
  log(`📝 Updates: ${stats.totalUpdates}`);
  log(`⚠️ No match: ${stats.noMatch}`);
  log(`❌ Errors: ${stats.errors}`);
  log('='.repeat(60));
  
  db.close();
}

main().catch(error => {
  log(`💥 Fatal: ${error.message}`);
  process.exit(1);
});
