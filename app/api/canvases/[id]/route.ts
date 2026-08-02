import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/src/server/require-auth";
import { upsertCanvas, deleteCanvas } from "@/src/server/canvas-store";
import { getUserPlan, limitsFor } from "@/src/server/plan";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  let body: { name?: string; data?: string };
  try {
    body = (await request.json()) as { name?: string; data?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.data !== "string") {
    return NextResponse.json({ error: "data required" }, { status: 400 });
  }

  const outcome = await upsertCanvas(
    auth.userId,
    { id, name: body.name ?? "", data: body.data },
    true,
  );
  if (outcome === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (outcome === "limit") {
    const limit = limitsFor(getUserPlan(auth.userId)).canvases;
    return NextResponse.json(
      { error: "canvas limit reached", limit },
      { status: 402 },
    );
  }
  return NextResponse.json({ ok: true, outcome });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await deleteCanvas(auth.userId, id);
  return NextResponse.json({ ok: true });
}
