import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/src/server/require-auth";
import { upsertEnvironment, deleteEnvironment } from "@/src/server/canvas-store";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  let body: { name?: string; variables?: string };
  try {
    body = (await request.json()) as { name?: string; variables?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.variables !== "string") {
    return NextResponse.json({ error: "variables required" }, { status: 400 });
  }

  const outcome = await upsertEnvironment(auth.userId, {
    id,
    name: body.name ?? "",
    variables: body.variables,
  });
  if (outcome === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await deleteEnvironment(auth.userId, id);
  return NextResponse.json({ ok: true });
}
