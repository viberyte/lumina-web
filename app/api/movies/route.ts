import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  runtime: number;
  genres: string[];
  overview: string;
  releaseDate: string;
}

interface Theater {
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
}

interface ShowtimeRequest {
  venueId?: number;
  lat?: number;
  lng?: number;
  date?: string; // YYYY-MM-DD
  time?: 'afternoon' | 'evening' | 'night';
}

export async function POST(req: NextRequest) {
  try {
    const body: ShowtimeRequest = await req.json();
    const { venueId, lat, lng, date, time } = body;

    // Get current date if not provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get currently playing movies from TMDB
    const moviesResponse = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1&region=US`
    );
    const moviesData = await moviesResponse.json();

    // Format movies
    const movies: Movie[] = moviesData.results.slice(0, 10).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      rating: Math.round(movie.vote_average * 10) / 10,
      runtime: 120, // Default runtime
      genres: movie.genre_ids.map((id: number) => getGenreName(id)),
      overview: movie.overview,
      releaseDate: movie.release_date,
    }));

    // Get movie details with runtime for top 3
    const detailedMovies = await Promise.all(
      movies.slice(0, 3).map(async (movie) => {
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`
        );
        const details = await detailsResponse.json();
        return {
          ...movie,
          runtime: details.runtime || 120,
        };
      })
    );

    // Find nearby theaters using Google Places
    let searchLat = lat;
    let searchLng = lng;

    // If venueId provided, get venue coordinates
    if (venueId && !lat && !lng) {
      // Query database for venue coordinates
      const db = require('better-sqlite3')('/opt/viberyte/lumina-web/data/lumina.db');
      const venue = db.prepare('SELECT latitude, longitude FROM venues WHERE id = ?').get(venueId);
      if (venue) {
        searchLat = venue.latitude;
        searchLng = venue.longitude;
      }
      db.close();
    }

    let theaters: Theater[] = [];
    
    if (searchLat && searchLng) {
      // Search for movie theaters nearby
      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=5000&type=movie_theater&key=${GOOGLE_MAPS_API_KEY}`
      );
      const placesData = await placesResponse.json();

      theaters = placesData.results.slice(0, 5).map((place: any) => ({
        name: place.name,
        address: place.vicinity,
        distance: calculateDistance(
          searchLat!,
          searchLng!,
          place.geometry.location.lat,
          place.geometry.location.lng
        ),
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      }));
    }

    // Generate suggested showtimes based on time preference
    const showtimes = generateShowtimes(time || 'evening');

    return NextResponse.json({
      success: true,
      date: targetDate,
      movies: detailedMovies.length > 0 ? detailedMovies : movies,
      theaters,
      suggestedShowtimes: showtimes,
      context: {
        searchLocation: searchLat && searchLng ? { lat: searchLat, lng: searchLng } : null,
        timePreference: time || 'evening',
      }
    });

  } catch (error) {
    console.error('Movies API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getGenreName(id: number): string {
  const genres: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
  };
  return genres[id] || 'Unknown';
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function generateShowtimes(timePreference: string): string[] {
  const now = new Date();
  const currentHour = now.getHours();
  
  let startHour: number;
  
  switch (timePreference) {
    case 'afternoon':
      startHour = Math.max(12, currentHour);
      break;
    case 'evening':
      startHour = Math.max(17, currentHour);
      break;
    case 'night':
      startHour = Math.max(19, currentHour);
      break;
    default:
      startHour = currentHour;
  }
  
  const showtimes: string[] = [];
  for (let i = 0; i < 4; i++) {
    const hour = startHour + i;
    if (hour < 24) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      showtimes.push(`${displayHour}:00 ${period}`);
      showtimes.push(`${displayHour}:30 ${period}`);
    }
  }
  
  return showtimes.slice(0, 6);
}
