import { redirect } from 'next/navigation';
import Database from 'better-sqlite3';
import path from 'path';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default async function EventRedirect({ params }: EventPageProps) {
  const { id } = await params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) redirect('/explore');

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));

  try {
    const partnerEvent = db.prepare(
      `SELECT id, title FROM partner_events WHERE id = ?`
    ).get(eventId) as any;

    if (partnerEvent) {
      redirect(`/e/${slugify(partnerEvent.title)}-${partnerEvent.id}`);
    }

    const legacyEvent = db.prepare(
      `SELECT partner_event_id FROM events WHERE id = ?`
    ).get(eventId) as any;

    if (legacyEvent?.partner_event_id) {
      const linked = db.prepare(
        `SELECT id, title FROM partner_events WHERE id = ?`
      ).get(legacyEvent.partner_event_id) as any;

      if (linked) {
        redirect(`/e/${slugify(linked.title)}-${linked.id}`);
      }
    }

    redirect('/explore');
  } finally {
    db.close();
  }
}
