import { ApifyClient } from 'apify-client';
import Database from 'better-sqlite3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db',
  CSV_PATH: '/opt/viberyte/lumina-web/philly-websites.csv'
};

const client = new ApifyClient({ token: CONFIG.APIFY_TOKEN });
const db = new Database(CONFIG.DB_PATH);

function loadWebsites() {
  const csv = fs.readFileSync(CONFIG.CSV_PATH, 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  return lines.filter(line => line.trim()).map(line => {
    const match = line.match(/^(\d+),"([^"]+)","?([^"]+)"?$/);
    if (!match) return null;
    return { 
      id: match[1], 
      name: match[2], 
      website: match[3].replace(/"/g, '')
    };
  }).filter(Boolean);
}

async function runInstagramProfileHunter(venues) {
  console.log('\n🔍 INSTAGRAM PROFILE HUNTER');
  console.log(`   Extracting Instagram handles from ${venues.length} websites\n`);
  
  const websites = venues.map(v => v.website);
  
  console.log(`   Sample websites: ${websites.slice(0, 3).join(', ')}\n`);
  
  const input = {
    urls: websites
  };
  
  const run = await client.actor('dSCLg0C3YEZ83HzYX').call(input);
  
  console.log(`\n   ✅ Instagram hunter finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Found Instagram handles on ${items.length} websites\n`);
  
  return items;
}

function saveInstagramHandles(results, venues) {
  console.log('\n💾 Saving discovered Instagram handles...');
  
  let saved = 0;
  
  for (const result of results) {
    const websiteUrl = result.url || result.websiteUrl || result.inputUrl;
    
    const venue = venues.find(v => {
      try {
        return websiteUrl.includes(new URL(v.website).hostname);
      } catch {
        return false;
      }
    });
    
    if (!venue || !result.instagram) continue;
    
    const handle = result.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '').replace('/', '');
    
    db.prepare(`
      UPDATE venues SET
        instagram_handle = ?
      WHERE id = ?
    `).run(handle, venue.id);
    
    saved++;
  }
  
  console.log(`   ✅ Saved ${saved} new Instagram handles\n`);
  return saved;
}

async function main() {
  console.log('\n🎯 WEBSITE → INSTAGRAM MAPPER\n');
  console.log('='.repeat(60));
  
  const venues = loadWebsites();
  console.log(`\n📋 Loaded ${venues.length} websites\n`);
  
  try {
    const results = await runInstagramProfileHunter(venues);
    const saved = saveInstagramHandles(results, venues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ INSTAGRAM DISCOVERY COMPLETE!');
    console.log(`   New Instagram handles: ${saved}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
