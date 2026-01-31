import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAO_URL = 'https://taogroup.com/events/?event_city=78'; // NYC

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(imageUrl, eventName) {
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000
    });

    const sanitizedName = eventName.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
    const timestamp = Date.now();
    const filename = `tao-${sanitizedName}-${timestamp}.jpg`;
    const localPath = path.join(__dirname, '..', '..', 'public', 'event-images', filename);

    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/event-images/${filename}`));
      writer.on('error', reject);
    });
  } catch (error) {
    return null;
  }
}

async function scrapeTaoEvents() {
  console.log('🎬 Starting TAO Group scraper...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  console.log(`🏙️ Loading TAO Group NYC Events...`);
  console.log(`   URL: ${TAO_URL}\n`);
  
  try {
    await page.goto(TAO_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    
    console.log('   Waiting for events to load...');
    await wait(8000);

    // Scroll to load all events
    console.log('   Scrolling to load more events...');
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await wait(2000);
    }

    // Try clicking "Load More" if exists
    try {
      const loadMore = await page.$('button:has-text("Load More"), .load-more, [class*="load"]');
      if (loadMore) {
        console.log('   Clicking "Load More"...');
        await loadMore.click();
        await wait(3000);
      }
    } catch (e) {}

    const events = await page.evaluate(() => {
      const results = [];
      
      // TAO-specific selectors
      const selectors = [
        '.event-item',
        '.event-card',
        '[class*="event"]',
        'article',
        'a[href*="/events/"]'
      ];

      let eventCards = [];
      for (const selector of selectors) {
        eventCards = document.querySelectorAll(selector);
        if (eventCards.length > 0) {
          console.log(`Found ${eventCards.length} with: ${selector}`);
          break;
        }
      }

      eventCards.forEach((card, index) => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
          const venue = card.querySelector('.venue, [class*="venue"], [class*="location"]');
          const date = card.querySelector('time, [datetime], .date, [class*="date"]');
          const image = card.querySelector('img');
          const link = card.querySelector('a') || card;

          const eventTitle = title ? title.textContent.trim() : null;
          const venueName = venue ? venue.textContent.trim() : 'TAO Group Venue';

          if (eventTitle && eventTitle.length > 3) {
            results.push({
              name: eventTitle,
              venue_name: venueName,
              event_date: date ? (date.getAttribute('datetime') || date.textContent.trim()) : null,
              image_url: image ? (image.src || image.getAttribute('data-src')) : null,
              ticket_url: link ? link.href : null,
              source: 'taogroup.com',
              promoter: 'TAO Group',
              tags: JSON.stringify(['Upscale', 'Nightclub', 'VIP'])
            });
          }
        } catch (e) {
          console.error(`Error on card ${index}:`, e);
        }
      });

      return results;
    });

    console.log(`\n   ✅ Found ${events.length} TAO Group events`);
    
    // Save debug screenshot
    const screenshotPath = path.join(__dirname, '..', '..', 'data', 'events', 'debug-tao.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot: ${screenshotPath}`);

    await page.close();
    await browser.close();

    console.log(`\n📊 Total TAO Group events: ${events.length}`);
    return events;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
    return [];
  }
}

async function saveToDatabase(events) {
  console.log('\n💾 Saving to database...');
  
  const dbPath = path.join(__dirname, '..', '..', 'data', 'venues.db');
  const db = new Database(dbPath);

  let savedCount = 0;
  let duplicateCount = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      name, venue_name, event_date, source, promoter, ticket_url, 
      image_url, image_local_path, tags, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const event of events) {
    try {
      let localImagePath = null;
      if (event.image_url && event.image_url.startsWith('http')) {
        console.log(`📸 ${event.name}`);
        localImagePath = await downloadImage(event.image_url, event.name);
      }

      let eventDate = null;
      if (event.event_date) {
        try {
          const dateObj = new Date(event.event_date);
          if (!isNaN(dateObj.getTime())) {
            eventDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {}
      }

      const result = insertStmt.run(
        event.name,
        event.venue_name,
        eventDate,
        event.source,
        event.promoter,
        event.ticket_url,
        event.image_url,
        localImagePath,
        event.tags
      );

      if (result.changes > 0) {
        savedCount++;
        console.log(`   ✅ ${event.name}`);
      } else {
        duplicateCount++;
      }
    } catch (error) {
      console.error(`   ❌ ${error.message}`);
    }
  }

  db.close();

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Saved: ${savedCount}`);
  console.log(`   ⏭️  Duplicates: ${duplicateCount}`);

  return { savedCount, duplicateCount };
}

async function main() {
  try {
    console.log('🚀 TAO Group Event Scraper\n');
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    const events = await scrapeTaoEvents();

    if (events.length === 0) {
      console.log('\n⚠️  No events found. Check debug screenshot.');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, '..', '..', 'data', 'events', `tao-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    console.log(`\n💾 Raw: ${outputPath}`);

    // await // saveToDatabase(events);
    console.log('\n✅ TAO GROUP SCRAPER COMPLETE!');

  } catch (error) {
    console.error('❌ Fatal:', error);
    process.exit(1);
  }
}

main();
