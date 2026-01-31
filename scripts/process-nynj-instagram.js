import { ApifyClient } from 'apify-client';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db',
  DATASET_ID: 'yRDOyalKEpLjhbckK'
};

const client = new ApifyClient({ token: CONFIG.APIFY_TOKEN });
const db = new Database(CONFIG.DB_PATH);

function extractInstagramHandle(instagramLink) {
  if (!instagramLink) return null;
  
  const match = instagramLink.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (match && match[1]) {
    return match[1].replace('/', '');
  }
  
  return null;
}

async function main() {
  console.log('\n🔍 PROCESSING NY/NJ INSTAGRAM RESULTS\n');
  console.log('='.repeat(60));
  
  const { items } = await client.dataset(CONFIG.DATASET_ID).listItems();
  
  console.log(`\n✅ Downloaded ${items.length} scraped websites\n`);
  
  const venues = db.prepare(`
    SELECT id, name, website 
    FROM venues 
    WHERE state IN ('NY', 'NJ')
    AND website IS NOT NULL
  `).all();
  
  console.log(`📋 Loaded ${venues.length} NY/NJ venues\n`);
  console.log('🔍 Extracting Instagram handles...\n');
  
  let saved = 0;
  let skipped = 0;
  
  for (const result of items) {
    if (!result.instagramLink) continue;
    
    const handle = extractInstagramHandle(result.instagramLink);
    if (!handle) continue;
    
    const venue = venues.find(v => {
      try {
        const venueHostname = new URL(v.website).hostname.replace('www.', '');
        return venueHostname === result.domain || venueHostname.includes(result.domain);
      } catch {
        return false;
      }
    });
    
    if (!venue) continue;
    
    try {
      db.prepare(`
        UPDATE venues SET
          instagram_handle = ?
        WHERE id = ?
      `).run(handle, venue.id);
      
      saved++;
      
      if (saved % 100 === 0) {
        console.log(`   ✓ Saved ${saved} Instagram handles...`);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        skipped++;
      } else {
        throw error;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ PROCESSING COMPLETE!');
  console.log(`   Instagram handles saved: ${saved}`);
  console.log(`   Duplicates skipped: ${skipped}`);
  console.log('='.repeat(60) + '\n');
  
  db.close();
}

main().catch(console.error);
