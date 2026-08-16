import { headers } from "next/headers";
import { getAuth } from "./auth";

/**
 * Session lookup for server components. Unlike the cookie-presence check in
 * middleware, this verifies the session against D1, so an expired or
 * server-deleted session reads as signed-out even while its cookie lingers.
 */
export async function getPageSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/** Keeps a caller-supplied `?next=` from redirecting off-site. */
export function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/app";
}
