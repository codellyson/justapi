import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/src/server/require-auth";
import { listForUser, usageFrom } from "@/src/server/canvas-store";
import { getUserPlan, limitsFor } from "@/src/server/plan";

export const dynamic = "force-dynamic";

/** Pull the signed-in user's whole workspace: canvases + environments, plus
 *  usage/limits/plan for the account page and the client-side create gate. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { canvases, environments } = await listForUser(auth.userId);
  const plan = getUserPlan(auth.userId);

  return NextResponse.json({
    canvases: canvases.map((c) => ({
      id: c.id,
      name: c.name,
      data: c.data,
      updatedAt: c.updatedAt.getTime(),
    })),
    environments: environments.map((e) => ({
      id: e.id,
      name: e.name,
      variables: e.variables,
      updatedAt: e.updatedAt.getTime(),
    })),
    usage: usageFrom(canvases, environments.length),
    limits: limitsFor(plan),
    plan,
  });
}
