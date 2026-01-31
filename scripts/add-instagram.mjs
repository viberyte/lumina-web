import Database from 'better-sqlite3';
import { Client } from '@googlemaps/google-maps-services-js';

const googleMaps = new Client({});
const GOOGLE_API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';
const db = new Database('./data/lumina.db');

const venues = db.prepare("SELECT * FROM venues WHERE (category LIKE '%dining%' OR category LIKE '%nightlife%') AND (instagram_handle IS NULL OR instagram_handle = '')").all();
console.log(`🔍 Finding Instagram for ${venues.length} venues...\n`);

let count = 0;
let found = 0;

for (const v of venues) {
  try {
    count++;
    console.log(`[${count}/${venues.length}] ${v.name}`);
    
    // If we have place_id, get details
    let placeId = v.google_place_id;
    
    if (!placeId) {
      // Search for place
      const search = await googleMaps.findPlaceFromText({
        params: {
          input: `${v.name} ${v.address || v.city || 'NYC'}`,
          inputtype: 'textquery',
          fields: ['place_id'],
          key: GOOGLE_API_KEY
        }
      });
      
      if (search.data.candidates?.[0]) {
        placeId = search.data.candidates[0].place_id;
        db.prepare('UPDATE venues SET google_place_id = ? WHERE id = ?').run(placeId, v.id);
      }
    }
    
    if (!placeId) {
      console.log('  ⚠️  No place ID\n');
      continue;
    }
    
    // Get place details with website
    const details = await googleMaps.placeDetails({
      params: {
        place_id: placeId,
        fields: ['website'],
        key: GOOGLE_API_KEY
      }
    });
    
    const website = details.data.result?.website;
    
    if (website) {
      // Extract Instagram handle
      const match = website.toLowerCase().match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) {
        const igHandle = match[1];
        db.prepare('UPDATE venues SET instagram_handle = ? WHERE id = ?').run(igHandle, v.id);
        found++;
        console.log(`  ✅ Found: @${igHandle}\n`);
      } else {
        console.log(`  ⚠️  Website but no IG: ${website}\n`);
      }
    } else {
      console.log('  ⚠️  No website\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
  }
}

console.log(`\n🎉 Done! Checked: ${count}, Found Instagram: ${found}`);
