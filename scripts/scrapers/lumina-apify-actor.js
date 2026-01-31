/**
 * LUMINA APIFY ACTOR - Event Scraper
 * ==================================
 * Scrapes: DICE, POSH, Delancey, Dream Hospitality
 * Deploy to Apify or run locally with puppeteer
 */

import Apify from 'apify';
import puppeteer from 'puppeteer';

const DICE_URLS = [
  { genre: 'afrobeat', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/afrobeat' },
  { genre: 'afro_house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/afro_house' },
  { genre: 'hiphop', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/hiphop' },
  { genre: 'house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/house' },
  { genre: 'latin', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/latin' },
  { genre: 'reggaeton', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/reggaeton' },
  { genre: 'rnb', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/rnb' },
  { genre: 'edm', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/edm' },
  { genre: 'tech_house', url: 'https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/party/tech-house' },
];

const VENUE_URLS = [
  { name: 'The Delancey', url: 'https://www.thedelancey.com/events' },
  { name: 'Dream Hospitality', url: 'https://tickets.dreamhospitalitygroup.com/' },
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// DICE SCRAPER
// ==========================================
async function scrapeDice(browser) {
  console.log('\n🎲 === DICE.FM SCRAPER ===\n');
  const allEvents = [];
  
  for (const { genre, url } of DICE_URLS) {
    const page = await browser.newPage();
    try {
      console.log(`🎵 Scraping ${genre}...`);
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(3000);
      
      // Scroll to load more
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await delay(500);
      }
      
      // Extract events from JSON-LD or DOM
      const events = await page.evaluate((genreTag) => {
        const results = [];
        
        // Try JSON-LD first
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'Event') {
              results.push({
                name: data.name,
                venue_name: data.location?.name || 'TBA',
                event_date: data.startDate,
                end_date: data.endDate,
                description: data.description,
                image_url: data.image,
                ticket_url: data.url,
                genre: genreTag,
                source: 'dice.fm'
              });
            }
          } catch {}
        });
        
        // Fallback: scrape DOM
        if (results.length === 0) {
          document.querySelectorAll('a[href*="/event/"]').forEach(link => {
            const card = link.closest('div');
            if (!card) return;
            
            const titleEl = card.querySelector('h2, h3, [class*="title"]');
            const dateEl = card.querySelector('time, [class*="date"]');
            const venueEl = card.querySelector('[class*="venue"], [class*="location"]');
            const imgEl = card.querySelector('img');
            
            if (titleEl) {
              results.push({
                name: titleEl.textContent.trim(),
                venue_name: venueEl?.textContent?.trim() || 'TBA',
                event_date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim(),
                image_url: imgEl?.src,
                ticket_url: link.href,
                genre: genreTag,
                source: 'dice.fm'
              });
            }
          });
        }
        
        return results;
      }, genre);
      
      console.log(`   ✅ Found ${events.length} ${genre} events`);
      allEvents.push(...events);
      
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    } finally {
      await page.close();
    }
  }
  
  return allEvents;
}

// ==========================================
// POSH SCRAPER (via API)
// ==========================================
async function scrapePosh() {
  console.log('\n💎 === POSH SCRAPER ===\n');
  const allEvents = [];
  
  const params = {
    sort: 'Newest',
    when: 'All',
    search: '',
    location: {
      type: 'custom',
      location: 'New York, NY, USA',
      lat: 40.7127753,
      long: -74.0059728
    },
    secondaryFilters: [],
    where: 'New York, NY, USA',
    coordinates: [-74.0059728, 40.7127753],
    limit: 50,
    clientTimezone: 'America/New_York'
  };
  
  try {
    const url = `https://posh.vip/api/web/v2/trpc/events.fetchMarketplaceEvents?input=${encodeURIComponent(JSON.stringify(params))}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const events = data?.result?.data?.events || [];
    console.log(`   ✅ Found ${events.length} POSH events`);
    
    for (const event of events) {
      allEvents.push({
        name: event.name || event.title,
        venue_name: event.venue?.name || event.venueName || 'TBA',
        event_date: event.startUtc || event.date,
        end_date: event.endUtc,
        description: event.description,
        image_url: event.flyer?.url || event.imageUrl,
        ticket_url: `https://posh.vip/e/${event.slug || event.id}`,
        source: 'posh.vip'
      });
    }
  } catch (err) {
    console.error(`   ❌ POSH Error: ${err.message}`);
  }
  
  return allEvents;
}

// ==========================================
// VENUE WEBSITE SCRAPER
// ==========================================
async function scrapeVenues(browser) {
  console.log('\n🏛️ === VENUE CALENDARS ===\n');
  const allEvents = [];
  
  for (const { name, url } of VENUE_URLS) {
    const page = await browser.newPage();
    try {
      console.log(`📅 Scraping ${name}...`);
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(3000);
      
      const events = await page.evaluate((venueName) => {
        const results = [];
        
        // Generic event selectors
        const containers = document.querySelectorAll(
          '[class*="event"], [class*="Event"], article, .item, .card, [itemtype*="Event"]'
        );
        
        containers.forEach(el => {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
          const dateEl = el.querySelector('[class*="date"], time, .date');
          const linkEl = el.querySelector('a[href]');
          const imgEl = el.querySelector('img');
          
          if (titleEl && titleEl.textContent.trim().length > 3) {
            results.push({
              name: titleEl.textContent.trim(),
              venue_name: venueName,
              event_date: dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime'),
              image_url: imgEl?.src,
              ticket_url: linkEl?.href,
              source: 'venue-calendar'
            });
          }
        });
        
        return results.slice(0, 50);
      }, name);
      
      console.log(`   ✅ Found ${events.length} events at ${name}`);
      allEvents.push(...events);
      
    } catch (err) {
      console.error(`   ❌ Error at ${name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }
  
  return allEvents;
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  console.log('🚀 LUMINA EVENT SCRAPER - Starting...\n');
  console.log('⏰ ' + new Date().toISOString());
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const allEvents = [];
  
  try {
    // Scrape all sources
    const diceEvents = await scrapeDice(browser);
    const poshEvents = await scrapePosh();
    const venueEvents = await scrapeVenues(browser);
    
    allEvents.push(...diceEvents, ...poshEvents, ...venueEvents);
    
    // Dedupe by name + date
    const seen = new Set();
    const uniqueEvents = allEvents.filter(e => {
      const key = `${e.name}-${e.event_date}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log('\n\n✅ === SCRAPING COMPLETE ===');
    console.log(`   DICE: ${diceEvents.length}`);
    console.log(`   POSH: ${poshEvents.length}`);
    console.log(`   Venues: ${venueEvents.length}`);
    console.log(`   TOTAL (deduped): ${uniqueEvents.length}`);
    
    // Save to Apify dataset or local file
    if (typeof Apify !== 'undefined') {
      await Apify.pushData(uniqueEvents);
    } else {
      const fs = await import('fs');
      const path = await import('path');
      const outputPath = path.join(process.cwd(), 'data/events', `lumina-scrape-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(uniqueEvents, null, 2));
      console.log(`\n💾 Saved to: ${outputPath}`);
    }
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
