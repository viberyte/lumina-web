import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapePosh() {
  console.log('💎 POSH SCRAPER - Starting...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('📍 Loading https://posh.vip/explore ...');
  
  try {
    await page.goto('https://posh.vip/explore?city=new-york', { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(5000);
    
    // Scroll to load more events
    console.log('📜 Scrolling to load events...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await delay(1500);
    }
    
    // Take debug screenshot
    await page.screenshot({ path: '/opt/viberyte/lumina-web/data/events/debug-posh.png' });
    console.log('📸 Screenshot saved');
    
    // Extract events from page
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Get all text content and find event patterns
      const allLinks = document.querySelectorAll('a[href*="/e/"]');
      
      allLinks.forEach(link => {
        const href = link.href;
        if (seen.has(href)) return;
        seen.add(href);
        
        const card = link.closest('div');
        if (!card) return;
        
        const text = card.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        
        // Find date/time line (e.g., "SAT · 9:00 PM")
        let dateTime = '';
        let name = '';
        let venue = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Date pattern: SAT · 9:00 PM or FRI · 10:00 PM
          if (line.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)\s*[·•]\s*\d{1,2}:\d{2}\s*(AM|PM)/i)) {
            dateTime = line;
            // Next lines are usually name then venue
            if (lines[i+1]) name = lines[i+1];
            if (lines[i+2]) venue = lines[i+2];
            break;
          }
        }
        
        // If no dateTime found, try to get name from longest line
        if (!name) {
          name = lines.find(l => l.length > 10 && l.length < 80 && !l.match(/FREE|RSVP|\$/i)) || '';
        }
        
        const img = card.querySelector('img');
        
        if (name && name.length > 3) {
          results.push({
            name: name.substring(0, 150),
            venue: venue || 'POSH Venue',
            dateTime,
            url: href,
            imageUrl: img?.src || ''
          });
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Found ${events.length} POSH events\n`);
    
    // Insert into database
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO events (
        name, venue_name, date, event_date, time,
        ticket_url, image_url, city, source_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New York', 'posh', datetime('now'))
    `);
    
    let added = 0;
    const today = new Date();
    
    for (const event of events) {
      try {
        // Parse date from "SAT · 9:00 PM"
        let eventDate = today.toISOString().split('T')[0];
        let eventTime = null;
        
        if (event.dateTime) {
          const dayMatch = event.dateTime.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)/i);
          const timeMatch = event.dateTime.match(/(\d{1,2}:\d{2}\s*(AM|PM))/i);
          
          if (dayMatch) {
            const days = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
            const targetDay = days[dayMatch[1].toUpperCase()];
            const currentDay = today.getDay();
            let daysAhead = targetDay - currentDay;
            if (daysAhead < 0) daysAhead += 7;
            
            const eventDateObj = new Date(today);
            eventDateObj.setDate(today.getDate() + daysAhead);
            eventDate = eventDateObj.toISOString().split('T')[0];
          }
          
          if (timeMatch) {
            eventTime = timeMatch[1];
          }
        }
        
        const result = stmt.run(
          event.name,
          event.venue,
          eventDate,
          eventDate,
          eventTime,
          event.url,
          event.imageUrl
        );
        
        if (result.changes > 0) {
          added++;
          console.log(`   ✅ ${event.name} @ ${event.venue}`);
        }
      } catch (e) {}
    }
    
    console.log(`\n💾 Added ${added} new POSH events`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  await browser.close();
  
  // Show totals
  const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now')").get();
  console.log(`\n📊 Total upcoming events: ${total.count}`);
  
  db.close();
}

scrapePosh();
