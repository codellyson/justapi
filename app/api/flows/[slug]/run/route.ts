import { NextRequest, NextResponse } from "next/server";
import { agentHub } from "@/src/server/agent-hub";

export const dynamic = "force-dynamic";

/**
 * Run a flow end-to-end in the connected canvas and return the report.
 * Long-polls until the browser posts the result (default 60s timeout,
 * override with ?timeout=ms).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!agentHub.get(slug)) {
    return NextResponse.json({ error: "flow not found" }, { status: 404 });
  }
  if (agentHub.connectedClients() === 0) {
    return NextResponse.json(
      {
        error:
          "no canvas connected — open the app in a browser (pnpm dev, then visit http://localhost:3000) so the flow can execute",
      },
      { status: 409 }
    );
  }
  const timeout = Math.min(
    Number(request.nextUrl.searchParams.get("timeout")) || 60_000,
    300_000
  );
  const report = await agentHub.requestRun(slug, timeout);
  if (!report) {
    return NextResponse.json(
      { error: `run timed out after ${timeout}ms` },
      { status: 504 }
    );
  }
  return NextResponse.json({ ...report, flow: slug });
}
