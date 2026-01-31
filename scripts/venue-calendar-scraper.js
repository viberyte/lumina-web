import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import OpenAI from 'openai';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const db = new sqlite3.Database(DB_PATH);

console.log('🎭 LUMINA - VENUE CALENDAR SCRAPER\n');
console.log('===================================\n');

// Get nightlife/lounge venues with websites
function getVenuesToScrape() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, website, instagram_handle, category
       FROM venues 
       WHERE (category = 'nightlife' OR category = 'lounge')
       AND website IS NOT NULL 
       AND website != ''
       ORDER BY name`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Scrape a venue's website for calendar/events
async function scrapeVenueCalendar(venue, browser) {
  console.log(`\n📅 Scraping: ${venue.name}`);
  console.log(`   Website: ${venue.website}`);

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to website
    await page.goto(venue.website, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 3000));

    // Extract page content
    const pageContent = await page.evaluate(() => {
      return {
        html: document.body.innerHTML,
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.innerText,
          href: a.href
        }))
      };
    });

    await page.close();

    // Look for calendar/events page
    const calendarLinks = pageContent.links.filter(link => {
      const text = link.text.toLowerCase();
      const href = link.href.toLowerCase();
      return (
        text.includes('event') || text.includes('calendar') || 
        text.includes('shows') || text.includes('schedule') ||
        href.includes('event') || href.includes('calendar')
      );
    });

    if (calendarLinks.length > 0) {
      console.log(`   ✅ Found calendar link: ${calendarLinks[0].href}`);
      
      // Scrape the calendar page
      const calendarPage = await browser.newPage();
      await calendarPage.goto(calendarLinks[0].href, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      await new Promise(r => setTimeout(r, 3000));

      const calendarContent = await calendarPage.evaluate(() => {
        return document.body.innerText;
      });

      await calendarPage.close();

      // Use AI to extract events
      const events = await extractEventsWithAI(venue, calendarContent);
      return events;
      
    } else {
      // Try to extract events from main page
      console.log(`   ⚠️  No calendar link found, checking main page...`);
      const events = await extractEventsWithAI(venue, pageContent.text);
      return events;
    }

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Use OpenAI to intelligently extract event data
async function extractEventsWithAI(venue, pageText) {
  console.log(`   🤖 AI extracting events...`);

  // Truncate text if too long
  const textSample = pageText.slice(0, 8000);

  const prompt = `Extract upcoming events from this venue website text. Today is ${new Date().toISOString().split('T')[0]}.

VENUE: ${venue.name}
CATEGORY: ${venue.category}

WEBSITE TEXT:
${textSample}

Extract ONLY real, specific events with dates. Ignore generic text like "live music nightly" unless specific dates are mentioned.

Return JSON array of events:
[
  {
    "title": "Event name",
    "date": "YYYY-MM-DD",
    "time": "7:00 PM",
    "description": "Brief description",
    "recurring": false
  }
]

Rules:
- Only include events with SPECIFIC dates
- Parse dates relative to today's date
- If no specific events found, return empty array []
- Skip generic recurring events without dates
- Format: YYYY-MM-DD for dates

RESPOND WITH ONLY VALID JSON ARRAY, NO MARKDOWN.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const events = JSON.parse(content);
    
    if (events.length > 0) {
      console.log(`   ✅ Found ${events.length} events`);
    } else {
      console.log(`   ⚠️  No specific events found`);
    }
    
    return events;
    
  } catch (error) {
    console.error(`   ❌ AI extraction error: ${error.message}`);
    return [];
  }
}

// Save events to database
function saveEvents(venueId, events) {
  return new Promise((resolve) => {
    if (events.length === 0) {
      resolve();
      return;
    }

    let saved = 0;
    events.forEach(event => {
      db.run(
        `INSERT INTO venue_events (venue_id, title, event_date, event_time, description, source, created_at)
         VALUES (?, ?, ?, ?, ?, 'website_scraper', datetime('now'))`,
        [venueId, event.title, event.date, event.time, event.description],
        () => {
          saved++;
          if (saved === events.length) {
            console.log(`   💾 Saved ${saved} events to database`);
            resolve();
          }
        }
      );
    });
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting calendar scraper...\n');

  // Get venues
  const venues = await getVenuesToScrape();
  console.log(`Found ${venues.length} nightlife/lounge venues with websites\n`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let processed = 0;
  let totalEvents = 0;

  for (const venue of venues) {
    processed++;
    console.log(`\n[${processed}/${venues.length}]`);
    
    const events = await scrapeVenueCalendar(venue, browser);
    
    if (events.length > 0) {
      await saveEvents(venue.id, events);
      totalEvents += events.length;
    }

    // Rate limit: 5 seconds between venues
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await browser.close();

  console.log('\n\n✅ SCRAPING COMPLETE!');
  console.log(`   Processed: ${processed} venues`);
  console.log(`   Found: ${totalEvents} events`);

  db.close();
  process.exit(0);
}

main();
