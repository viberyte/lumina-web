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
  console.log('\n🟣 POSH NYC STEALTH SCRAPER STARTING...\n');

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

  // Intercept POSH event APIs
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
      pushEvent(obj.event);
    }

    if (Array.isArray(obj.items)) {
      obj.items.forEach(extractEvents);
    }

    for (const k in obj) extractEvents(obj[k]);
  }

  function pushEvent(e) {
    const city =
      e.city ||
      e.venue?.city ||
      e.location?.city ||
      '';

    if (
      !city.toLowerCase().includes('new york') &&
      !city.toLowerCase().includes('nyc')
    ) {
      return;
    }

    const key = `${e.slug}-${e.startsAt}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      name: e.name,
      venue_name: e.venue?.name || null,
      date: e.startsAt,
      ticket_url: `https://posh.vip/e/${e.slug}`,
      city: 'New York',
      source_type: 'posh',
      confidence: 85
    });

    console.log('✅', e.name);
  }

  console.log('📱 Loading POSH explore...');
  await page.goto('https://posh.vip/explore', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Force city = New York
  await delay(3000);
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const nycBtn = buttons.find(b =>
      b.innerText?.toLowerCase().includes('new york')
    );
    if (nycBtn) nycBtn.click();
  });
  await delay(3000);

  // Human-like scrolling
  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * (0.6 + Math.random()));
    });
    await delay(1800 + Math.random() * 1200);
  }

  console.log(`\n📋 Total NYC events captured: ${events.length}`);

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

  console.log(`💾 Added ${events.length} NYC POSH events`);
  await browser.close();
})();
