import { Metadata } from 'next';
import VenueProfile from './VenueProfile';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Venue — Viberyte' };
}

export default function VenuePage({ params }: { params: { id: string } }) {
  return <VenueProfile id={params.id} />;
}
