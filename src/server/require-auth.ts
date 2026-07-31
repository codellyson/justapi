import { NextResponse } from "next/server";
import { getAuth } from "./auth";

export type AuthResult = { userId: string } | NextResponse;

/**
 * Gate for the bridge routes. Accepts EITHER a browser session cookie (the
 * canvas) OR an `Authorization: Bearer <PAT>` (the MCP/agent bridge). Returns
 * the resolved userId, or a 401 NextResponse the caller returns as-is.
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const auth = await getAuth();

  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user?.id) return { userId: session.user.id };

  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const key = header.slice(7).trim();
    if (key) {
      try {
        const res = await auth.api.verifyApiKey({ body: { key } });
        if (res?.valid && res.key?.referenceId) {
          return { userId: res.key.referenceId };
        }
      } catch {
        /* invalid key — fall through to 401 */
      }
    }
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function isAuthError(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}
