import { NextRequest, NextResponse } from 'next/server';

// This endpoint returns trip data for share cards
// Later we'll add image generation with @vercel/og or canvas

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('id');
  
  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID required' }, { status: 400 });
  }
  
  // For now, return mock data structure
  // In production, this would fetch from user's trip data via auth
  return NextResponse.json({
    success: true,
    shareUrl: `https://lumina.viberyte.com/trip/${tripId}`,
    ogImage: `https://lumina.viberyte.com/api/og/trip?id=${tripId}`,
    message: 'Share card endpoint ready'
  });
}
