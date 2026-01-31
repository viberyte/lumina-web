import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Database from 'better-sqlite3';

puppeteer.use(StealthPlugin());

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile Safari/605.1.15';

(async () => {
  console.log('🟣 POSH STEALTH SCRAPER STARTING...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(MOBILE_UA);
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  const seen = new Set();
  const events = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/trpc/events.')) return;

    try {
      const text = await response.text();
      if (!text.includes('startsAt')) return;

      const json = JSON.parse(text);
      extractEvents(json);
    } catch {}
  });

  function extractEvents(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (obj.event?.name && obj.event?.startsAt && obj.event?.slug) {
      const key = `${obj.event.slug}-${obj.event.startsAt}`;
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        name: obj.event.name,
        venue_name: obj.event.venue?.name || null,
        date: obj.event.startsAt,
        ticket_url: `https://posh.vip/e/${obj.event.slug}`,
        confidence: 85
      });

      console.log('✅', obj.event.name);
    }

    if (Array.isArray(obj.items)) {
      obj.items.forEach(extractEvents);
    }

    for (const k in obj) extractEvents(obj[k]);
  }

  console.log('📱 Loading POSH explore...');
  await page.goto('https://posh.vip/explore', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await delay(4000);

  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * (0.6 + Math.random()));
    });
    await delay(1800 + Math.random() * 1200);
  }

  console.log(`\n📋 Total events captured: ${events.length}`);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events
    (name, venue_name, date, ticket_url, city, source_type, confidence, created_at)
    VALUES (?, ?, ?, ?, 'New York', 'posh', ?, datetime('now'))
  `);

  for (const e of events) {
    stmt.run(
      e.name,
      e.venue_name,
      e.date,
      e.ticket_url,
      e.confidence
    );
  }

  console.log(`💾 Added ${events.length} POSH events`);
  await browser.close();
})();
