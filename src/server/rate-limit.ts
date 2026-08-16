import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

/**
 * Per-IP gate for the proxy routes. Returns a 429 to return early, or null to
 * proceed.
 *
 * The binding is absent under `next dev` without miniflare, so a missing
 * limiter fails open rather than blocking local work.
 */
export async function proxyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const { env } = await getCloudflareContext({ async: true });
  const limiter = (env as { PROXY_RATE_LIMIT?: RateLimiter }).PROXY_RATE_LIMIT;
  if (!limiter) return null;

  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await limiter.limit({ key });
  if (success) return null;

  return NextResponse.json(
    { error: "Too many requests. Slow down or sign in for a higher limit." },
    { status: 429, headers: { "retry-after": "60" } }
  );
}
