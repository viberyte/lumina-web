import { Metadata } from 'next';
import WelcomeClient from './WelcomeClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Viberyte — Curated for You',
    description: 'Personalized local discovery powered by Viberyte',
    viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  };
}

export default function WelcomePage({ params }: { params: { slug: string } }) {
  return <WelcomeClient slug={params.slug} />;
}
