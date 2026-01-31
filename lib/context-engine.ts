/**
 * LUMINA CONTEXT ENGINE
 */

interface PrimaryVenueContext {
  id: number;
  name: string;
  category: string;
  cuisine_primary?: string;
  vibe_tags?: any;
  mood_tags?: any;
  music_genres?: any;
  neighborhood: string;
  price_tier?: string;
}

interface DateContext {
  type: 'tonight' | 'weekend' | 'date';
  date?: string;
  timeOfDay: string;
}

interface ContextAnalysis {
  primaryContext: {
    isRomantic: boolean;
    isCasual: boolean;
    isUpscale: boolean;
    isCultural: boolean;
    timePhase: 'breakfast' | 'brunch' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'late_night';
    energyLevel: 'calm' | 'moderate' | 'high';
    primaryCuisine: string;
    primaryMusic?: string;
  };
  recommendations: {
    safe: RecommendationStrategy;
    elevated: RecommendationStrategy;
    wildcard: RecommendationStrategy;
  };
}

interface RecommendationStrategy {
  preferredCategories: string[];
  preferredCuisines: string[];
  preferredVibes: string[];
  preferredMusicGenres: string[];
  avoidCategories: string[];
  contextReasoning: string;
}

export class ContextEngine {
  
  private parseArray(data: any): string[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private getTimePhase(timeOfDay: string): 'breakfast' | 'brunch' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'late_night' {
    const hour = parseInt(timeOfDay.split(':')[0]);
    
    if (hour >= 6 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 12) return 'brunch';
    if (hour >= 12 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'dinner';
    if (hour >= 21 && hour < 24) return 'evening';
    return 'late_night';
  }

  public analyzeContext(primaryVenue: PrimaryVenueContext, dateContext: DateContext): ContextAnalysis {
    const vibes = this.parseArray(primaryVenue.vibe_tags).map(v => v.toLowerCase());
    const moods = this.parseArray(primaryVenue.mood_tags).map(m => m.toLowerCase());
    const musicGenres = this.parseArray(primaryVenue.music_genres).map(g => g.toLowerCase());
    
    const category = (primaryVenue.category || '').toLowerCase();
    const cuisine = (primaryVenue.cuisine_primary || '').toLowerCase();
    const timePhase = this.getTimePhase(dateContext.timeOfDay);

    const isRomantic: boolean = vibes.some(v => ['romantic', 'intimate', 'date'].includes(v)) || 
                                 moods.some(m => ['date night', 'romantic'].includes(m));
    
    const isCasual: boolean = vibes.some(v => ['casual', 'laid-back', 'chill'].includes(v));
    
    const isUpscale: boolean = vibes.some(v => ['upscale', 'luxury', 'fine dining', 'elegant'].includes(v)) ||
                               (!!primaryVenue.price_tier && ['$$$', '$$$$'].includes(primaryVenue.price_tier));
    
    const isCultural: boolean = cuisine.includes('african') || cuisine.includes('caribbean') || 
                                cuisine.includes('ethiopian') || cuisine.includes('nigerian') ||
                                musicGenres.some(g => ['afrobeats', 'amapiano', 'reggae', 'soca'].includes(g));

    const energyLevel: 'calm' | 'moderate' | 'high' = 
      category.includes('club') || category.includes('nightlife') ? 'high' :
      category.includes('lounge') || category.includes('bar') ? 'moderate' : 'calm';

    const recommendations = this.buildRecommendations({
      isRomantic,
      isCasual,
      isUpscale,
      isCultural,
      timePhase,
      energyLevel,
      category,
      cuisine,
      musicGenres,
      vibes
    });

    return {
      primaryContext: {
        isRomantic,
        isCasual,
        isUpscale,
        isCultural,
        timePhase,
        energyLevel,
        primaryCuisine: cuisine,
        primaryMusic: musicGenres[0]
      },
      recommendations
    };
  }

  private buildRecommendations(context: any): ContextAnalysis['recommendations'] {
    const { isRomantic, isCultural, timePhase, category, cuisine, musicGenres } = context;

    const safe: RecommendationStrategy = {
      preferredCategories: [],
      preferredCuisines: [],
      preferredVibes: ['cozy', 'quiet', 'intimate', 'chill', 'calm'],
      preferredMusicGenres: [],
      avoidCategories: ['nightlife', 'club'],
      contextReasoning: ''
    };

    if (['breakfast', 'brunch', 'lunch'].includes(timePhase)) {
      safe.preferredCategories = ['cafe', 'dessert', 'bakery'];
      safe.preferredCuisines = ['coffee', 'cafe', 'dessert', 'bakery', 'ice cream'];
      safe.contextReasoning = 'Perfect spot to relax after your meal';
    } else if (['dinner', 'evening'].includes(timePhase)) {
      safe.preferredCategories = ['dessert', 'cafe', 'lounge'];
      safe.preferredCuisines = ['dessert', 'ice cream', 'bakery', 'gelato'];
      safe.contextReasoning = 'Sweet ending to cap off your night';
    } else {
      safe.preferredCategories = ['diner', 'late-night', 'pizza'];
      safe.preferredCuisines = ['pizza', 'diner', 'american', 'comfort food'];
      safe.contextReasoning = 'Satisfy those late-night cravings';
    }

    if (isRomantic) {
      safe.preferredVibes.push('romantic', 'scenic', 'waterfront');
      safe.contextReasoning = 'Intimate spot to continue the romantic vibe';
    }

    const elevated: RecommendationStrategy = {
      preferredCategories: ['lounge', 'rooftop', 'speakeasy', 'bar'],
      preferredCuisines: [],
      preferredVibes: ['rooftop', 'speakeasy', 'trendy', 'hip', 'upscale', 'views'],
      preferredMusicGenres: [],
      avoidCategories: ['diner', 'fast food'],
      contextReasoning: 'Elevated vibes to match your energy'
    };

    if (['breakfast', 'brunch', 'lunch'].includes(timePhase)) {
      elevated.preferredCategories = ['rooftop', 'lounge', 'wine bar'];
      elevated.contextReasoning = 'Day-drinking with great views';
    } else if (timePhase === 'afternoon') {
      elevated.preferredCategories = ['rooftop', 'lounge', 'cocktail bar'];
      elevated.contextReasoning = 'Catch golden hour at this spot';
    } else {
      elevated.preferredCategories = ['lounge', 'rooftop', 'speakeasy', 'jazz club'];
      elevated.contextReasoning = 'Sophisticated vibes for the rest of your night';
    }

    if (isCultural) {
      elevated.preferredMusicGenres = ['jazz', 'r&b', 'neo-soul', 'afrobeats'];
      elevated.contextReasoning = 'Continue the cultural experience';
    }

    if (isRomantic) {
      elevated.preferredVibes.push('romantic', 'scenic', 'intimate');
      elevated.preferredCategories.push('wine bar', 'cocktail lounge');
    }

    const wildcard: RecommendationStrategy = {
      preferredCategories: ['nightlife', 'club', 'dance'],
      preferredCuisines: [],
      preferredVibes: ['energetic', 'lively', 'party', 'dance', 'club', 'mixy'],
      preferredMusicGenres: [],
      avoidCategories: ['cafe', 'quiet'],
      contextReasoning: 'Turn the energy all the way up'
    };

    if (['breakfast', 'brunch', 'lunch'].includes(timePhase)) {
      wildcard.preferredCategories = ['day party', 'rooftop party', 'brunch party'];
      wildcard.contextReasoning = 'Day party vibes to keep it going';
    } else if (['afternoon', 'dinner'].includes(timePhase)) {
      wildcard.preferredCategories = ['happy hour', 'club', 'lounge'];
      wildcard.contextReasoning = 'Get the party started early';
    } else {
      wildcard.preferredCategories = ['nightlife', 'club', 'after hours'];
      wildcard.contextReasoning = 'Full send mode activated';
    }

    if (isCultural || musicGenres.some((g: string) => ['afrobeats', 'amapiano'].includes(g))) {
      wildcard.preferredMusicGenres = ['afrobeats', 'amapiano', 'dancehall', 'reggaeton'];
      wildcard.contextReasoning = 'Keep the cultural vibes going with high energy';
    } else {
      wildcard.preferredMusicGenres = ['hip-hop', 'edm', 'house', 'latin'];
    }

    return { safe, elevated, wildcard };
  }

  public scoreVenue(venue: any, strategy: RecommendationStrategy): number {
    let score = 0;
    
    const category = (venue.category || '').toLowerCase();
    const cuisine = (venue.cuisine_primary || '').toLowerCase();
    const vibes = this.parseArray(venue.vibe_tags).map((v: string) => v.toLowerCase());
    const musicGenres = this.parseArray(venue.music_genres).map((g: string) => g.toLowerCase());

    if (strategy.preferredCategories.some(cat => category.includes(cat))) {
      score += 30;
    }

    if (strategy.avoidCategories.some(cat => category.includes(cat))) {
      score -= 50;
    }

    if (strategy.preferredCuisines.some(cui => cuisine.includes(cui))) {
      score += 25;
    }

    const vibeMatches = vibes.filter(v => strategy.preferredVibes.includes(v)).length;
    score += vibeMatches * 10;

    const musicMatches = musicGenres.filter(g => strategy.preferredMusicGenres.includes(g)).length;
    score += musicMatches * 15;

    return score;
  }

  public scoreEvent(event: any, strategy: RecommendationStrategy): number {
    let score = 0;
    
    const genre = (event.genre || '').toLowerCase();
    const title = (event.title || '').toLowerCase();

    if (strategy.preferredMusicGenres.some(g => genre.includes(g) || title.includes(g))) {
      score += 40;
    }

    if (strategy.avoidCategories.includes('nightlife') && genre.includes('club')) {
      score -= 30;
    }

    if (strategy.preferredCategories.includes('nightlife') && genre.includes('club')) {
      score += 35;
    }

    return score;
  }
}

export const contextEngine = new ContextEngine();
