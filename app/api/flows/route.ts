import { NextRequest, NextResponse } from "next/server";
import { agentHub } from "@/src/server/agent-hub";
import { parseFlowSpec } from "@/src/canvas/flow-spec";

export const dynamic = "force-dynamic";

/** List known flows. */
export async function GET() {
  return NextResponse.json({ flows: agentHub.list() });
}

/** Create/update a flow from its spec (slug derives from spec.name). */
export async function POST(request: NextRequest) {
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
