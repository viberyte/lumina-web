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

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function loadWebsites() {
  const csv = fs.readFileSync(CONFIG.CSV_PATH, 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  return lines.filter(line => line.trim()).map(line => {
    const match = line.match(/^(\d+),"([^"]+)","?([^"]+)"?$/);
    if (!match) return null;
    const website = match[3].replace(/"/g, '').trim();
    if (!isValidUrl(website)) return null;
    return { 
      id: match[1], 
      name: match[2], 
      website: website
    };
  }).filter(Boolean);
}

async function runWebScraper(venues) {
  console.log('\n🕷️  WEB SCRAPER');
  console.log(`   Scraping ${venues.length} websites for Instagram links\n`);
  
  const websites = venues.map(v => ({ url: v.website }));
  
  console.log(`   Sample: ${websites[0].url}\n`);
  
  const input = {
    startUrls: websites,
    pageFunction: `
      async function pageFunction(context) {
        const { page, request } = context;
        
        // Extract all Instagram links/handles
        const instagramLinks = await page.$$eval('a[href*="instagram.com"]', links => 
          links.map(link => link.href)
        );
        
        // Also check for @mentions in text
        const bodyText = await page.$eval('body', el => el.innerText);
        const mentions = bodyText.match(/@[a-zA-Z0-9._]{3,30}/g) || [];
        
        return {
          url: request.url,
          instagramLinks,
          mentions
        };
      }
    `
  };
  
  const run = await client.actor('apify/web-scraper').call(input);
  
  console.log(`\n   ✅ Web scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Scraped ${items.length} websites\n`);
  
  return items;
}

function extractInstagramHandle(links, mentions) {
  for (const link of links || []) {
    const match = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match && match[1] && !['p', 'reel', 'reels', 'explore'].includes(match[1])) {
      return match[1];
    }
  }
  
  for (const mention of mentions || []) {
    const clean = mention.replace('@', '').trim();
    if (clean.length >= 3) {
      return clean;
    }
  }
  
  return null;
}

function saveInstagramHandles(results, venues) {
  console.log('\n💾 Saving discovered Instagram handles...');
  
  let saved = 0;
  
  for (const result of results) {
    const venue = venues.find(v => {
      try {
        return result.url.includes(new URL(v.website).hostname);
      } catch {
        return false;
      }
    });
    
    if (!venue) continue;
    
    const handle = extractInstagramHandle(result.instagramLinks, result.mentions);
    
    if (!handle) continue;
    
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
  console.log('\n🎯 WEBSITE → INSTAGRAM EXTRACTOR\n');
  console.log('='.repeat(60));
  
  const venues = loadWebsites();
  console.log(`\n📋 Loaded ${venues.length} valid websites\n`);
  
  try {
    const results = await runWebScraper(venues);
    const saved = saveInstagramHandles(results, venues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ INSTAGRAM EXTRACTION COMPLETE!');
    console.log(`   New Instagram handles: ${saved}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
