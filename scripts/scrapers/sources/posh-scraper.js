import BaseScraper from '../base-scraper.js';

class PoshScraper extends BaseScraper {
  constructor() {
    super('posh', 'posh');
    this.baseUrl = 'https://posh.vip';
    this.groups = ['jsm-hospitality-group'];
  }

  async scrape() {
    const allEvents = [];
    for (const group of this.groups) {
      try {
        const url = `${this.baseUrl}/g/${group}`;
        console.log(`[Posh] Fetching: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          try {
            const data = JSON.parse(nextDataMatch[1]);
            const eventList = data?.props?.pageProps?.events || data?.props?.pageProps?.group?.events || [];
            for (const e of eventList) {
              allEvents.push({
                title: e.name || e.title, description: e.description, date: e.startTime?.split('T')[0],
                venue_name: e.venue?.name, city: 'New York', image_url: e.flyer || e.coverPhoto,
                ticket_url: e.url || `${this.baseUrl}/e/${e.slug}`, source_handle: 'posh.vip', vibe_tags: ['nightlife']
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Posh] error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default PoshScraper;
