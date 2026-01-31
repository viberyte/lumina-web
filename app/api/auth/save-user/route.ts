import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await request.json();

    // For demo: just acknowledge
    // In production: save to database
    console.log('✅ User saved:', user.email);

    return NextResponse.json({
      success: true,
      userId: user.id,
    });

  } catch (error) {
    console.error('Save user error:', error);
    return NextResponse.json(
      { error: 'Failed to save user' },
      { status: 500 }
    );
  }
}
