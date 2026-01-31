import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';
import { unlink } from 'fs/promises';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const UPLOAD_DIR = '/mnt/volume/lumina/media/partner';

function getPartnerFromSession(db: Database.Database): any {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('lumina_session');
  if (!sessionCookie?.value) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    if (!session.partner_id) return null;
    return db.prepare(`
      SELECT p.*, v.id as venue_id
      FROM partners p
      LEFT JOIN venues v ON v.claimed_by_partner_id = p.id
      WHERE p.id = ?
    `).get(session.partner_id);
  } catch (e) {
    return null;
  }
}

function verifyMediaOwnership(db: Database.Database, mediaId: number, venueId: number): any {
  return db.prepare(`
    SELECT * FROM partner_media WHERE id = ? AND venue_id = ?
  `).get(mediaId, venueId);
}

// DELETE: Remove media
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(DB_PATH);
    const partner = getPartnerFromSession(db);

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mediaId = parseInt(params.id);
    const media = verifyMediaOwnership(db, mediaId, partner.venue_id);

    if (!media) {
      db.close();
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // If deleting primary, promote next image
    if (media.is_primary) {
      const nextImage = db.prepare(`
        SELECT id FROM partner_media 
        WHERE venue_id = ? AND id != ? 
        ORDER BY uploaded_at DESC 
        LIMIT 1
      `).get(partner.venue_id, mediaId);

      if (nextImage) {
        db.prepare('UPDATE partner_media SET is_primary = 1 WHERE id = ?').run(nextImage.id);
      }
    }

    // Delete from database
    db.prepare('DELETE FROM partner_media WHERE id = ?').run(mediaId);

    // Try to delete file (don't fail if file doesn't exist)
    try {
      const urlParts = media.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filepath = path.join(UPLOAD_DIR, partner.venue_id.toString(), filename);
      await unlink(filepath);
    } catch (e) {
      // File may not exist, that's okay
    }

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Media deleted',
    });

  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
