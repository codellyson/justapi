import { NextRequest, NextResponse } from "next/server";
import { agentHub } from "@/src/server/agent-hub";
import { runFlowSpecHeadless } from "@/src/server/run-flow-spec";

export const dynamic = "force-dynamic";

/**
 * Run a flow end-to-end and return the report.
 *
 * With a canvas connected the run executes live in the browser (the
 * human watches the tree light up; long-polls until the browser posts
 * the result — default 60s, override with ?timeout=ms). With no canvas
 * — CI, background agents — the flow runs headless server-side from
 * its spec, same semantics, same report shape. Force server-side with
 * ?mode=headless.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const spec = agentHub.get(slug);
  if (!spec) {
    return NextResponse.json({ error: "flow not found" }, { status: 404 });
  }

  const forceHeadless =
    request.nextUrl.searchParams.get("mode") === "headless";
  if (forceHeadless || agentHub.connectedClients() === 0) {
    const report = await runFlowSpecHeadless(spec);
    agentHub.postResult(slug, report);
    return NextResponse.json({ ...report, flow: slug, mode: "headless" });
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
  return NextResponse.json({ ...report, flow: slug, mode: "canvas" });
}
