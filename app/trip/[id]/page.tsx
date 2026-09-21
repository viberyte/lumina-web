import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';

interface TripPageProps {
  params: { id: string };
}

async function getTrip(id: string) {
  const { data, error } = await supabaseServer
    .from('lumina_trips')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const trip = await getTrip(params.id);

  if (!trip) {
    return { title: 'Trip Not Found | Viberyte' };
  }

  const ogImageUrl = `https://lumina.viberyte.com/api/og/trip?id=${params.id}`;
  const venueCount = trip.venues?.length || 0;
  const venueText = venueCount === 1 ? '1 place' : `${venueCount} places`;

  return {
    title: `${trip.name} - ${venueText} | Viberyte`,
    description: `Check out this curated nightlife experience with ${venueText}.`,
    openGraph: {
      title: trip.name,
      description: `${venueText} • Curated on Viberyte`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: trip.name }],
      type: 'website',
      url: `https://lumina.viberyte.com/trip/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: trip.name,
      description: `${venueText} • Curated on Viberyte`,
      images: [ogImageUrl],
    },
  };
}

export default async function TripPage({ params }: TripPageProps) {
  const trip = await getTrip(params.id);

  if (!trip) notFound();

  const venues = trip.venues || [];
  const heroImage = venues[0]?.venueImage;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-[60vh] w-full">
        {heroImage ? (
          <Image src={heroImage} alt={trip.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h1 className="text-5xl font-bold mb-2">{trip.name}</h1>
          <p className="text-xl text-purple-300">
            {venues.length} {venues.length === 1 ? 'place' : 'places'}
          </p>
        </div>
      </div>

      {/* Venues */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">The Lineup</h2>
        
        <div className="space-y-4">
          {venues.map((venue: any, index: number) => (
            <div key={venue.venueId} className="flex items-center gap-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold">{index + 1}</span>
              </div>
              
              {venue.venueImage && (
                <Image 
                  src={venue.venueImage} 
                  alt={venue.venueName}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{venue.venueName}</h3>
                {venue.neighborhood && (
                  <p className="text-sm text-gray-400">{venue.neighborhood}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="https://apps.apple.com/app/lumina" className="inline-block px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition transform hover:scale-105">
            Create Your Own Plan
          </Link>
          <p className="text-gray-400 mt-4">Plan nights, not searches.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-20 py-8 text-center text-gray-500 text-sm">
        <p>Powered by Viberyte</p>
      </div>
    </div>
  );
}
