import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/src/server/require-auth";
import {
  upsertCanvas,
  upsertEnvironment,
  type CanvasInput,
  type EnvironmentInput,
} from "@/src/server/canvas-store";

export const dynamic = "force-dynamic";

/**
 * Bulk claim canvases + environments into the account. Cap is intentionally
 * bypassed — this grandfathers existing/offline work on first sync, so signing
 * in never rejects or loses local canvases. New-canvas creation is gated by the
 * per-canvas PUT instead.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: { canvases?: CanvasInput[]; environments?: EnvironmentInput[] };
  try {
    body = (await request.json()) as {
      canvases?: CanvasInput[];
      environments?: EnvironmentInput[];
    };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  for (const e of body.environments ?? []) {
    if (e && typeof e.id === "string" && typeof e.variables === "string") {
      await upsertEnvironment(auth.userId, {
        id: e.id,
        name: e.name ?? "",
        variables: e.variables,
      });
    }
  }
  for (const c of body.canvases ?? []) {
    if (c && typeof c.id === "string" && typeof c.data === "string") {
      await upsertCanvas(
        auth.userId,
        { id: c.id, name: c.name ?? "", data: c.data },
        false,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
