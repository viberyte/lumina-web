import puppeteer from 'puppeteer';

async function debug() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log('\n📡 Testing DICE NYC...');
  
  try {
    await page.goto('https://dice.fm/events/new-york', { 
      waitUntil: 'networkidle0', 
      timeout: 60000 
    });
    
    // Wait longer for React to render
    console.log('Waiting 8 seconds for JS to render...');
    await new Promise(r => setTimeout(r, 8000));
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Get page info
    const info = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return {
        htmlLength: body.length,
        hasReact: body.includes('__NEXT_DATA__') || body.includes('react'),
        title: document.title,
        allAnchors: document.querySelectorAll('a').length,
        eventAnchors: document.querySelectorAll('a[href*="event"]').length,
        // Get all unique class names containing 'event'
        eventClasses: [...new Set([...document.querySelectorAll('*')].map(el => el.className).filter(c => c && c.toString().toLowerCase().includes('event')))].slice(0, 10),
        // Sample anchor hrefs
        sampleHrefs: [...document.querySelectorAll('a')].slice(0, 30).map(a => a.href).filter(h => h.includes('dice')),
        // Get any divs with interesting content
        textsWithDates: [...document.querySelectorAll('*')].filter(el => el.textContent?.match(/\b(Nov|Dec|Jan|Feb)\b/i)).slice(0, 5).map(el => ({
          tag: el.tagName,
          class: el.className?.toString()?.substring(0, 50),
          text: el.textContent?.substring(0, 100)
        }))
      };
    });
    
    console.log('\nPage Analysis:');
    console.log('HTML Length:', info.htmlLength);
    console.log('Title:', info.title);
    console.log('Has React:', info.hasReact);
    console.log('All anchors:', info.allAnchors);
    console.log('Event anchors:', info.eventAnchors);
    console.log('\nEvent classes found:', info.eventClasses);
    console.log('\nSample hrefs:', info.sampleHrefs.slice(0, 10));
    console.log('\nTexts with dates:', JSON.stringify(info.textsWithDates, null, 2));
    
    // Try to find events with broader selectors
    const events = await page.evaluate(() => {
      const results = [];
      
      // Method 1: Find all links that might be events
      document.querySelectorAll('a').forEach(a => {
        const href = a.href || '';
        if (href.includes('/event/') || href.includes('/events/')) {
          const parent = a.closest('div') || a.parentElement;
          results.push({
            method: 'link',
            href: href,
            text: a.textContent?.trim()?.substring(0, 100),
            parentClass: parent?.className?.toString()?.substring(0, 50)
          });
        }
      });
      
      // Method 2: Find by text pattern (dates)
      document.querySelectorAll('div, article, section').forEach(el => {
        const text = el.textContent || '';
        if (text.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b.*\b(Nov|Dec|Jan)\b/i) && text.length < 500) {
          const link = el.querySelector('a');
          results.push({
            method: 'date-pattern',
            text: text.substring(0, 150),
            href: link?.href,
            class: el.className?.toString()?.substring(0, 50)
          });
        }
      });
      
      return results.slice(0, 20);
    });
    
    console.log('\n\nFound potential events:', events.length);
    console.log(JSON.stringify(events, null, 2));
    
    // Save screenshot
    await page.screenshot({ path: '/tmp/dice-debug.png', fullPage: false });
    console.log('\nScreenshot saved to /tmp/dice-debug.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
}

debug().catch(console.error);
