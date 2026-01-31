import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    
    if (isNaN(venueId)) {
      return NextResponse.json(
        { error: 'Invalid venue ID' },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Get venue's photo columns
    const venue = db.prepare(`
      SELECT 
        id,
        name,
        google_place_id,
        instagram_handle,
        image_url,
        professional_photo_url,
        professional_photos,
        google_photos,
        yelp_photos_json
      FROM venues 
      WHERE id = ?
    `).get(venueId);

    db.close();

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    const photos: any[] = [];

    // 1. Add primary image_url if exists
    if (venue.image_url) {
      photos.push({
        url: venue.image_url,
        source: 'primary',
        type: 'business'
      });
    }

    // 2. Add professional_photo_url if exists
    if (venue.professional_photo_url && venue.professional_photo_url !== venue.image_url) {
      photos.push({
        url: venue.professional_photo_url,
        source: 'professional',
        type: 'business'
      });
    }

    // 3. Parse professional_photos JSON
    if (venue.professional_photos) {
      try {
        const profPhotos = JSON.parse(venue.professional_photos);
        if (Array.isArray(profPhotos)) {
          profPhotos.forEach((p: any) => {
            const url = typeof p === 'string' ? p : p.url;
            if (url && !photos.find(x => x.url === url)) {
              photos.push({
                url: url,
                source: 'professional',
                type: 'business'
              });
            }
          });
        }
      } catch {}
    }

    // 4. Parse google_photos JSON
    if (venue.google_photos) {
      try {
        const googlePhotos = JSON.parse(venue.google_photos);
        if (Array.isArray(googlePhotos)) {
          googlePhotos.forEach((p: any) => {
            const url = typeof p === 'string' ? p : p.url;
            if (url && !photos.find(x => x.url === url)) {
              photos.push({
                url: url,
                source: 'google',
                type: 'business'
              });
            }
          });
        }
      } catch {}
    }

    // 5. Parse yelp_photos_json
    if (venue.yelp_photos_json) {
      try {
        const yelpPhotos = JSON.parse(venue.yelp_photos_json);
        if (Array.isArray(yelpPhotos)) {
          yelpPhotos.forEach((p: any) => {
            const url = typeof p === 'string' ? p : p.url;
            if (url && !photos.find(x => x.url === url)) {
              photos.push({
                url: url,
                source: 'yelp',
                type: 'business'
              });
            }
          });
        }
      } catch {}
    }

    // 6. Fetch from Google Places API if needed and we have place_id
    if (photos.length < 5 && venue.google_place_id && GOOGLE_API_KEY) {
      try {
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${venue.google_place_id}&fields=photos&key=${GOOGLE_API_KEY}`;
        
        const response = await fetch(placeDetailsUrl);
        const data = await response.json();

        if (data.result?.photos) {
          data.result.photos.slice(0, 10).forEach((photo: any) => {
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
            photos.push({
              url: photoUrl,
              source: 'google_places_api',
              type: 'business',
              attribution: photo.html_attributions?.[0] || null
            });
          });
        }
      } catch (error) {
        console.error('Error fetching Google Places photos:', error);
      }
    }

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      venue_name: venue.name,
      total_photos: photos.length,
      photos: photos
    });

  } catch (error) {
    console.error('Error fetching business photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business photos' },
      { status: 500 }
    );
  }
}
