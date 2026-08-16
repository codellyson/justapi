import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * The canvas is open to everyone — anonymous users work locally (localStorage).
 * Only account-scoped pages require a session; signing in unlocks the remote
 * features (agent bridge, sharing, token minting). This is an optimistic
 * cookie-presence check (no DB round-trip — the API handlers do the real
 * verification via requireAuth).
 *
 * /login and /signup are deliberately excluded: bouncing cookie-bearing visitors
 * off them locks out anyone whose cookie outlived its session. Those pages verify
 * against D1 themselves and redirect only on a confirmed session.
 */
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account", "/account/:path*"],
};
