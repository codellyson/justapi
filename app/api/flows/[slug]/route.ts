import { NextRequest, NextResponse } from "next/server";
import { agentHub } from "@/src/server/agent-hub";
import { parseFlowSpec } from "@/src/canvas/flow-spec";
import { requireAuth, isAuthError } from "@/src/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { slug } = await params;
  const spec = agentHub.get(slug);
  if (!spec) {
    return NextResponse.json({ error: "flow not found" }, { status: 404 });
  }
  return NextResponse.json({
    spec,
    lastResult: agentHub.lastResult(slug),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  await params; // slug is derived from spec.name — URL slug is advisory
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { spec, errors } = parseFlowSpec(body);
  if (!spec) {
    return NextResponse.json({ errors }, { status: 400 });
  }
  const slug = agentHub.upsert(spec);
  return NextResponse.json({
    slug,
    canvasConnected: agentHub.connectedClients() > 0,
    run: `/api/flows/${slug}/run`,
  });
}
