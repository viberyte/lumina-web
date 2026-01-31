import Database from 'better-sqlite3';
import fs from 'fs';

const CONFIG = {
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db',
  RESULTS_FILE: '/opt/viberyte/lumina-scripts/results.txt'
};

const db = new Database(CONFIG.DB_PATH);

function extractInstagramHandle(instagramUrl) {
  if (!instagramUrl || instagramUrl === 'Not Found') return null;
  
  const match = instagramUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (match && match[1]) {
    return match[1].replace('/', '');
  }
  
  return null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

async function main() {
  console.log('\n🔍 PROCESSING GEMINI RESULTS\n');
  console.log('='.repeat(60));
  
  const content = fs.readFileSync(CONFIG.RESULTS_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`\n✅ Loaded ${lines.length} results from Gemini\n`);
  
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
  let notFound = 0;
  
  for (const line of lines) {
    const [websiteUrl, instagramUrl] = line.split('|').map(s => s.trim());
    
    const handle = extractInstagramHandle(instagramUrl);
    
    if (!handle) {
      notFound++;
      continue;
    }
    
    const domain = extractDomain(websiteUrl);
    if (!domain) continue;
    
    const venue = venues.find(v => {
      const venueDomain = extractDomain(v.website);
      return venueDomain && venueDomain === domain;
    });
    
    if (!venue) continue;
    
    try {
      db.prepare(`
        UPDATE venues SET
          instagram_handle = ?
        WHERE id = ?
      `).run(handle, venue.id);
      
      saved++;
      
      if (saved % 50 === 0) {
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
  console.log('✅ GEMINI RESULTS PROCESSED!');
  console.log(`   New Instagram handles: ${saved}`);
  console.log(`   Duplicates skipped: ${skipped}`);
  console.log(`   Not found: ${notFound}`);
  console.log('='.repeat(60) + '\n');
  
  db.close();
}

main().catch(console.error);
