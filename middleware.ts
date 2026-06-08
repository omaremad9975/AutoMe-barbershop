import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (DEMO_MODE) {
    const demoSession = request.cookies.get('demo_session')?.value;

    // Allow static/api routes always
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }

    if (demoSession === 'active') {
      // Logged in — redirect away from login
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard/pos', request.url));
      }
      return NextResponse.next();
    } else {
      // Not logged in — allow login page, redirect everything else
      if (!pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
