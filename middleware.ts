import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_PAGES = ["/login", "/signup"];

/**
 * The canvas is open to everyone — anonymous users work locally (localStorage).
 * Only account-scoped pages require a session; signing in unlocks the remote
 * features (agent bridge, sharing, token minting). This is an optimistic
 * cookie-presence check (no DB round-trip — the API handlers do the real
 * verification via requireAuth).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  // /account manages the signed-in user — bounce anonymous visitors to login.
  if (!hasSession && pathname.startsWith("/account")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  // Signed-in users have no reason to see the auth pages.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account", "/account/:path*", "/login", "/signup"],
};
