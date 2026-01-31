import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const uploadDir = '/opt/viberyte/lumina-web/public/partner-uploads';

export async function POST(request: NextRequest) {
  const db = new Database(dbPath);
  
  try {
    let token = request.cookies.get('partner_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    }
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = db.prepare(`SELECT partner_id FROM partner_sessions WHERE token = ? AND expires_at > datetime('now')`).get(token) as any;
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'gallery';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Create upload directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${session.partner_id}-${type}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `/partner-uploads/${filename}`;
    
    console.log(`✅ Uploaded ${type} for partner ${session.partner_id}: ${url}`);

    return NextResponse.json({ success: true, url, filename });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}
