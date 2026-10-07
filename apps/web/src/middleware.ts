import { NextRequest, NextResponse } from 'next/server';

/**
 * UX gate for /admin and /account: keep unauthenticated visitors out of the
 * client-rendered shells before hydration (no login-flash, no shell render).
 *
 * This is NOT a security boundary — `hm_auth` is a non-sensitive hint cookie
 * set from JS (the session cookie itself is path-scoped to /api/v1/auth and
 * invisible here), so tampering with it only reveals an empty shell. Every
 * admin/account API is protected server-side by JwtAuthGuard + RolesGuard.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const gated =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/account' || pathname.startsWith('/account/');
  if (!gated) return NextResponse.next();
  if (req.cookies.get('hm_auth')?.value) return NextResponse.next();

  const login = new URL('/auth/login', req.url);
  login.searchParams.set('redirect', pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/account', '/account/:path*'],
};
