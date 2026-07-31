import { NextRequest, NextResponse } from "next/server";
import { agentHub } from "@/src/server/agent-hub";
import type { FlowRunReport } from "@/src/canvas/flow-spec";
import { requireAuth, isAuthError } from "@/src/server/require-auth";

export const dynamic = "force-dynamic";

/** The canvas posts flow run reports here; pending agent runs resolve. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  let body: { slug?: string; report?: FlowRunReport };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !body.report) {
    return NextResponse.json(
      { error: "slug and report are required" },
      { status: 400 }
    );
  }
  agentHub.postResult(body.slug, body.report);
  return NextResponse.json({ ok: true });
}
