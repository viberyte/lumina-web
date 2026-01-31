import BaseScraper from '../base-scraper.js';

class ShotgunScraper extends BaseScraper {
  constructor() {
    super('shotgun', 'shotgun');
    this.baseUrl = 'https://shotgun.live/en/cities/new-york';
    this.genres = ['house', 'hip-hop', 'techno'];
  }

  async scrape() {
    const allEvents = [];
    for (const genre of this.genres) {
      try {
        const url = `${this.baseUrl}/${genre}`;
        console.log(`[Shotgun] Fetching: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          try {
            const data = JSON.parse(nextDataMatch[1]);
            const eventList = data?.props?.pageProps?.events || [];
            for (const e of eventList) {
              allEvents.push({
                title: e.name, description: e.description, date: e.startDate?.split('T')[0],
                venue_name: e.venue?.name, city: 'New York', image_url: e.coverUrl,
                ticket_url: e.url, source_handle: 'shotgun.live', music_genre: genre, vibe_tags: [genre]
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Shotgun] ${genre} error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default ShotgunScraper;
