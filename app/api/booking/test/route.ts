import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'test endpoint disabled - missing Twilio credentials' });
}
