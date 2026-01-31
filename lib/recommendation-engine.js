import Database from 'better-sqlite3';

export class RecommendationEngine {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }
  
  getRecommendations(context) {
    const {
      city = 'New York',
      vibe = null,
      who = null,
      when = null,
      cuisine = null,
      musicGenre = null,
      limit = 12
    } = context;
    
    const filters = [];
    const params = {};
    
    filters.push('viberyte_certified = 1');
    filters.push('should_exclude = 0');
    filters.push('professional_photos IS NOT NULL');
    
    params.city = `%${city.toLowerCase()}%`;
    filters.push('LOWER(city) LIKE @city');
    
    if (vibe) {
      const vibeCategory = this.mapVibeToCategory(vibe);
      if (vibeCategory) {
        params.category = vibeCategory;
        filters.push('LOWER(category) = @category');
      }
    }
    
    if (musicGenre) {
      params.music = `%${musicGenre.toLowerCase()}%`;
      filters.push('LOWER(music_genres) LIKE @music');
    }
    
    if (cuisine) {
      params.cuisine = `%${cuisine.toLowerCase()}%`;
      filters.push('LOWER(cuisine) LIKE @cuisine');
    }
    
    if (who) {
      const idealFor = this.mapWhoToIdealFor(who);
      params.idealFor = `%${idealFor}%`;
      filters.push('LOWER(ideal_for) LIKE @idealFor');
    }
    
    const whereClause = filters.join(' AND ');
    
    const sql = `
      SELECT 
        id, name, city, neighborhood, address, category,
        cuisine, vibe_tags, music_genres, ideal_for,
        special_features, dress_code, google_rating as rating,
        professional_photos, bio, opentable_url, resy_url,
        yelp_reservation_url, viberyte_score,
        certification_reasoning as why_recommended
      FROM venues
      WHERE ${whereClause}
      ORDER BY viberyte_score DESC, google_rating DESC
      LIMIT ${limit}
    `;
    
    const venues = this.db.prepare(sql).all(params);
    
    return venues.map(v => {
      const photos = v.professional_photos ? JSON.parse(v.professional_photos) : [];
      return {
        ...v,
        photos: photos,
        photo_url: photos[0] || null,
        professional_photo_url: photos[0] || null
      };
    });
  }
  
  mapVibeToCategory(vibe) {
    const vibeMap = {
      'dinner': 'dining',
      'restaurant': 'dining',
      'dining': 'dining',
      'lounge': 'lounge',
      'bar': 'lounge',
      'cocktails': 'lounge',
      'nightlife': 'nightlife',
      'club': 'nightlife',
      'nightclub': 'nightlife',
      'brunch': 'dining'
    };
    
    return vibeMap[vibe.toLowerCase()] || null;
  }
  
  mapWhoToIdealFor(who) {
    const whoMap = {
      'solo': 'solo-dining',
      'date': 'date-night',
      'friends': 'friends',
      'group': 'group',
      'business': 'business-dinner'
    };
    
    return whoMap[who.toLowerCase()] || who.toLowerCase();
  }
  
  close() {
    this.db.close();
  }
}
