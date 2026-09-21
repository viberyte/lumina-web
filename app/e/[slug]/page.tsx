import { notFound } from 'next/navigation';
import Database from 'better-sqlite3';
import path from 'path';
import { Metadata } from 'next';
import NightLinkClient from './NightLinkClient';

interface EventData {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  genre: string | null;
  image_url: string | null;
  guest_list_enabled: number;
  guest_list_price: number;
  packages: string | null;
  sections: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_instagram: string | null;
  promoter_name: string | null;
  promoter_ig: string | null;
  promoter_photo: string | null;
  partner_id: number | null;
  payment_venmo: string | null;
  payment_zelle: string | null;
  payment_cashapp: string | null;
  is_demo: number;
  is_claimed: number;
  claim_token: string | null;
}

function getEvent(slug: string): EventData | null {
  const parts = slug.split('-');
  const id = parseInt(parts[parts.length - 1]);
  if (isNaN(id)) return null;

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));

  try {
    const event = db.prepare(`
      SELECT pe.*,
             pv.name as venue_name,
             pv.address as venue_address,
             pv.instagram as venue_instagram,
             pv.payment_venmo,
             pv.payment_zelle,
             pv.payment_cashapp,
             pp.id as partner_id,
             pp.business_name as promoter_name,
             pp.instagram_handle as promoter_ig,
             pp.profile_picture as promoter_photo,
             pp.is_demo,
             pp.is_claimed,
             pp.claim_token
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      LEFT JOIN partners pp ON pe.partner_id = pp.id
      WHERE pe.id = ? AND pe.status = 'published'
    `).get(id) as EventData | undefined;

    if (event) {
      db.prepare('UPDATE partner_events SET views = views + 1 WHERE id = ?').run(id);
    }

    return event || null;
  } finally {
    db.close();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return { title: 'Event Not Found' };

  const description = event.description || `${event.title} at ${event.venue_name}`;

  return {
    title: `${event.title} | Viberyte`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'website',
      siteName: 'Viberyte',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  return <NightLinkClient event={JSON.parse(JSON.stringify(event))} />;
}
