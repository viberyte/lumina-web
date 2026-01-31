import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeVenueEvents(venue) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox'] 
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(venue.website, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const pageText = await page.evaluate(() => document.body.innerText);
    
    const eventKeywords = [
      'events', 'calendar', 'upcoming', 'schedule',
      'shows', 'tonight', 'this week', 'performances'
    ];
    
    const hasEvents = eventKeywords.some(keyword => 
      pageText.toLowerCase().includes(keyword)
    );
    
    if (hasEvents) {
      const eventLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(a => /event|calendar|show|schedule/i.test(a.href || a.textContent))
          .map(a => a.href)
          .slice(0, 3);
      });
      
      return {
        venue: venue.venueName,
        website: venue.website,
        city: venue.city,
        hasEvents: true,
        eventLinks: eventLinks
      };
    }
    
    return {
      venue: venue.venueName,
      website: venue.website,
      city: venue.city,
      hasEvents: false
    };
    
  } catch (err) {
    return {
      venue: venue.venueName,
      website: venue.website,
      city: venue.city,
      error: err.message
    };
  } finally {
    await browser.close();
  }
}

async function scanAllVenues() {
  const venues = JSON.parse(fs.readFileSync('all_nightlife_websites_complete.json', 'utf8'));
  
  // Load existing progress
  let results = [];
  if (fs.existsSync('event_scan_results_full.json')) {
    results = JSON.parse(fs.readFileSync('event_scan_results_full.json', 'utf8'));
    console.log(`📂 Resuming from ${results.length} venues`);
  }
  
  const scanned = new Set(results.map(r => r.venue));
  const remaining = venues.filter(v => !scanned.has(v.venueName));
  
  console.log(`🗓️  EVENT SCANNER - FULL RUN`);
  console.log(`   Total: ${venues.length}`);
  console.log(`   Done: ${results.length}`);
  console.log(`   Remaining: ${remaining.length}\n`);
  
  for (let i = 0; i < remaining.length; i++) {
    console.log(`[${results.length + 1}/${venues.length}] ${remaining[i].venueName}`);
    
    const result = await scrapeVenueEvents(remaining[i]);
    results.push(result);
    
    if (result.hasEvents) {
      console.log(`   ✅ Events found`);
    }
    
    // Save every 10
    if (results.length % 10 === 0) {
      fs.writeFileSync('event_scan_results_full.json', JSON.stringify(results, null, 2));
      console.log(`   💾 Saved (${results.length}/${venues.length})\n`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  fs.writeFileSync('event_scan_results_full.json', JSON.stringify(results, null, 2));
  
  const withEvents = results.filter(r => r.hasEvents).length;
  console.log(`\n✅ COMPLETE: ${withEvents}/${results.length} venues have events`);
}

scanAllVenues().catch(console.error);
