/**
 * Middleware — protects routes and redirects unauthenticated users.
 * 
 * Protected routes: /, /financing, /cash-flows, /obligations, /scenarios, /alerts, /calendar, /import-export, /settings
 * Auth routes: /login, /signup, /forgot-password, /reset-password
 * 
 * Note: Session tokens are UUIDs stored in the database, not JWTs.
 * Actual session validation happens in API routes via getSession().
 * This middleware only checks for the presence of the session cookie.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'cashshield_session';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];
const API_AUTH_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth pages
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (API_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname === '/api/auth/session'
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists — allow the request
  // Actual session validation happens in API routes via getSession()
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
