import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

async function analyzeVenue(venueId, venueName) {
  try {
    console.log(`Analyzing venue ${venueId}: ${venueName}...`);
    
    const response = await fetch('http://localhost:3000/api/instagram/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`  ❌ Failed: ${error.error}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`  ✅ Success: ${result.posts_analyzed} posts analyzed`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const venues = db.prepare(`
      SELECT DISTINCT v.id, v.name, COUNT(vim.id) as media_count
      FROM venues v
      INNER JOIN venue_instagram_media vim ON v.id = vim.venue_id
      WHERE v.should_exclude = 0
      GROUP BY v.id
      HAVING media_count >= 5
      ORDER BY media_count DESC
    `).all();

    console.log(`Found ${venues.length} venues to analyze\n`);
    
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      console.log(`[${i + 1}/${venues.length}] ${venue.name} (${venue.media_count} posts)`);
      
      const success = await analyzeVenue(venue.id, venue.name);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      if (i < venues.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    db.close();
  } catch (error) {
    console.error('Analysis error:', error);
    db.close();
    process.exit(1);
  }
}

main();
