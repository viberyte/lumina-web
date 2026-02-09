import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================
// REDIRECT SHIM — /api/worlds/[world] → /api/perspectives/[world]
// Single source of truth: /api/perspectives
// This exists only for backward compatibility while mobile migrates
// ============================================
export async function GET(request: NextRequest, { params }: { params: { world: string } }) {
  const worldKey = params.world.toLowerCase();
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `https://lumina.viberyte.com/api/perspectives/${worldKey}${searchParams ? '?' + searchParams : ''}`;

  return NextResponse.redirect(targetUrl, 307);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
