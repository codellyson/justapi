import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_PAGES = ["/login", "/signup"];

/**
 * Optimistic route protection: a cheap session-cookie presence check (no DB
 * round-trip — the API handlers do the real verification via requireAuth).
 * Unauthenticated → bounced to /login; already-authenticated → kept out of the
 * auth pages. API routes are excluded (see matcher) and gate themselves.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const onAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!hasSession && !onAuthPage) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && onAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals, and static assets. Those are
  // excluded so /api/auth stays reachable and the login page can load its icons.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
