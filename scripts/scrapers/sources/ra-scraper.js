import BaseScraper from '../base-scraper.js';

class RAScraper extends BaseScraper {
  constructor() {
    super('resident-advisor', 'ra');
    this.baseUrl = 'https://ra.co';
    this.genres = ['hiphop', 'afrobeat', 'house', 'techno', 'rnb'];
  }

  async scrape() {
    const allEvents = [];
    console.log('[RA] Scraping genre pages...');
    
    for (const genre of this.genres) {
      try {
        const url = `${this.baseUrl}/events/us/newyorkcity/${genre}`;
        console.log(`[RA] Fetching: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const events = this.parseHTML(html, genre);
        allEvents.push(...events);
        console.log(`[RA] ${genre}: Found ${events.length} events`);
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[RA] ${genre} error:`, error.message);
      }
    }
    return allEvents;
  }

  parseHTML(html, genre) {
    const events = [];
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
        if (data['@type'] === 'Event') {
          events.push({
            title: data.name, description: data.description, date: data.startDate?.split('T')[0],
            time: data.startDate?.split('T')[1]?.substring(0, 5), venue_name: data.location?.name,
            city: 'New York', image_url: data.image, ticket_url: data.url, source_handle: 'ra.co',
            music_genre: genre, vibe_tags: [genre]
          });
        }
      } catch {}
    }
    return events;
  }
}

export default RAScraper;
