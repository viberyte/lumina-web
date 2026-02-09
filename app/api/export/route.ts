import { NextResponse } from 'next/server';
import fs from 'fs';

export async function GET() {
  try {
    const csv = fs.readFileSync('/tmp/lumina-outreach-list.csv', 'utf8');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=lumina-outreach-list.csv'
      }
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
