import { NextRequest, NextResponse } from 'next/server';

const DEMO_EMAIL = 'omaremad9975@gmail.com';
const DEMO_PASSWORD = '123';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('demo_session', 'active', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
