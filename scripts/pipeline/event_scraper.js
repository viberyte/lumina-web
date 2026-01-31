import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeVenueEvents(venue) {
  console.log(`\n🔍 Scraping: ${venue.venueName}`);
  console.log(`   URL: ${venue.website}`);
  
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
    
    // Look for common event keywords in page
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Common event calendar patterns
    const eventKeywords = [
      'events', 'calendar', 'upcoming', 'schedule',
      'shows', 'tonight', 'this week', 'performances'
    ];
    
    const hasEvents = eventKeywords.some(keyword => 
      pageText.toLowerCase().includes(keyword)
    );
    
    if (hasEvents) {
      console.log(`   ✅ Found event content!`);
      
      // Try to find event links
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
        hasEvents: true,
        eventLinks: eventLinks,
        needsCustomScraper: eventLinks.length === 0
      };
    } else {
      console.log(`   ⚠️  No events found`);
      return {
        venue: venue.venueName,
        website: venue.website,
        hasEvents: false
      };
    }
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return {
      venue: venue.venueName,
      website: venue.website,
      error: err.message
    };
  } finally {
    await browser.close();
  }
}

async function scanVenuesForEvents() {
  const venues = JSON.parse(fs.readFileSync('all_nightlife_websites_complete.json', 'utf8'));
  
  console.log(`🎉 EVENT SCANNER STARTING`);
  console.log(`   Total venues: ${venues.length}`);
  console.log(`   Sampling first 20 venues...`);
  
  const results = [];
  
  // Test first 20 venues
  for (let i = 0; i < Math.min(20, venues.length); i++) {
    const result = await scrapeVenueEvents(venues[i]);
    results.push(result);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Save results
  fs.writeFileSync('event_scan_results.json', JSON.stringify(results, null, 2));
  
  // Summary
  const withEvents = results.filter(r => r.hasEvents).length;
  const withLinks = results.filter(r => r.eventLinks?.length > 0).length;
  
  console.log(`\n📊 SCAN COMPLETE:`);
  console.log(`   Venues with events: ${withEvents}/20`);
  console.log(`   Venues with event links: ${withLinks}/20`);
  console.log(`   Results saved to: event_scan_results.json`);
}

scanVenuesForEvents().catch(console.error);
